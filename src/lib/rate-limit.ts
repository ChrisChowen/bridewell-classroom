// Per-route rate limiter for LLM-spending API routes.
//
// The app is deployed at a public URL with anonymous pupil sign-in.
// Without throttling, anyone could pound /api/chat or /api/lessons/
// generate and burn the model budget. This caps requests per identifier
// (Firebase UID where available, else IP) per named bucket.
//
// Storage: durable by default. Counters live in Realtime Database under
// /rateLimits/{bucket}/{id} and are incremented inside an atomic RTDB
// transaction, so the limit holds across Cloud Function cold starts and
// across instances (the previous in-memory Map did not). If RTDB is
// unavailable, we fall back to the in-memory limiter rather than fail
// the request open or closed unpredictably — a transient datastore blip
// must not take the tutor down.

import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";

export interface Bucket {
  count: number;
  windowStartMs: number;
}

export interface RateLimitConfig {
  // Bucket name (e.g. "chat"). Buckets are independent budgets.
  bucket: string;
  // Max requests per window per identifier.
  limit: number;
  // Window length in milliseconds.
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  identifier: string;
  remaining: number;
  resetMs: number;
  retryAfterSec?: number;
}

// ── Pure decision logic (backend-agnostic, unit-tested) ───────────────

/** Given the current bucket (or null), advance it for one new hit. */
export function advanceBucket(cur: Bucket | null, now: number, cfg: RateLimitConfig): Bucket {
  if (!cur || now - cur.windowStartMs >= cfg.windowMs) {
    return { count: 1, windowStartMs: now };
  }
  return { count: cur.count + 1, windowStartMs: cur.windowStartMs };
}

/** Turn a committed bucket into the caller-facing result. */
export function bucketToResult(
  b: Bucket,
  cfg: RateLimitConfig,
  identifier: string,
  now: number
): RateLimitResult {
  const resetMs = b.windowStartMs + cfg.windowMs;
  const ok = b.count <= cfg.limit;
  return {
    ok,
    identifier,
    remaining: Math.max(0, cfg.limit - b.count),
    resetMs,
    retryAfterSec: ok ? undefined : Math.max(1, Math.ceil((resetMs - now) / 1000)),
  };
}

// ── In-memory backend (dev / test / fallback) ─────────────────────────

const buckets = new Map<string, Bucket>();
let lastSweepMs = 0;
function sweep(nowMs: number) {
  if (nowMs - lastSweepMs < 60_000) return;
  lastSweepMs = nowMs;
  for (const [key, b] of buckets) {
    if (nowMs - b.windowStartMs > 2 * 60 * 60 * 1000) buckets.delete(key);
  }
}

export function checkRateLimit(identifier: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${cfg.bucket}:${identifier}`;
  const next = advanceBucket(buckets.get(key) ?? null, now, cfg);
  buckets.set(key, next);
  return bucketToResult(next, cfg, identifier, now);
}

// ── Durable backend (RTDB transaction) ────────────────────────────────

// RTDB keys may not contain . # $ [ ] / — sanitise the identifier.
function rtdbKey(identifier: string): string {
  return identifier.replace(/[.#$/[\]]/g, "_");
}

export async function checkRateLimitDurable(
  identifier: string,
  cfg: RateLimitConfig
): Promise<RateLimitResult> {
  const admin = getAdmin();
  if (!admin.ready) throw new Error("admin not ready");
  const now = Date.now();
  const ref = admin.rtdb.ref(`rateLimits/${cfg.bucket}/${rtdbKey(identifier)}`);
  const tx = await ref.transaction((cur: Bucket | null) => advanceBucket(cur, Date.now(), cfg));
  const committed = (tx.snapshot.val() as Bucket | null) ?? advanceBucket(null, now, cfg);
  return bucketToResult(committed, cfg, identifier, now);
}

// ── Identity + enforcement ────────────────────────────────────────────

/**
 * IP-only identifier (x-forwarded-for first hop / x-real-ip / "anon").
 * Used where UID-based limiting is defeatable — e.g. join-code
 * enumeration, where an attacker can mint unlimited anonymous UIDs but
 * is anchored to a source IP. Pure header parsing — unit-testable.
 */
export function identifyByIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return `ip:${fwd}`;
  const real = req.headers.get("x-real-ip");
  if (real) return `ip:${real}`;
  return "anon";
}

/**
 * Best-effort identifier: Firebase UID (hard to spoof) when a valid
 * bearer token is present, else x-forwarded-for / x-real-ip, else "anon".
 */
export async function identifyRequester(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = getAdmin();
    if (admin.ready) {
      try {
        const decoded = await admin.auth.verifyIdToken(token);
        return `uid:${decoded.uid}`;
      } catch {
        // Fall through to IP.
      }
    }
  }
  return identifyByIp(req);
}

/**
 * One-shot helper for API routes. Returns a 429 NextResponse if over
 * limit, or null if allowed. Uses the durable backend; on any RTDB
 * error, degrades to the in-memory limiter so a datastore blip never
 * takes a route down.
 */
export async function enforceRateLimit(
  req: Request,
  cfg: RateLimitConfig,
  opts?: { byIp?: boolean }
): Promise<NextResponse | null> {
  // `byIp` anchors the limit to the source IP rather than the UID — the
  // right choice for endpoints where an attacker can cheaply rotate
  // identities (anonymous sign-in) but not their network origin.
  const id = opts?.byIp ? identifyByIp(req) : await identifyRequester(req);
  let r: RateLimitResult;
  try {
    r = await checkRateLimitDurable(id, cfg);
  } catch {
    r = checkRateLimit(id, cfg);
  }
  if (!r.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Too many requests. Try again in ${r.retryAfterSec}s.`,
        bucket: cfg.bucket,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(r.retryAfterSec ?? 1),
          "X-RateLimit-Limit": String(cfg.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(r.resetMs / 1000)),
        },
      }
    );
  }
  return null;
}

// Pre-tuned presets. Generous enough that a teacher running a real
// class won't be throttled, tight enough that a single open tab can't
// burn the budget overnight.
export const RATE_LIMITS = {
  chat: { bucket: "chat", limit: 40, windowMs: 60_000 } satisfies RateLimitConfig,
  lessonsGenerate: { bucket: "lessons-generate", limit: 12, windowMs: 60 * 60_000 } satisfies RateLimitConfig,
  reasonEvaluate: { bucket: "reason-evaluate", limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  engagementClassify: { bucket: "engagement-classify", limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  lessonsAppraise: { bucket: "lessons-appraise", limit: 20, windowMs: 60_000 } satisfies RateLimitConfig,
  // Join-code lookups, limited by IP to blunt enumeration. Generous for a
  // real classroom (a pupil retries a few times, may switch class) but
  // far below what a scripted code-guessing sweep needs.
  join: { bucket: "join", limit: 12, windowMs: 60_000 } satisfies RateLimitConfig,
};
