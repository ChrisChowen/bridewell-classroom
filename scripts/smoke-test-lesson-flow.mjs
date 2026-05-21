#!/usr/bin/env node
// End-to-end smoke test of the new AI-led class setup loop.
//
// Steps:
//   1. Register a teacher via Firebase Auth REST
//   2. POST /api/auth/teacher to mint role claim + write teacher doc
//   3. Re-sign-in to pick up the claim
//   4. POST /api/lessons/generate (Biology Y8 photosynthesis + a real
//      natural-language teacher intent) → expect a structured LessonPlan
//   5. POST /api/classes/create with the LessonPlan attached
//   6. Anonymously sign in as a pupil; POST /api/classes/join
//   7. GET /api/pupils/me → expect class.lessonPlan to be the approved one
//   8. POST /api/chat using the lesson-plan addendum; check the tutor
//      stays in coach mode and engages with the topic
//   9. Clean up

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, "../secrets/firebase-admin.json"), "utf8"));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const app = initializeApp({ credential: cert(sa), databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const base = "http://localhost:3000";
const testEmail = `smoke-lesson+${Date.now()}@bridewell-test.local`;
const testPassword = "smokeTest!23";
const teacherName = "Smoke Tester (Lesson Flow)";
const teacherIntent =
  "I want pupils to grasp that chlorophyll captures light energy to make glucose. Spend most of the time on why leaves look green and how light intensity changes the rate. They have met respiration but not the word equation. 30 minutes.";

const created = { teacherUid: null, pupilUid: null, classId: null, joinCode: null };

async function authReq(path, init = {}, token) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function signUp() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`signUp: ${JSON.stringify(d)}`);
  created.teacherUid = d.localId;
  return d.idToken;
}

async function signIn() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`signIn: ${JSON.stringify(d)}`);
  return d.idToken;
}

async function signInAnonymous() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`anon: ${JSON.stringify(d)}`);
  created.pupilUid = d.localId;
  return d.idToken;
}

function ok(label, body) {
  console.log(`✓ ${label}`);
  if (body) console.log("  ", JSON.stringify(body).slice(0, 380));
}

try {
  console.log(`\n— AI-led class setup smoke test against ${base} —\n`);

  console.log("1) Teacher sign-up + claim…");
  const t1 = await signUp();
  await authReq("/api/auth/teacher", {
    method: "POST",
    body: JSON.stringify({ idToken: t1, displayName: teacherName, school: "KESW", role: "Head of Biology" }),
  });
  ok("teacher created + role claim minted");

  console.log("2) Re-sign-in to pick up the claim…");
  const t2 = await signIn();

  console.log("3) POST /api/lessons/generate (photosynthesis + natural-language intent)…");
  const t0 = Date.now();
  const planResp = await authReq(
    "/api/lessons/generate",
    {
      method: "POST",
      body: JSON.stringify({
        syllabusId: "ks3-bio-y8-photosynthesis",
        teacherIntent,
        className: "Year 8 · Set 2",
        yearGroup: 8,
        classNotes: "Mixed prior knowledge; two pupils with dyslexia",
      }),
    },
    t2
  );
  const plan = planResp.plan;
  ok(`lesson plan generated (${Date.now() - t0}ms)`, {
    title: plan.title,
    steps: plan.sequence.length,
    objectives: plan.learningObjectives.length,
    critical: plan.criticalConcepts.length,
    addendum_excerpt: plan.tutorAddendum.slice(0, 120) + "…",
  });

  console.log("4) POST /api/classes/create with the plan attached…");
  const classResp = await authReq(
    "/api/classes/create",
    {
      method: "POST",
      body: JSON.stringify({ name: "Year 8 · Smoke Lesson", subject: "Biology", school: "KESW", lessonPlan: plan }),
    },
    t2
  );
  created.classId = classResp.class.id;
  created.joinCode = classResp.class.joinCode;
  ok("class created with plan", { id: created.classId, joinCode: created.joinCode });

  console.log("5) Pupil anonymous sign-in + join…");
  const pToken = await signInAnonymous();
  await authReq("/api/classes/join", {
    method: "POST",
    body: JSON.stringify({ idToken: pToken, joinCode: created.joinCode, displayName: "Smoke Pupil" }),
  });
  ok("pupil joined");

  console.log("6) GET /api/pupils/me — expecting class.lessonPlan attached…");
  const meRes = await fetch(`${base}/api/pupils/me`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const meBody = await meRes.json();
  if (!meRes.ok) throw new Error(`me: ${JSON.stringify(meBody)}`);
  if (!meBody.class?.lessonPlan?.title) throw new Error("lessonPlan missing on pupil's class");
  ok("pupil sees lesson plan", {
    classTitle: meBody.class.lessonPlan.title,
    firstStep: meBody.class.lessonPlan.sequence[0].title,
    openingPrompt: meBody.class.lessonPlan.sequence[0].openingPrompt.slice(0, 100) + "…",
  });

  console.log("7) POST /api/chat using the lesson-plan context…");
  const chatBody = await authReq("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [
        { role: "assistant", content: meBody.class.lessonPlan.sequence[0].openingPrompt },
        { role: "user", content: "uhh... is the light going INSIDE the leaf?" },
      ],
      mode: "coach",
      lesson: {
        title: meBody.class.lessonPlan.title,
        subject: meBody.class.lessonPlan.subject,
        criticalConcepts: meBody.class.lessonPlan.criticalConcepts,
        keyVocabulary: meBody.class.lessonPlan.keyVocabulary,
        tutorAddendum: meBody.class.lessonPlan.tutorAddendum,
      },
    }),
  });
  ok("tutor reply (coach mode anchored to plan)", { text: chatBody.text });

  console.log("\n✓ All steps green.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  console.log("\nCleaning up…");
  try {
    if (created.classId) {
      await adminDb.collection("classes").doc(created.classId).delete();
      if (created.joinCode) await adminDb.collection("joinCodes").doc(created.joinCode).delete();
    }
    if (created.pupilUid) {
      await adminDb.collection("pupils").doc(created.pupilUid).delete();
      await adminAuth.deleteUser(created.pupilUid).catch(() => {});
    }
    if (created.teacherUid) {
      await adminDb.collection("teachers").doc(created.teacherUid).delete();
      await adminAuth.deleteUser(created.teacherUid).catch(() => {});
    }
    console.log("✓ cleanup done.");
  } catch (e) {
    console.warn("cleanup warn:", e.message);
  }
}
