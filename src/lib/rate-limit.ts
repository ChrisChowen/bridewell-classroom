// Lightweight per-route rate limiter for LLM-spending API routes.
//
// The prototype is deployed at a public URL (bridewell-classroom.web.app)
// with anonymous pupil sign-in. Without throttling, anyone with the URL
// could pound /api/chat or /api/lessons/generate and burn the Gemini key.
// This module enforces a soft cap per identifier (Firebase UID where
// available, otherwise the request IP).
//
// Storage is in-memory per Node instance. Cloud Functions instances are
// ephemeral, so a determined attacker spread across cold starts can
// exceed the cap. For the 29 May demo this is acceptable — the goal is
// to defang casual abuse, not nation-state attackers. Production
// hardening should move this to a Firestore/RTDB transaction.

import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";

interface Bucket {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so the Map doesn't grow without bound. Runs lazily on
// each check; cheap (~O(active identifiers) per minute).
let lastSweepMs = 0;
function sweep(nowMs: number) {
  if (nowMs - lastSweepMs < 60_000) return;
  lastSweepMs = nowMs;
  // Drop any bucket whose window is more than 2 hours old.
  for (const [key, b] of buckets) {
    if (nowMs - b.windowStartMs > 2 * 60 * 60 * 1000) buckets.delete(key);
  }
}

export interface RateLimitConfig {
  // Human-readable name for the bucket (e.g. "chat"). Different routes
  // use different names so /api/chat usage doesn't deplete the budget
  // for /api/lessons/generate.
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
  // 429 response shape if !ok. Caller can spread this into NextResponse.
  retryAfterSec?: number;
}

/**
 * Extract a best-effort identifier from a Request. Prefers the Firebase
 * ID token UID when present (much harder to spoof than IP); falls back
 * to the first hop in x-forwarded-for, then x-real-ip, then "anon".
 */
export async function identifyRequester(req: Request): Promise<string> {
  // Try Bearer token → Firebase UID.
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
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return `ip:${fwd}`;
  const real = req.headers.get("x-real-ip");
  if (real) return `ip:${real}`;
  return "anon";
}

export function checkRateLimit(identifier: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${cfg.bucket}:${identifier}`;
  let b = buckets.get(key);
  if (!b || now - b.windowStartMs >= cfg.windowMs) {
    b = { count: 0, windowStartMs: now };
    buckets.set(key, b);
  }
  b.count += 1;
  const remaining = Math.max(0, cfg.limit - b.count);
  const resetMs = b.windowStartMs + cfg.windowMs;
  if (b.count > cfg.limit) {
    return {
      ok: false,
      identifier,
      remaining: 0,
      resetMs,
      retryAfterSec: Math.max(1, Math.ceil((resetMs - now) / 1000)),
    };
  }
  return { ok: true, identifier, remaining, resetMs };
}

/**
 * One-shot helper for API routes. Returns a 429 NextResponse if over
 * limit, or null if allowed. Sets standard rate-limit headers either
 * way so the client can back off.
 */
export async function enforceRateLimit(
  req: Request,
  cfg: RateLimitConfig,
): Promise<NextResponse | null> {
  const id = await identifyRequester(req);
  const r = checkRateLimit(id, cfg);
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
      },
    );
  }
  return null;
}

// Pre-tuned config presets. Numbers err on the generous side for the
// demo — a teacher running simulate-class.mjs against the live deploy
// shouldn't get throttled, but a single open browser tab can't burn
// hundreds of pounds in tokens overnight either.
export const RATE_LIMITS = {
  // Tutor turns. A pupil typing fast still won't hit 40/min.
  chat: { bucket: "chat", limit: 40, windowMs: 60_000 } satisfies RateLimitConfig,
  // Lesson plan generation. Expensive (Pro model, ~5–8s per call).
  // Six per hour per teacher is plenty for prep; abuse cap.
  lessonsGenerate: { bucket: "lessons-generate", limit: 12, windowMs: 60 * 60_000 } satisfies RateLimitConfig,
  // Reason evaluator. Server-to-server in normal flow but the API is
  // reachable, so cap it.
  reasonEvaluate: { bucket: "reason-evaluate", limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  // Engagement classifier. Called every 5 messages or 60s — capacious.
  engagementClassify: { bucket: "engagement-classify", limit: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  // Lesson appraisal. Cheap-ish but worth capping.
  lessonsAppraise: { bucket: "lessons-appraise", limit: 20, windowMs: 60_000 } satisfies RateLimitConfig,
};
