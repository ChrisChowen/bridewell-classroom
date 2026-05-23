#!/usr/bin/env node
//
// Compute the Reason multi-rater bootstrap metrics from pre-computed label
// files. Backend-agnostic: the labels can come from the Anthropic API
// (scripts/bootstrap-rater-labels.mjs), from Claude AGENTS (used here — a
// non-Gemini model family, so not circular with the Gemini classifier under
// test), or eventually from human teachers. This script only does the maths,
// reusing the unit-tested metric module so the κ/α/ECE/F1 numbers are
// reproducible.
//
// Inputs:
//   docs/reason-eval/transcripts.jsonl              (gold `goldState` per window)
//   reports/bootstrap-raters/{strict,permissive,midband}.jsonl
//       (each line: {"id","state","confidence"})
//
// Output: prints a summary + writes reports/bootstrap-rater-<ts>.json with the
// header {"bootstrap":true,"researchValid":false}.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STATES,
  confusionMatrix,
  prf,
  pairwise,
  calibration,
  cohenKappa,
  fleissKappa,
  krippendorffAlpha,
  round,
} from "./reason-eval-metrics.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RATERS = ["strict", "permissive", "midband"];

function readJsonl(path) {
  return readFileSync(resolve(root, path), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .map((l) => JSON.parse(l));
}

// Gold windows (ordered).
const windows = readJsonl("docs/reason-eval/transcripts.jsonl");
const goldById = new Map(windows.map((w) => [w.id, w.goldState]));
const ids = windows.map((w) => w.id);

// Rater label maps.
const raterLabels = {};
const raterConf = {};
for (const r of RATERS) {
  const rows = readJsonl(`reports/bootstrap-raters/${r}.jsonl`);
  raterLabels[r] = new Map(rows.map((x) => [x.id, x.state]));
  raterConf[r] = new Map(rows.map((x) => [x.id, x.confidence ?? 0.5]));
}

// ── Inter-rater agreement (among the 3 raters) ───────────────────────────
const pair = (a, b) =>
  ids
    .map((id) => ({ a: raterLabels[a].get(id), b: raterLabels[b].get(id) }))
    .filter((p) => p.a && p.b);

const fleissItems = ids.map((id) => {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const r of RATERS) {
    const s = raterLabels[r].get(id);
    if (s) counts[s] += 1;
  }
  return counts;
});
const krippData = RATERS.map((r) => ids.map((id) => raterLabels[r].get(id) ?? null));

const agreement = {
  fleissKappa: round(fleissKappa(fleissItems)),
  krippendorffAlpha: round(krippendorffAlpha(krippData)),
  pairwiseCohenKappa: {
    "strict~permissive": round(cohenKappa(pair("strict", "permissive"))),
    "strict~midband": round(cohenKappa(pair("strict", "midband"))),
    "permissive~midband": round(cohenKappa(pair("permissive", "midband"))),
  },
  pairwiseWeightedKappa: {
    "strict~permissive": round(cohenKappa(pair("strict", "permissive"), undefined, "linear")),
    "strict~midband": round(cohenKappa(pair("strict", "midband"), undefined, "linear")),
    "permissive~midband": round(cohenKappa(pair("permissive", "midband"), undefined, "linear")),
  },
};

// ── Majority vote vs authored gold ───────────────────────────────────────
function majority(id) {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const r of RATERS) {
    const s = raterLabels[r].get(id);
    if (s) counts[s] += 1;
  }
  // Tie → first by STATES order (deterministic).
  return STATES.reduce((best, s) => (counts[s] > counts[best] ? s : best), STATES[0]);
}
const votePairs = ids.map((id) => ({ gold: goldById.get(id), predicted: majority(id) }));
const cm = confusionMatrix(votePairs);
const overall = prf(votePairs);
const pw = pairwise(votePairs);

// ── Per-rater accuracy vs gold + ECE (mid-band rater = the calibrated one) ─
const perRaterAccuracy = {};
for (const r of RATERS) {
  const correct = ids.filter((id) => raterLabels[r].get(id) === goldById.get(id)).length;
  perRaterAccuracy[r] = round(correct / ids.length);
}
const midPreds = ids.map((id) => ({
  gold: goldById.get(id),
  predicted: raterLabels.midband.get(id),
  confidence: raterConf.midband.get(id) ?? 0.5,
}));
const cal = calibration(midPreds);

// ── Report ───────────────────────────────────────────────────────────────
const fmt = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const k = (v) => (v == null ? "—" : v.toFixed(3));

console.log(`Multi-rater bootstrap — N=${ids.length} windows × ${RATERS.length} agent raters\n`);
console.log("══ Inter-rater agreement ══");
console.log(`  Fleiss κ           ${k(agreement.fleissKappa)}`);
console.log(`  Krippendorff α     ${k(agreement.krippendorffAlpha)}`);
for (const [p, v] of Object.entries(agreement.pairwiseCohenKappa))
  console.log(`  Cohen κ  ${p.padEnd(22)} ${k(v)}  (weighted ${k(agreement.pairwiseWeightedKappa[p])})`);

console.log("\n══ Rater majority-vote vs authored gold ══");
console.log(`  n=${cm.total}  accuracy=${fmt(cm.accuracy)}  macro-F1=${fmt(overall.macro.f1)}`);
console.log("  Per state (P / R / F1 / support):");
for (const s of STATES) {
  const c = overall.perClass[s];
  if (!c || c.support === 0) continue;
  const flag = (c.f1 ?? 0) >= 0.75 ? "✓" : "·";
  console.log(`    ${flag} ${s.padEnd(20)} ${fmt(c.precision)} / ${fmt(c.recall)} / ${fmt(c.f1)}  (n=${c.support})`);
}
console.log("  productive_struggle vs wheel_spinning:");
for (const s of ["productive_struggle", "wheel_spinning"]) {
  const c = pw.perClass[s];
  if (c) console.log(`    ${s.padEnd(20)} P=${fmt(c.precision)} R=${fmt(c.recall)} F1=${fmt(c.f1)} (n=${c.support})`);
}

console.log("\n══ Per-rater accuracy vs gold ══");
for (const r of RATERS) console.log(`  ${r.padEnd(12)} ${fmt(perRaterAccuracy[r])}`);

console.log(`\n══ Calibration — mid-band rater (ECE ${fmt(cal.ece)}) ══`);
for (const b of cal.buckets) {
  if (!b.n) continue;
  console.log(`  [${b.range[0].toFixed(1)}–${b.range[1].toFixed(1)})  n=${b.n}  acc=${fmt(b.accuracy)}  meanConf=${fmt(b.meanConfidence)}`);
}

const out = {
  bootstrap: true,
  researchValid: false,
  note: "Raters are Claude AGENTS (a non-Gemini family) — NOT human teachers. Bootstrap signal only; the human-labelled multi-rater pass remains required (🔒).",
  generatedAt: new Date().toISOString(),
  n: ids.length,
  raters: RATERS,
  agreement,
  majorityVsGold: {
    accuracy: round(cm.accuracy),
    macro: { precision: round(overall.macro.precision), recall: round(overall.macro.recall), f1: round(overall.macro.f1) },
    perState: overall.perClass,
    productiveStruggleVsWheelSpinning: pw.perClass,
    confusion: cm.matrix,
  },
  perRaterAccuracy,
  calibrationMidband: cal,
};
mkdirSync(resolve(root, "reports"), { recursive: true });
const path = resolve(root, `reports/bootstrap-rater-${Date.now()}.json`);
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nWrote ${path}`);
