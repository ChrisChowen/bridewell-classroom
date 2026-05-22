import { describe, it, expect } from "vitest";
import {
  checkRateLimit,
  advanceBucket,
  bucketToResult,
  identifyByIp,
  RATE_LIMITS,
  type RateLimitConfig,
  type Bucket,
} from "./rate-limit";

// The window/increment decision is a pure function (advanceBucket +
// bucketToResult) shared by BOTH the in-memory and the durable
// RTDB-transaction backends — so testing it here covers the durable
// path's correctness without needing the emulator. checkRateLimit
// (in-memory) is exercised end-to-end for the observable contract.

const cfg = (over: Partial<RateLimitConfig> = {}): RateLimitConfig => ({
  bucket: "u",
  limit: 3,
  windowMs: 60_000,
  ...over,
});

describe("advanceBucket (pure, shared by both backends)", () => {
  it("starts a fresh bucket at count 1", () => {
    expect(advanceBucket(null, 1000, cfg())).toEqual({ count: 1, windowStartMs: 1000 });
  });

  it("increments within the window, preserving windowStart", () => {
    const cur: Bucket = { count: 1, windowStartMs: 1000 };
    expect(advanceBucket(cur, 1500, cfg())).toEqual({ count: 2, windowStartMs: 1000 });
  });

  it("resets when the window has elapsed", () => {
    const cur: Bucket = { count: 9, windowStartMs: 1000 };
    expect(advanceBucket(cur, 1000 + 60_000, cfg())).toEqual({ count: 1, windowStartMs: 61_000 });
  });
});

describe("bucketToResult", () => {
  it("ok while at/under the limit, no retryAfter", () => {
    const r = bucketToResult({ count: 3, windowStartMs: 0 }, cfg(), "id", 100);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterSec).toBeUndefined();
  });

  it("blocks over the limit with a positive retryAfter", () => {
    const r = bucketToResult({ count: 4, windowStartMs: 0 }, cfg(), "id", 100);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const id = `test-${Math.random()}`;
    const cfg: RateLimitConfig = { bucket: "unit-allow", limit: 3, windowMs: 60_000 };
    expect(checkRateLimit(id, cfg).ok).toBe(true); // 1
    expect(checkRateLimit(id, cfg).ok).toBe(true); // 2
    expect(checkRateLimit(id, cfg).ok).toBe(true); // 3
    const blocked = checkRateLimit(id, cfg); // 4
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("reports a decreasing remaining count", () => {
    const id = `test-${Math.random()}`;
    const cfg: RateLimitConfig = { bucket: "unit-remaining", limit: 5, windowMs: 60_000 };
    expect(checkRateLimit(id, cfg).remaining).toBe(4);
    expect(checkRateLimit(id, cfg).remaining).toBe(3);
  });

  it("isolates buckets from each other", () => {
    const id = `test-${Math.random()}`;
    const a: RateLimitConfig = { bucket: "unit-a", limit: 1, windowMs: 60_000 };
    const b: RateLimitConfig = { bucket: "unit-b", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(id, a).ok).toBe(true);
    expect(checkRateLimit(id, a).ok).toBe(false); // a exhausted
    expect(checkRateLimit(id, b).ok).toBe(true); // b independent
  });

  it("isolates identifiers within a bucket", () => {
    const cfg: RateLimitConfig = { bucket: "unit-ids", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("alice", cfg).ok).toBe(true);
    expect(checkRateLimit("bob", cfg).ok).toBe(true); // different id, fresh budget
    expect(checkRateLimit("alice", cfg).ok).toBe(false);
  });

  it("resets after the window elapses", () => {
    const id = `test-${Math.random()}`;
    const cfg: RateLimitConfig = { bucket: "unit-window", limit: 1, windowMs: 1 };
    expect(checkRateLimit(id, cfg).ok).toBe(true);
    // window of 1ms — wait a tick then it should reset.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(id, cfg).ok).toBe(true);
        resolve();
      }, 5);
    });
  });
});

describe("identifyByIp (enumeration-guard identity)", () => {
  const reqWith = (headers: Record<string, string>) =>
    new Request("https://x.test/api/classes/join", { method: "POST", headers });

  it("uses the first x-forwarded-for hop", () => {
    expect(identifyByIp(reqWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("ip:203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(identifyByIp(reqWith({ "x-real-ip": "198.51.100.4" }))).toBe("ip:198.51.100.4");
  });

  it("returns 'anon' when no source IP header is present", () => {
    expect(identifyByIp(reqWith({}))).toBe("anon");
  });

  it("ignores a bearer token (IP-anchored, not UID)", () => {
    // Even with a token present, identifyByIp must NOT key on the UID —
    // that's the whole point for join-code enumeration defence.
    expect(
      identifyByIp(reqWith({ authorization: "Bearer xyz", "x-forwarded-for": "192.0.2.9" })),
    ).toBe("ip:192.0.2.9");
  });
});

describe("RATE_LIMITS.join preset", () => {
  it("is a tight per-minute IP budget for join-code lookups", () => {
    expect(RATE_LIMITS.join.bucket).toBe("join");
    expect(RATE_LIMITS.join.windowMs).toBe(60_000);
    expect(RATE_LIMITS.join.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.join.limit).toBeLessThanOrEqual(20); // far below a scripted sweep
  });
});
