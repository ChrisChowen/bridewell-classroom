#!/usr/bin/env node
//
// Reason / classifier ground-truth evaluation harness.
//
// Reads a JSONL file of HUMAN-LABELLED transcript windows and grades the
// REAL engagement classifier (by calling the live /api/engagement/classify
// endpoint — not a re-implementation) against the labels. Produces
// precision / recall / F1 per state, the productive_struggle vs
// wheel_spinning pairwise claim (the goal's named contribution), a
// confusion matrix, and confidence calibration (ECE).
//
// This is the script behind docs/reason-evidence.md. The numbers are only
// as good as the labels: you must hand-label real transcripts first (see
// docs/reason-eval/README.md for the schema + how to label).
//
// USAGE
//   node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl
//   node scripts/reason-eval.mjs --file <path> --base http://localhost:3000
//   node scripts/reason-eval.mjs --file <path> --base https://<live-host>
//
// Each JSONL line:
//   {
//     "id": "t001",
//     "goldState": "productive_struggle",   // the human label (required)
//     "turns": [{ "role": "pupil"|"tutor", "content": "..." }, ...],
//     "signals": { "windowSec": 60, "scaffoldUseCount": 2, ... },
//     "lessonTitle": "Photosynthesis", "lessonSubject": "Biology",
//     "criticalConcepts": ["..."]
//   }

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { confusionMatrix, prf, pairwise, calibration, round, STATES } from "./reason-eval-metrics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const file = arg("--file", "docs/reason-eval/transcripts.jsonl");
const base = arg("--base", "http://localhost:3000").replace(/\/$/, "");

const lines = readFileSync(resolve(root, file), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("//"));

if (lines.length === 0) {
  console.error(`No labelled rows in ${file}. See docs/reason-eval/README.md.`);
  process.exit(1);
}

const rows = lines.map((l, i) => {
  try {
    return JSON.parse(l);
  } catch (e) {
    console.error(`Line ${i + 1} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
});

const labelled = rows.filter((r) => r.goldState && STATES.includes(r.goldState));
if (labelled.length !== rows.length) {
  console.warn(`⚠  ${rows.length - labelled.length} row(s) lack a valid goldState and were skipped.`);
}

console.log(`Grading ${labelled.length} labelled window(s) against ${base}/api/engagement/classify …\n`);

const pairs = [];
const preds = [];
let errors = 0;

for (const row of labelled) {
  const payload = {
    turns: row.turns ?? [],
    signals: row.signals ?? { windowSec: 60 },
    lessonTitle: row.lessonTitle,
    lessonSubject: row.lessonSubject,
    criticalConcepts: row.criticalConcepts,
    pupilProfile: row.pupilProfile,
  };
  try {
    const res = await fetch(`${base}/api/engagement/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (data.fallbackUsed) {
      console.warn(`  ${row.id}: classifier fell back (LLM unavailable) — excluded from metrics.`);
      errors += 1;
      continue;
    }
    pairs.push({ gold: row.goldState, predicted: data.state, subject: row.lessonSubject });
    preds.push({ gold: row.goldState, predicted: data.state, confidence: data.confidence ?? 0 });
    const mark = data.state === row.goldState ? "✓" : "✗";
    console.log(`  ${mark} ${row.id}: gold=${row.goldState} pred=${data.state} (${Math.round((data.confidence ?? 0) * 100)}%)`);
  } catch (e) {
    console.warn(`  ${row.id}: request failed — ${e.message}`);
    errors += 1;
  }
}

if (pairs.length === 0) {
  console.error(`\nNo gradable predictions (errors=${errors}). Is the dev server running at ${base}?`);
  process.exit(1);
}

const cm = confusionMatrix(pairs);
const overall = prf(pairs);
const pw = pairwise(pairs);
const cal = calibration(preds);

// Cross-subject breakdown — per-subject accuracy + macro-F1 (the goal's
// cross-subject-robustness claim: ≥0.85 accuracy per subject).
const subjects = [...new Set(pairs.map((p) => p.subject).filter(Boolean))].sort();
const bySubject = {};
for (const subj of subjects) {
  const sp = pairs.filter((p) => p.subject === subj);
  const correct = sp.filter((p) => p.gold === p.predicted).length;
  const m = prf(sp);
  bySubject[subj] = {
    n: sp.length,
    accuracy: round(correct / sp.length),
    macroF1: round(m.macro.f1),
  };
}

const fmt = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

console.log("\n══ Overall ══");
console.log(`  n=${cm.total}  accuracy=${fmt(cm.accuracy)}  errors/fallbacks=${errors}`);
console.log(`  macro  P=${fmt(overall.macro.precision)}  R=${fmt(overall.macro.recall)}  F1=${fmt(overall.macro.f1)}`);

console.log("\n══ Per state (precision / recall / F1 / support) ══");
for (const s of STATES) {
  const c = overall.perClass[s];
  if (!c || c.support === 0) continue;
  console.log(`  ${s.padEnd(20)} ${fmt(c.precision)} / ${fmt(c.recall)} / ${fmt(c.f1)}  (n=${c.support})`);
}

console.log("\n══ The named claim — productive_struggle vs wheel_spinning ══");
for (const s of ["productive_struggle", "wheel_spinning"]) {
  const c = pw.perClass[s];
  if (!c) continue;
  console.log(`  ${s.padEnd(20)} P=${fmt(c.precision)}  R=${fmt(c.recall)}  F1=${fmt(c.f1)}  (n=${c.support})`);
}

console.log("\n══ Cross-subject (accuracy / macro-F1 / n) ══");
for (const subj of subjects) {
  const b = bySubject[subj];
  const flag = b.accuracy >= 0.85 ? "✓" : "✗";
  console.log(`  ${flag} ${subj.padEnd(12)} acc=${fmt(b.accuracy)}  macroF1=${fmt(b.macroF1)}  (n=${b.n})`);
}

console.log("\n══ Confidence calibration (ECE = " + fmt(cal.ece) + ") ══");
for (const b of cal.buckets) {
  if (!b.n) continue;
  console.log(`  [${b.range[0].toFixed(1)}–${b.range[1].toFixed(1)})  n=${b.n}  acc=${fmt(b.accuracy)}  meanConf=${fmt(b.meanConfidence)}`);
}

const out = {
  generatedAt: new Date().toISOString(),
  base,
  file,
  n: cm.total,
  errors,
  accuracy: round(cm.accuracy),
  macro: {
    precision: round(overall.macro.precision),
    recall: round(overall.macro.recall),
    f1: round(overall.macro.f1),
  },
  perState: overall.perClass,
  productiveStruggleVsWheelSpinning: pw.perClass,
  bySubject,
  calibration: cal,
  confusion: cm.matrix,
};
const dir = resolve(root, "reports");
mkdirSync(dir, { recursive: true });
const path = resolve(dir, `reason-eval-${Date.now()}.json`);
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nWrote ${path}`);
console.log("Fold the headline numbers into docs/reason-evidence.md.");
