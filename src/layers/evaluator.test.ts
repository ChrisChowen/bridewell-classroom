import { describe, it, expect } from "vitest";
import { branchForConfidence } from "./evaluator";

// The Reason branch is DERIVED from the (clamped) confidence so the model
// can't emit a high-confidence pattern_flag or a low-confidence accept —
// which would make the tutor praise a failing pupil or flag a succeeding one.
describe("branchForConfidence (confidence is authoritative)", () => {
  it("accepts above 0.65", () => {
    expect(branchForConfidence(0.66)).toBe("accept");
    expect(branchForConfidence(0.9)).toBe("accept");
    expect(branchForConfidence(1)).toBe("accept");
  });
  it("soft-challenges in the 0.40–0.65 band (inclusive of 0.40)", () => {
    expect(branchForConfidence(0.4)).toBe("soft_challenge");
    expect(branchForConfidence(0.5)).toBe("soft_challenge");
    expect(branchForConfidence(0.65)).toBe("soft_challenge");
  });
  it("pattern-flags below 0.40", () => {
    expect(branchForConfidence(0.39)).toBe("pattern_flag");
    expect(branchForConfidence(0)).toBe("pattern_flag");
  });
});
