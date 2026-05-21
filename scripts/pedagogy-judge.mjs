#!/usr/bin/env node
//
// Pedagogy judge — reads every tutor turn from a simulated class run
// and grades it against a rubric drawn from the coach-mode brief in
// CLAUDE.md and the productive-struggle literature (Kapur 2008,
// Chen et al. 2024). Produces per-turn scores + an aggregate report
// so we can see how well the tutor is actually teaching, not just
// whether it responds.
//
// Rubric per turn (each scored 0/1):
//   coaches       — asks a question that pushes the pupil's thinking
//                   rather than just delivering content
//   no_answer_giveaway
//                 — does not hand the pupil the answer they're meant
//                   to work out
//   anchors       — anchors to the lesson topic + critical concepts
//   short         — single thought, ≤ ~60 words, one or two sentences
//   calm          — no false praise, no exclamations except where
//                   earned, no buddy framing
//   addresses     — directly addresses what the pupil just said (not
//                   a generic continuation)
//
// Reason responses are graded separately on whether the branch
// (accept / soft_challenge / pattern_flag) was reasonable given the
// pupil response.
//
// USAGE
//   node scripts/pedagogy-judge.mjs                 # judges latest report
//   node scripts/pedagogy-judge.mjs --report <id>   # specific run
//   node scripts/pedagogy-judge.mjs --limit 5       # cap pupils evaluated

