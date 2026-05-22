import { describe, it, expect } from "vitest";
import { estimateCostUSD, rateForModel } from "./estimate";

describe("rateForModel", () => {
  it("matches flash and pro tiers (case-insensitive)", () => {
    expect(rateForModel("gemini-2.5-flash").outputPerM).toBe(2.5);
    expect(rateForModel("GEMINI-2.5-PRO").outputPerM).toBe(10);
  });
  it("falls back to a non-zero default for an unknown model", () => {
    const r = rateForModel("some-future-model");
    expect(r.inputPerM).toBeGreaterThan(0);
    expect(r.outputPerM).toBeGreaterThan(0);
  });
});

describe("estimateCostUSD", () => {
  it("computes input+output cost per the rate table", () => {
    expect(estimateCostUSD("gemini-2.5-flash", 1_000_000, 1_000_000)).toBeCloseTo(2.8, 6);
    expect(estimateCostUSD("gemini-2.5-pro", 100_000, 50_000)).toBeCloseTo(0.625, 6);
  });
  it("treats missing/negative tokens as zero", () => {
    expect(estimateCostUSD("gemini-2.5-flash")).toBe(0);
    expect(estimateCostUSD("gemini-2.5-flash", -5, -5)).toBe(0);
  });
});
