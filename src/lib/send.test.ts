import { describe, it, expect } from "vitest";
import { buildSendAdaptationBlock, hasSendAdaptation } from "./send";

describe("buildSendAdaptationBlock", () => {
  it("returns undefined for an absent or empty profile", () => {
    expect(buildSendAdaptationBlock(undefined)).toBeUndefined();
    expect(buildSendAdaptationBlock(null)).toBeUndefined();
    expect(buildSendAdaptationBlock({})).toBeUndefined();
    expect(buildSendAdaptationBlock({ notes: "   " })).toBeUndefined();
  });

  it("maps output format to guidance", () => {
    expect(buildSendAdaptationBlock({ outputFormat: "bullets" })).toMatch(/bulleted list/i);
    expect(buildSendAdaptationBlock({ outputFormat: "visual" })).toMatch(/visualise|picturable/i);
  });

  it("maps scaffolding level to graded support", () => {
    expect(buildSendAdaptationBlock({ scaffoldingLevel: 1 })).toMatch(/light/i);
    expect(buildSendAdaptationBlock({ scaffoldingLevel: 5 })).toMatch(/maximum/i);
  });

  it("includes the teacher's note and caps its length", () => {
    const long = "x".repeat(1000);
    const block = buildSendAdaptationBlock({ notes: long })!;
    expect(block).toMatch(/Teacher's note/);
    // 400-char cap + the label prefix; well under the raw 1000.
    expect(block.length).toBeLessThan(500);
  });

  it("combines all three fields, one per line", () => {
    const block = buildSendAdaptationBlock({
      outputFormat: "short",
      scaffoldingLevel: 4,
      notes: "Processes language slowly; give thinking time.",
    })!;
    expect(block.split("\n")).toHaveLength(3);
    expect(block).toMatch(/one clear sentence/i);
    expect(block).toMatch(/high/i);
    expect(block).toMatch(/thinking time/i);
  });

  it("hasSendAdaptation mirrors the builder", () => {
    expect(hasSendAdaptation({ outputFormat: "short" })).toBe(true);
    expect(hasSendAdaptation({})).toBe(false);
    expect(hasSendAdaptation(undefined)).toBe(false);
  });
});
