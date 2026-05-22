import { describe, it, expect } from "vitest";
import { classify } from "./allowlist-entry";

// Validation for allowlist entries (single-add + bulk import).
describe("classify (allowlist entry validation)", () => {
  it("accepts a well-formed email", () => {
    expect(classify("jane.wells@kesw.org")).toEqual({ ok: true, kind: "email" });
    expect(classify("  Jane@KESW.org ")).toEqual({ ok: true, kind: "email" });
  });

  it("accepts a domain wildcard", () => {
    expect(classify("*@kesw.org")).toEqual({ ok: true, kind: "domain" });
    expect(classify("*@barrowhills.sch.uk")).toEqual({ ok: true, kind: "domain" });
  });

  it("rejects malformed entries", () => {
    expect(classify("not-an-email").ok).toBe(false);
    expect(classify("").ok).toBe(false);
    expect(classify("@kesw.org").ok).toBe(false);
    expect(classify("jane@").ok).toBe(false);
    expect(classify("jane@nodot").ok).toBe(false);
    expect(classify("*@").ok).toBe(false);
    expect(classify("*@nodot").ok).toBe(false);
  });
});
