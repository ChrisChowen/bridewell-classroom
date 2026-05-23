import { describe, it, expect } from "vitest";
// Import the runner's own metric module so the documented numbers are
// produced by the exact code under test.
import {
  confusionMatrix,
  prf,
  pairwise,
  calibration,
  cohenKappa,
  fleissKappa,
  krippendorffAlpha,
} from "./reason-eval-metrics.mjs";

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

describe("cohenKappa (2 raters)", () => {
  it("returns 1 for perfect agreement", () => {
    const pairs = [
      { a: "flowing", b: "flowing" },
      { a: "off_task", b: "off_task" },
    ];
    expect(cohenKappa(pairs)).toBeCloseTo(1, 5);
  });

  it("matches the textbook 2x2 case (κ=0.4)", () => {
    // 50 items: 20 yes/yes, 5 yes/no, 10 no/yes, 15 no/no.
    // po=0.7, pe=0.5 → κ=0.4. Use two of our labels as the binary.
    const pairs: Array<{ a: string; b: string }> = [];
    const push = (a: string, b: string, n: number) => { for (let i = 0; i < n; i++) pairs.push({ a, b }); };
    push("flowing", "flowing", 20);
    push("flowing", "off_task", 5);
    push("off_task", "flowing", 10);
    push("off_task", "off_task", 15);
    expect(cohenKappa(pairs, ["flowing", "off_task"])).toBeCloseTo(0.4, 5);
  });

  it("linear-weighted κ exceeds unweighted when disagreements are near-misses", () => {
    // Raters never agree exactly but are always one step apart on the
    // STATES gradient — weighting should credit the near-misses.
    const pairs = [
      { a: "flowing", b: "productive_struggle" },
      { a: "productive_struggle", b: "wheel_spinning" },
      { a: "wheel_spinning", b: "disengaged" },
    ];
    const none = cohenKappa(pairs, undefined, "none");
    const lin = cohenKappa(pairs, undefined, "linear");
    expect(none).not.toBeNull();
    expect(lin).not.toBeNull();
    expect(lin as number).toBeGreaterThan(none as number);
  });

  it("returns null for an empty set", () => {
    expect(cohenKappa([])).toBeNull();
  });
});

describe("fleissKappa (≥3 raters)", () => {
  it("returns 1 for unanimous agreement", () => {
    const items: Record<string, number>[] = [
      { flowing: 3 },
      { off_task: 3 },
    ];
    expect(fleissKappa(items)).toBeCloseTo(1, 5);
  });

  it("is near 0 (or negative) for maximally split ratings", () => {
    // Each item split evenly across categories → no agreement beyond chance.
    const items: Record<string, number>[] = [
      { flowing: 1, productive_struggle: 1, wheel_spinning: 1 },
      { disengaged: 1, off_task: 1, flowing: 1 },
    ];
    const k = fleissKappa(items);
    expect(k).toBeLessThanOrEqual(0.1);
  });
});

describe("krippendorffAlpha (nominal)", () => {
  it("returns 1 for perfect agreement", () => {
    const data = [
      ["flowing", "off_task", "wheel_spinning"],
      ["flowing", "off_task", "wheel_spinning"],
    ];
    expect(krippendorffAlpha(data)).toBeCloseTo(1, 5);
  });

  it("tolerates missing ratings (null) and still scores agreement", () => {
    const data = [
      ["flowing", "off_task", null],
      ["flowing", null, "wheel_spinning"],
      [null, "off_task", "wheel_spinning"],
    ];
    // Every co-rated unit agrees → α = 1.
    expect(krippendorffAlpha(data)).toBeCloseTo(1, 5);
  });

  it("drops below 1 when raters disagree", () => {
    const data = [
      ["flowing", "off_task"],
      ["off_task", "off_task"],
    ];
    const a = krippendorffAlpha(data);
    expect(a).toBeLessThan(1);
  });
});
