import { describe, it, expect } from "vitest";
// Import the runner's own metric module so the documented numbers are
// produced by the exact code under test.
import { confusionMatrix, prf, pairwise, calibration } from "./reason-eval-metrics.mjs";

describe("confusionMatrix", () => {
  it("counts correct vs incorrect and computes accuracy", () => {
    const pairs = [
      { gold: "flowing", predicted: "flowing" },
      { gold: "flowing", predicted: "productive_struggle" },
      { gold: "wheel_spinning", predicted: "wheel_spinning" },
    ];
    const cm = confusionMatrix(pairs);
    expect(cm.total).toBe(3);
    expect(cm.correct).toBe(2);
    expect(cm.accuracy).toBeCloseTo(2 / 3, 5);
    expect(cm.matrix.flowing.flowing).toBe(1);
    expect(cm.matrix.flowing.productive_struggle).toBe(1);
  });
});

describe("prf — precision/recall/F1", () => {
  it("computes per-class P/R/F1 correctly", () => {
    // productive_struggle: 2 gold; predicted ps twice (one right, one wrong gold)
    const pairs = [
      { gold: "productive_struggle", predicted: "productive_struggle" }, // tp
      { gold: "productive_struggle", predicted: "wheel_spinning" }, // fn for ps
      { gold: "flowing", predicted: "productive_struggle" }, // fp for ps
      { gold: "wheel_spinning", predicted: "wheel_spinning" }, // tp ws
    ];
    const { perClass } = prf(pairs);
    expect(perClass.productive_struggle.tp).toBe(1);
    expect(perClass.productive_struggle.fp).toBe(1);
    expect(perClass.productive_struggle.fn).toBe(1);
    expect(perClass.productive_struggle.precision).toBeCloseTo(0.5, 5);
    expect(perClass.productive_struggle.recall).toBeCloseTo(0.5, 5);
    expect(perClass.productive_struggle.f1).toBeCloseTo(0.5, 5);
  });

  it("returns null (not 0) precision when a class is never predicted", () => {
    const pairs = [{ gold: "off_task", predicted: "disengaged" }];
    const { perClass } = prf(pairs);
    expect(perClass.off_task.precision).toBeNull(); // never predicted
    expect(perClass.off_task.recall).toBe(0); // had support, got none right
  });
});

describe("pairwise — the named productive_struggle vs wheel_spinning claim", () => {
  it("restricts to the two classes and scores them", () => {
    const pairs = [
      { gold: "productive_struggle", predicted: "productive_struggle" },
      { gold: "wheel_spinning", predicted: "wheel_spinning" },
      { gold: "wheel_spinning", predicted: "productive_struggle" },
      { gold: "flowing", predicted: "flowing" }, // excluded
    ];
    const r = pairwise(pairs);
    expect(r.confusion.total).toBe(3); // flowing excluded
    expect(r.perClass.productive_struggle.recall).toBeCloseTo(1, 5); // 1/1
    expect(r.perClass.wheel_spinning.recall).toBeCloseTo(0.5, 5); // 1/2
  });
});

describe("calibration", () => {
  it("buckets by confidence and computes ECE", () => {
    const preds = [
      { gold: "flowing", predicted: "flowing", confidence: 0.9 }, // correct, high
      { gold: "flowing", predicted: "wheel_spinning", confidence: 0.9 }, // wrong, high
      { gold: "flowing", predicted: "flowing", confidence: 0.3 }, // correct, low
    ];
    const { buckets, ece } = calibration(preds);
    const high = buckets.find((b) => b.range[0] === 0.8)!;
    expect(high.n).toBe(2);
    expect(high.accuracy).toBeCloseTo(0.5, 5);
    expect(ece).toBeGreaterThan(0);
    expect(ece).toBeLessThanOrEqual(1);
  });
});