import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sa = JSON.parse(readFileSync(resolve(root, "secrets/firebase-admin.json"), "utf8"));
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);
initializeApp({ credential: cert(sa), databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const args = process.argv.slice(2);
const reportArg = args[args.indexOf("--report") + 1];
const limit = Number(args[args.indexOf("--limit") + 1]) || 0;

// Pick the report.
const reportsDir = resolve(root, "reports");
const latestReport = reportArg
  ? `sim-${reportArg}.json`
  : readdirSync(reportsDir)
      .filter((f) => f.startsWith("sim-") && f.endsWith(".json"))
      .map((f) => ({ f, t: statSync(resolve(reportsDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0].f;

const report = JSON.parse(readFileSync(resolve(reportsDir, latestReport), "utf8"));
const classId = report.classId;
const lessonTitle = report.lessonPlan?.title ?? "(unknown)";
const criticalConcepts = report.lessonPlan?.criticalConcepts ?? [];
console.log(`Judging ${latestReport}`);
console.log(`  class:  ${classId}`);
console.log(`  lesson: ${lessonTitle}`);
console.log(`  critical concepts: ${criticalConcepts.join(", ") || "(none)"}`);
console.log("");

const JUDGE_SYSTEM = `You are a research-level evaluator of AI tutoring quality. You read a
tutor's turn in the context of the pupil's previous turn and the
lesson's critical concepts, and score it against six criteria. Each
criterion is 0 (fails) or 1 (passes). Be strict — a marginal pass is
a 0.

Rubric:

1. coaches            — Asks a question or move that pushes pupil
                        thinking. NOT a teacher-style explanation
                        unless explanation was clearly required by
                        the pupil's confusion. Pass = ends with or
                        contains a substantive question OR a precise
                        challenge.
2. no_answer_giveaway — Does not state the answer the pupil was
                        meant to work out. Defining a term IS a
                        giveaway when the lesson asks the pupil to
                        define it.
3. anchors            — Refers to the lesson topic or a critical
                        concept (paraphrasing counts). General
                        encouragement that could be on any topic
                        fails this.
4. short              — One coherent thought; ≤ ~60 words; no more
                        than two questions in a turn.
5. calm               — No exclamations except where pupil has
                        clearly earned recognition. No buddy framing
                        ("buddy", "champ", "you've got this!"). No
                        moralising.
6. addresses          — Directly addresses the substance of the
                        pupil's previous turn — not a generic
                        next-question unrelated to what they wrote.

Return JSON with the six 0/1 scores and a brief one-sentence
\`note\` calling out the most important strength or failure. No
preamble.`;

const TURN_SCHEMA = {
  type: "object",
  properties: {
    coaches: { type: "integer", minimum: 0, maximum: 1 },
    no_answer_giveaway: { type: "integer", minimum: 0, maximum: 1 },
    anchors: { type: "integer", minimum: 0, maximum: 1 },
    short: { type: "integer", minimum: 0, maximum: 1 },
    calm: { type: "integer", minimum: 0, maximum: 1 },
    addresses: { type: "integer", minimum: 0, maximum: 1 },
    note: { type: "string" },
  },
  required: ["coaches", "no_answer_giveaway", "anchors", "short", "calm", "addresses", "note"],
};

async function judge(pupilTurn, tutorTurn) {
  const prompt =
    `Lesson: ${lessonTitle}\n` +
    `Critical concepts: ${criticalConcepts.join("; ") || "(none)"}\n\n` +
    `<pupil_turn>\n${pupilTurn || "(opening prompt; pupil has not spoken yet)"}\n</pupil_turn>\n\n` +
    `<tutor_turn>\n${tutorTurn}\n</tutor_turn>\n\n` +
    `Score the tutor turn against the rubric.`;
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: JUDGE_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: TURN_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  try {
    return JSON.parse(res.text);
  } catch {
    return null;
  }
}

// Conversations live at /conversations/{classId}_{pupilUid}/messages.
// The parent doc itself has no fields — the convention is implicit in
// the doc id. listDocuments() returns the parent paths so we can find
// every conversation that belongs to this class.
const allConvDocs = await db.collection("conversations").listDocuments();
const convDocsForClass = allConvDocs.filter((d) => d.id.startsWith(`${classId}_`));
console.log(`Conversations found: ${convDocsForClass.length}`);

const conversations = [];
for (const docRef of convDocsForClass) {
  const pupilUid = docRef.id.slice(classId.length + 1);
  let pupilName = pupilUid;
  try {
    const pupilSnap = await db.collection("pupils").doc(pupilUid).get();
    pupilName = pupilSnap.data()?.displayName ?? pupilUid;
  } catch {
    /* fall back to uid */
  }
  const messagesSnap = await docRef
    .collection("messages")
    .orderBy("timestamp", "asc")
    .get();
  const turns = messagesSnap.docs.map((m) => m.data());
  conversations.push({ pupilId: pupilUid, pupilName, turns });
}
conversations.sort((a, b) => a.pupilName.localeCompare(b.pupilName));
console.log(`Pupils: ${conversations.map((c) => c.pupilName).join(", ")}`);
console.log("");

const all = [];
const slice = limit > 0 ? conversations.slice(0, limit) : conversations;
for (const conv of slice) {
  console.log(`▶ ${conv.pupilName} — ${conv.turns.length} turns`);
  // Walk the conversation. For each tutor turn, score it against the
  // immediately preceding pupil turn (or null for the opener).
  let lastPupil = null;
  for (const t of conv.turns) {
    if (t.role === "pupil") {
      lastPupil = t.content;
      continue;
    }
    if (t.role !== "tutor") continue;
    const score = await judge(lastPupil, t.content);
    if (!score) continue;
    const passes = score.coaches + score.no_answer_giveaway + score.anchors + score.short + score.calm + score.addresses;
    all.push({ pupil: conv.pupilName, pupilTurn: lastPupil, tutorTurn: t.content, score, total: passes });
    const mark = passes >= 5 ? "✓" : passes >= 3 ? "·" : "✗";
    console.log(`  ${mark} ${passes}/6  ${(t.content || "").slice(0, 70).replace(/\n/g, " ")}…  — ${score.note}`);
  }
}

// Aggregate.
const total = all.length;
function pct(field) {
  const wins = all.filter((r) => r.score[field] === 1).length;
  return total ? Math.round((wins / total) * 100) : 0;
}
const avg = total ? (all.reduce((s, r) => s + r.total, 0) / total).toFixed(2) : "0";

console.log("");
console.log("─".repeat(60));
console.log("AGGREGATE");
console.log("─".repeat(60));
console.log(`turns judged:           ${total}`);
console.log(`average pass count:     ${avg} / 6`);
console.log(`coaches:                ${pct("coaches")}%`);
console.log(`no_answer_giveaway:     ${pct("no_answer_giveaway")}%`);
console.log(`anchors:                ${pct("anchors")}%`);
console.log(`short:                  ${pct("short")}%`);
console.log(`calm:                   ${pct("calm")}%`);
console.log(`addresses:              ${pct("addresses")}%`);

const worst = [...all].sort((a, b) => a.total - b.total).slice(0, 5);
console.log("");
console.log("WEAKEST 5 TURNS:");
for (const w of worst) {
  console.log(`  [${w.total}/6] ${w.pupil}`);
  console.log(`    Pupil: ${(w.pupilTurn || "(opener)").slice(0, 80)}`);
  console.log(`    Tutor: ${w.tutorTurn.slice(0, 80)}…`);
  console.log(`    Note:  ${w.score.note}`);
}

// Write a report to docs/qa/.
const outDir = resolve(root, "docs/qa");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `pedagogy-judge-${Date.now()}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      reportSource: latestReport,
      lessonTitle,
      criticalConcepts,
      total,
      averagePassCount: Number(avg),
      pct: {
        coaches: pct("coaches"),
        no_answer_giveaway: pct("no_answer_giveaway"),
        anchors: pct("anchors"),
        short: pct("short"),
        calm: pct("calm"),
        addresses: pct("addresses"),
      },
      worst5: worst,
      all,
    },
    null,
    2
  )
);
console.log("");
console.log(`Report: ${outPath}`);
process.exit(0);
