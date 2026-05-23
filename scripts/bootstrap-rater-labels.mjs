#!/usr/bin/env node
//
// Reason multi-rater bootstrap. Labels each transcript window with THREE
// independent LLM raters from a DIFFERENT model family than the system under
// test (Anthropic Claude, not Gemini), under three rubrics —
// strict / permissive / mid-band — then computes inter-rater agreement
// (Fleiss κ, pairwise Cohen κ + linear-weighted κ, Krippendorff α), per-state
// precision/recall/F1 of the majority vote vs the gold label, a confusion
// matrix, and confidence calibration (ECE).
//
// WHY a different family: using Gemini to "rate" Gemini's classifier is
// circular. Anthropic raters are an independent signal. They are still NOT a
// substitute for human teacher labels — that pass stays 🔒 (see
// docs/reason-evidence.md). Output is headed {"bootstrap":true,
// "researchValid":false} so it can never be mistaken for the research claim.
//
// USAGE
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node scripts/bootstrap-rater-labels.mjs --file docs/reason-eval/transcripts.jsonl
//
// Requires ≥120 windows for a meaningful α; the committed starter set is 34,
// so expand docs/reason-eval/transcripts.jsonl first (see its README).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STATES,
  prf,
  confusionMatrix,
  calibration,
  cohenKappa,
  fleissKappa,
  krippendorffAlpha,
  round,
} from "./reason-eval-metrics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const file = arg("--file", "docs/reason-eval/transcripts.jsonl");
const model = arg("--model", "claude-opus-4-7");

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error(
    "BLOCKED: ANTHROPIC_API_KEY is not set.\n" +
      "Multi-rater labels must come from a non-Gemini model family (Anthropic).\n" +
      "Set the key and re-run. The metrics maths (κ / weighted-κ / Fleiss / α /\n" +
      "ECE / per-state F1) is implemented + unit-tested in reason-eval-metrics.mjs;\n" +
      "this script only needs the credential to generate the labels.\n" +
      "See reports/blocked.md.",
  );
  process.exit(2);
}

// Three rater rubrics. Same five states; the difference is the evidential bar.
const RUBRICS = {
  strict:
    "You are a STRICT rater. Demand explicit textual evidence; when a window is " +
    "ambiguous, prefer the lower-engagement label. Do not give the benefit of the doubt.",
  permissive:
    "You are a GENEROUS rater. Read effort charitably; when a window is ambiguous, " +
    "prefer the higher-engagement / productive-struggle reading.",
  midband:
    "You are a BALANCED rater. Weigh the evidence even-handedly; when genuinely " +
    "ambiguous, say so via a mid-range confidence rather than forcing a confident label.",
};

const STATE_DEFS = `States:
- flowing: substantive + confident; states/connects/generalises without hedging.
- productive_struggle: substantive + reasoning-aloud; partial answers, hedges, revises, asks about own reasoning.
- wheel_spinning: repeated scaffold use without producing substance; echoes the tutor; presses for hints.
- disengaged: very short replies, drifting, doing the minimum; terse-correct-without-elaboration belongs here.
- off_task: unrelated to the lesson.`;

async function rate(window, rubric) {
  const transcript = (window.turns ?? [])
    .map((t) => `${t.role === "pupil" ? "Pupil" : "Tutor"}: ${t.content}`)
    .join("\n");
  const system =
    `${RUBRICS[rubric]}\n\nClassify the pupil's engagement in the window into exactly one of five states.\n${STATE_DEFS}\n\n` +
    `Reply with STRICT JSON only: {"state": "<one state>", "confidence": <0..1>}.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      system,
      messages: [
        {
          role: "user",
          content: `Lesson: ${window.lessonTitle ?? ""} (${window.lessonSubject ?? ""}).\nTranscript:\n${transcript}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.map((c) => c.text).join("") ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  const parsed = m ? JSON.parse(m[0]) : {};
  const state = STATES.includes(parsed.state) ? parsed.state : null;
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  return { state, confidence };
}

const lines = readFileSync(resolve(root, file), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("//"));
const windows = lines.map((l) => JSON.parse(l));
if (windows.length < 120) {
  console.warn(
    `⚠  Only ${windows.length} windows (<120). κ/α will be under-powered — expand the set for a meaningful claim.`,
  );
}

const raterNames = ["strict", "permissive", "midband"];
const perRater = { strict: [], permissive: [], midband: [] }; // arrays of {state} aligned to windows
const fleissItems = [];
const preds = []; // majority-vote prediction vs gold for P/R/F1 + ECE

for (const [i, w] of windows.entries()) {
  const labels = {};
  const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
  let confSum = 0;
  for (const r of raterNames) {
    try {
      const out = await rate(w, r);
      labels[r] = out.state;
      perRater[r].push(out.state);
      if (out.state) counts[out.state] += 1;
      confSum += out.confidence;
    } catch (e) {
      labels[r] = null;
      perRater[r].push(null);
      console.warn(`  window ${i} rater ${r} failed: ${e.message}`);
    }
  }
  fleissItems.push(counts);
  // Majority vote (ties → first by STATES order).
  const majority = STATES.reduce((best, s) => (counts[s] > counts[best] ? s : best), STATES[0]);
  if (w.goldState) {
    preds.push({ gold: w.goldState, predicted: majority, confidence: confSum / raterNames.length });
  }
  console.log(`  ${w.id ?? i}: strict=${labels.strict} permissive=${labels.permissive} mid=${labels.midband} → ${majority}`);
}

// Agreement.
const pairAB = windows.map((_, i) => ({ a: perRater.strict[i], b: perRater.permissive[i] }))
  .filter((p) => p.a && p.b);
const pairAC = windows.map((_, i) => ({ a: perRater.strict[i], b: perRater.midband[i] }))
  .filter((p) => p.a && p.b);
const pairBC = windows.map((_, i) => ({ a: perRater.permissive[i], b: perRater.midband[i] }))
  .filter((p) => p.a && p.b);

const krippData = raterNames.map((r) => perRater[r]);

const agreement = {
  fleissKappa: round(fleissKappa(fleissItems)),
  krippendorffAlpha: round(krippendorffAlpha(krippData)),
  pairwiseCohenKappa: {
    "strict~permissive": round(cohenKappa(pairAB)),
    "strict~midband": round(cohenKappa(pairAC)),
    "permissive~midband": round(cohenKappa(pairBC)),
  },
  pairwiseWeightedKappa: {
    "strict~permissive": round(cohenKappa(pairAB, undefined, "linear")),
    "strict~midband": round(cohenKappa(pairAC, undefined, "linear")),
    "permissive~midband": round(cohenKappa(pairBC, undefined, "linear")),
  },
};

const majorityVsGold = preds.length
  ? { ...prf(preds), confusion: confusionMatrix(preds), calibration: calibration(preds) }
  : null;

const out = {
  bootstrap: true,
  researchValid: false,
  note: "LLM raters (Anthropic) — NOT teacher labels. Human-labelled multi-rater pass remains required (🔒).",
  generatedAt: new Date().toISOString(),
  model,
  file,
  nWindows: windows.length,
  raters: raterNames,
  agreement,
  majorityVsGold,
};

const dir = resolve(root, "reports");
mkdirSync(dir, { recursive: true });
const path = resolve(dir, `bootstrap-rater-${Date.now()}.json`);
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nWrote ${path}`);
console.log(JSON.stringify(agreement, null, 2));
