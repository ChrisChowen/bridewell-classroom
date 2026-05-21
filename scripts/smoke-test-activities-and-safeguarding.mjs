#!/usr/bin/env node
// Smoke test for two new capabilities:
//
//   1. The lesson plan generator picks varied ACTIVITY TYPES across the
//      sequence (not just socratic).
//   2. The engagement classifier emits a SAFEGUARDING flag with the
//      right severity on a transcript that contains a disclosure.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const base = "http://localhost:3000";

// Spin up a one-shot teacher account for the planner call.
const email = `smoke-act+${Date.now()}@bridewell-test.local`;
const password = "smokeTest!23";

async function rest(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`${url}: ${JSON.stringify(d)}`);
  return d;
}

async function authedPost(path, body, token) {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`${path}: ${JSON.stringify(d)}`);
  return d;
}

try {
  console.log("\n— Activity-types + safeguarding smoke test —\n");

  // ---- A. Activity-types in lesson plan ----
  console.log("A) Sign up teacher + generate plan (English / persuasive writing)…");
  const up = await rest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    { email, password, returnSecureToken: true }
  );
  await authedPost("/api/auth/teacher", {
    idToken: up.idToken,
    displayName: "Activities Smoke",
    school: "KESW",
    role: "Head of English",
  });
  const in2 = await rest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    { email, password, returnSecureToken: true }
  );

  const planResp = await authedPost(
    "/api/lessons/generate",
    {
      syllabusId: "ks3-eng-y8-persuasive-writing",
      teacherIntent:
        "Year 8 — 45 min. Focus on rhetorical questions and tricolons. I want some retrieval at the start, then a sorting exercise to identify devices in a model, and finish with the pupil writing one short persuasive paragraph of their own.",
      className: "Year 8 · Set 2",
      yearGroup: 8,
    },
    in2.idToken
  );
  const plan = planResp.plan;
  console.log(`  title: ${plan.title}`);
  console.log(`  ${plan.sequence.length} steps:`);
  plan.sequence.forEach((s, i) => {
    console.log(
      `    ${i + 1}. [${s.activityType}] ${s.title}${
        s.estimatedMinutes ? ` (~${s.estimatedMinutes}m)` : ""
      }`
    );
  });
  const activities = plan.sequence.map((s) => s.activityType);
  const distinct = new Set(activities).size;
  if (distinct < 2) {
    console.warn(`  ✗ planner picked only ${distinct} distinct activity type(s). Expected variety.`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ planner picked ${distinct} distinct activity types`);
  }

  // ---- B. Tutor honours the activity in the chat path ----
  console.log("\nB) Run the FIRST step through /api/chat — should follow its activity register…");
  const step0 = plan.sequence[0];
  const chat = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "I'm ready" }],
      mode: "coach",
      lesson: {
        title: plan.title,
        subject: plan.subject,
        criticalConcepts: plan.criticalConcepts,
        keyVocabulary: plan.keyVocabulary,
        tutorAddendum: plan.tutorAddendum,
      },
      step: { title: step0.title, goal: step0.goal, activityType: step0.activityType },
    }),
  });
  const chatBody = await chat.json();
  if (!chat.ok) throw new Error(`chat: ${JSON.stringify(chatBody)}`);
  console.log(`  step activity: ${step0.activityType}`);
  console.log(`  tutor reply: ${chatBody.text}`);

  // ---- C. Classifier emits a safeguarding flag ----
  console.log("\nC) Classifier safeguarding signal — neutral conversation should return severity 'none'…");
  const neutral = await authedPost(
    "/api/engagement/classify",
    {
      turns: [
        { role: "tutor", content: "What does a tricolon do that a pair does not?" },
        { role: "pupil", content: "I think three things land harder because it sounds final?" },
      ],
      signals: { windowSec: 60, avgResponseTimeSec: 30, avgMessageLength: 60, scaffoldUseCount: 0 },
      lessonTitle: plan.title,
      lessonSubject: plan.subject,
    },
  );
  console.log(`  state: ${neutral.state} | safeguarding.severity: ${neutral.safeguarding?.severity}`);
  if (neutral.safeguarding?.severity !== "none") {
    console.warn("  ✗ expected severity 'none' for a neutral transcript");
    process.exitCode = 1;
  } else {
    console.log("  ✓ no false positive on a neutral transcript");
  }

  console.log("\n   …and a transcript with a concerning disclosure should flag medium or high…");
  const flagged = await authedPost(
    "/api/engagement/classify",
    {
      turns: [
        { role: "tutor", content: "What does a tricolon do that a pair does not?" },
        { role: "pupil", content: "honestly nobody in my class likes me and i'm crying at lunch every day, i don't want to come in anymore" },
      ],
      signals: { windowSec: 60, avgResponseTimeSec: 50, avgMessageLength: 80, scaffoldUseCount: 0 },
      lessonTitle: plan.title,
      lessonSubject: plan.subject,
    },
  );
  console.log(`  state: ${flagged.state} | safeguarding:`, flagged.safeguarding);
  if (!["medium", "high"].includes(flagged.safeguarding?.severity)) {
    console.warn(`  ✗ expected medium/high; got ${flagged.safeguarding?.severity}`);
    process.exitCode = 1;
  } else {
    console.log("  ✓ classifier raised the disclosure to the teacher");
  }

  // Cleanup
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getAuth: gAuth } = await import("firebase-admin/auth");
  const { getFirestore: gDb } = await import("firebase-admin/firestore");
  const sa = JSON.parse(readFileSync(resolve(__dirname, "../secrets/firebase-admin.json"), "utf8"));
  const app = initializeApp({ credential: cert(sa) });
  await gDb(app).collection("teachers").doc(up.localId).delete().catch(() => {});
  await gAuth(app).deleteUser(up.localId).catch(() => {});

  console.log("\n✓ smoke complete\n");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
}
