import { describe, it, expect } from "vitest";
import { anonKey } from "./live-keys";

describe("anonKey", () => {
  it("is deterministic for the same uid", () => {
    expect(anonKey("abc123")).toBe(anonKey("abc123"));
  });

  it("returns 8 lowercase hex chars", () => {
    expect(anonKey("some-firebase-uid")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("differs for different uids", () => {
    expect(anonKey("pupil-one")).not.toBe(anonKey("pupil-two"));
  });

  it("does not contain the raw uid (non-reversible by inspection)", () => {
    const uid = "VERY_RECOGNISABLE_UID";
    expect(anonKey(uid)).not.toContain(uid);
    expect(anonKey(uid).length).toBe(8);
  });

  it("handles empty string without throwing", () => {
    expect(anonKey("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
