import { describe, it, expect } from "vitest";
import { checkRateLimit, type RateLimitConfig } from "./rate-limit";

// NB: this is the current in-memory limiter. The north-star goal calls
// for a durable (Firestore/RTDB-backed) replacement; these tests pin the
// observable contract so that swap can be made safely later.

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
