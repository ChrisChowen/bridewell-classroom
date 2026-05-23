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

// ── Inter-rater agreement ────────────────────────────────────────────────
// For the Reason multi-rater bootstrap: quantify how much independent raters
// agree, beyond chance. Pure math, unit-tested, so the κ/α numbers in
// docs/reason-evidence.md are reproducible. (Raters here are LLMs of a
// different family from the system-under-test — see the evidence note;
// LLM raters are NOT a substitute for the human-labelled pass, which is 🔒.)

// Cohen's κ — two raters, nominal categories.
// pairs: Array<{ a: string, b: string }>. weights: "none" (default),
// "linear", or "quadratic" — weighted κ treats the STATES list as ordinal
// (flowing→off_task is roughly the engagement gradient) and partially credits
// near-misses. Returns null for an empty set.
export function cohenKappa(pairs, labels = STATES, weights = "none") {
  const n = pairs.length;
  if (!n) return null;
  const idx = Object.fromEntries(labels.map((l, i) => [l, i]));
  const k = labels.length;
  const w = (i, j) => {
    if (weights === "none") return i === j ? 1 : 0;
    const d = Math.abs(i - j) / (k - 1);
    return weights === "quadratic" ? 1 - d * d : 1 - d;
  };
  // Observed + expected agreement over the weight matrix.
  const rowMarg = new Array(k).fill(0);
  const colMarg = new Array(k).fill(0);
  let po = 0;
  for (const { a, b } of pairs) {
    const ia = idx[a];
    const ib = idx[b];
    if (ia == null || ib == null) continue;
    rowMarg[ia] += 1;
    colMarg[ib] += 1;
    po += w(ia, ib);
  }
  po /= n;
  let pe = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      pe += (rowMarg[i] / n) * (colMarg[j] / n) * w(i, j);
    }
  }
  if (pe === 1) return 1; // perfect expected agreement → κ undefined; treat as 1
  return (po - pe) / (1 - pe);
}

// Fleiss' κ — ≥3 raters, fixed number of raters per item, nominal.
// items: Array<{ [category]: count }>, counts summing to the rater count.
export function fleissKappa(items, labels = STATES) {
  const N = items.length;
  if (!N) return null;
  const counts = items.map((it) => labels.map((l) => it[l] ?? 0));
  const nRaters = counts[0].reduce((a, b) => a + b, 0);
  if (!nRaters || nRaters < 2) return null;
  // P_i: agreement for item i.
  const Pi = counts.map(
    (row) => (row.reduce((a, c) => a + c * c, 0) - nRaters) / (nRaters * (nRaters - 1)),
  );
  const Pbar = Pi.reduce((a, b) => a + b, 0) / N;
  // p_j: proportion of all assignments to category j.
  const totalAssign = N * nRaters;
  const pj = labels.map((_, j) => counts.reduce((a, row) => a + row[j], 0) / totalAssign);
  const Pe = pj.reduce((a, p) => a + p * p, 0);
  if (Pe === 1) return 1;
  return (Pbar - Pe) / (1 - Pe);
}

// Krippendorff's α (nominal) — any number of raters, tolerates missing data.
// data: Array<Array<string|null>> indexed [rater][item]; null = no rating.
export function krippendorffAlpha(data, labels = STATES) {
  const nRaters = data.length;
  if (!nRaters) return null;
  const nItems = data[0].length;
  // Build per-item value lists (units with ≥2 ratings contribute).
  const units = [];
  for (let u = 0; u < nItems; u++) {
    const vals = [];
    for (let r = 0; r < nRaters; r++) {
      const v = data[r][u];
      if (v != null) vals.push(v);
    }
    if (vals.length >= 2) units.push(vals);
  }
  if (!units.length) return null;
  // Observed disagreement Do (nominal metric: 0 if equal, 1 if different).
  let Do = 0;
  let totalPairsWeight = 0;
  for (const vals of units) {
    const m = vals.length;
    const pairW = 1 / (m - 1);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        Do += pairW * (vals[i] === vals[j] ? 0 : 1);
      }
    }
    totalPairsWeight += m; // total number of ratings across coincidence units
  }
  // Expected disagreement De from the overall value distribution.
  const valueCounts = {};
  let nTotal = 0;
  for (const vals of units) {
    for (const v of vals) {
      valueCounts[v] = (valueCounts[v] ?? 0) + 1;
      nTotal += 1;
    }
  }
  let sameValuePairs = 0;
  for (const c of Object.values(valueCounts)) sameValuePairs += c * (c - 1);
  const totalPairs = nTotal * (nTotal - 1);
  const De = totalPairs ? 1 - sameValuePairs / totalPairs : 0;
  // α = 1 − Do/De, with Do and De normalised by the same totals.
  const DoNorm = Do / totalPairsWeight;
  if (De === 0) return DoNorm === 0 ? 1 : null;
  return 1 - DoNorm / De;
}
