// Reason / classifier evaluation metrics — PURE, no IO. Imported by the
// runner (scripts/reason-eval.mjs) and unit-tested
// (scripts/reason-eval-metrics.test.ts) so the numbers in
// docs/reason-evidence.md are reproducible and trustworthy.
//
// Plain ESM (no TS) so the node runner imports it directly; vitest also
// imports it for the test, keeping a single source of truth for the math.

export const STATES = [
  "flowing",
  "productive_struggle",
  "wheel_spinning",
  "disengaged",
  "off_task",
];

// pairs: Array<{ gold: string, predicted: string }>
// Returns { matrix: { [gold]: { [pred]: n } }, total, correct, accuracy }.
export function confusionMatrix(pairs, labels = STATES) {
  const matrix = {};
  for (const g of labels) {
    matrix[g] = {};
    for (const p of labels) matrix[g][p] = 0;
  }
  let correct = 0;
  for (const { gold, predicted } of pairs) {
    if (!(gold in matrix)) matrix[gold] = Object.fromEntries(labels.map((l) => [l, 0]));
    if (!(predicted in matrix[gold])) matrix[gold][predicted] = 0;
    matrix[gold][predicted] += 1;
    if (gold === predicted) correct += 1;
  }
  const total = pairs.length;
  return { matrix, total, correct, accuracy: total ? correct / total : 0 };
}

// Per-class precision / recall / F1 (one-vs-rest), plus macro averages.
export function prf(pairs, labels = STATES) {
  const perClass = {};
  for (const label of labels) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const { gold, predicted } of pairs) {
      if (predicted === label && gold === label) tp += 1;
      else if (predicted === label && gold !== label) fp += 1;
      else if (predicted !== label && gold === label) fn += 1;
    }
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 =
      precision != null && recall != null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;
    perClass[label] = { tp, fp, fn, support: tp + fn, precision, recall, f1 };
  }
  // Macro averages over classes that have support (gold examples).
  const supported = labels.filter((l) => perClass[l].support > 0);
  const macro = (key) => {
    const vals = supported.map((l) => perClass[l][key]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    perClass,
    macro: { precision: macro("precision"), recall: macro("recall"), f1: macro("f1") },
  };
}

// The goal's named claim is specifically productive_struggle vs
// wheel_spinning. This restricts the metrics to those two classes
// (examples whose gold is one of the pair), so we can state that claim
// directly and reproducibly.
export function pairwise(pairs, a = "productive_struggle", b = "wheel_spinning") {
  const subset = pairs.filter((p) => p.gold === a || p.gold === b);
  return { ...prf(subset, [a, b]), confusion: confusionMatrix(subset, [a, b]) };
}

// Confidence calibration. Buckets predictions by confidence and reports
// accuracy per bucket — surfaces the bimodal-clustering risk flagged in
// audit (are mid-band confidences actually mid-reliability?).
export function calibration(preds, bucketEdges = [0, 0.2, 0.4, 0.6, 0.8, 1.0001]) {
  const buckets = [];
  for (let i = 0; i < bucketEdges.length - 1; i++) {
    const lo = bucketEdges[i];
    const hi = bucketEdges[i + 1];
    const inB = preds.filter((p) => p.confidence >= lo && p.confidence < hi);
    const correct = inB.filter((p) => p.gold === p.predicted).length;
    buckets.push({
      range: [lo, Math.min(hi, 1)],
      n: inB.length,
      accuracy: inB.length ? correct / inB.length : null,
      meanConfidence: inB.length ? inB.reduce((a, p) => a + p.confidence, 0) / inB.length : null,
    });
  }
  // Expected Calibration Error: |confidence − accuracy| weighted by bucket size.
  const total = preds.length;
  const ece = total
    ? buckets.reduce(
        (acc, bk) =>
          bk.n && bk.accuracy != null && bk.meanConfidence != null
            ? acc + (bk.n / total) * Math.abs(bk.meanConfidence - bk.accuracy)
            : acc,
        0,
      )
    : null;
  return { buckets, ece };
}

export function round(v, dp = 3) {
  if (v == null) return null;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
