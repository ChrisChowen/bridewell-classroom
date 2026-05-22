import { describe, it, expect } from "vitest";
import {
  checkRateLimit,
  advanceBucket,
  bucketToResult,
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
