#!/usr/bin/env node
// End-to-end smoke test of the lobby flow against the live Firebase
// project + the locally-running Next.js dev server (assumes
// http://localhost:3000). Cleans up after itself.
//
// Steps:
//   1. Register a teacher via /api/auth/teacher (using Firebase Auth REST
//      to mint an ID token)
//   2. Create a class via /api/classes/create
//   3. Anonymously sign in a pupil; join the class via /api/classes/join
//   4. Verify Firestore documents look right
//   5. Delete the test users + docs

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

const testEmail = `smoke+${Date.now()}@bridewell-test.local`;
const testPassword = "smokeTest!23";
const teacherName = "Smoke Tester";

const created = { teacherUid: null, pupilUid: null, classId: null, joinCode: null };

async function signUpTeacher() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(`signUp failed: ${JSON.stringify(d)}`);
  created.teacherUid = d.localId;
  return d.idToken;
}

async function refreshIdToken(refreshToken) {
  const r = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(`refresh failed: ${JSON.stringify(d)}`);
  return d.id_token;
}

async function signInTeacher() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(`signIn failed: ${JSON.stringify(d)}`);
  return d.idToken;
}

async function signInAnonymous() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(`anon sign-in failed: ${JSON.stringify(d)}`);
  created.pupilUid = d.localId;
  return d.idToken;
}

function ok(label, body) {
  console.log(`✓ ${label}`);
  if (body) console.log("  ", JSON.stringify(body).slice(0, 240));
}

try {
  console.log(`\n— Lobby flow smoke test against ${base} —\n`);

  console.log("1) Sign up teacher via Auth REST…");
  const idToken1 = await signUpTeacher();
  ok("teacher created", { uid: created.teacherUid });

  console.log("2) POST /api/auth/teacher (mint role claim + write doc)…");
  const tRes = await fetch(`${base}/api/auth/teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: idToken1, displayName: teacherName, school: "KESW", role: "Head of Biology" }),
  });
  const tBody = await tRes.json();
  if (!tRes.ok) throw new Error(`teacher route failed: ${JSON.stringify(tBody)}`);
  ok("teacher claim set + doc written", tBody.teacher);

  console.log("3) Re-sign-in to pick up claim, then POST /api/classes/create…");
  const idToken2 = await signInTeacher();
  const cRes = await fetch(`${base}/api/classes/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken2}` },
    body: JSON.stringify({ name: "Year 8 · Smoke", subject: "Biology", school: "KESW" }),
  });
  const cBody = await cRes.json();
  if (!cRes.ok) throw new Error(`class create failed: ${JSON.stringify(cBody)}`);
  created.classId = cBody.class.id;
  created.joinCode = cBody.class.joinCode;
  ok("class created", { id: created.classId, joinCode: created.joinCode });

  console.log("4) Anonymous pupil sign-in + POST /api/classes/join…");
  const pupilToken = await signInAnonymous();
  const jRes = await fetch(`${base}/api/classes/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken: pupilToken,
      joinCode: created.joinCode,
      displayName: "Smoke Pupil",
    }),
  });
  const jBody = await jRes.json();
  if (!jRes.ok) throw new Error(`pupil join failed: ${JSON.stringify(jBody)}`);
  ok("pupil joined class", jBody.pupil);

  console.log("5) Verify Firestore docs…");
  const pupilSnap = await adminDb.collection("pupils").doc(created.pupilUid).get();
  if (!pupilSnap.exists) throw new Error("pupil doc missing");
  ok("pupil doc present", pupilSnap.data());
  const classSnap = await adminDb.collection("classes").doc(created.classId).get();
  if (!classSnap.exists) throw new Error("class doc missing");
  ok("class doc present", classSnap.data());

  console.log("\n✓ All steps green.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  console.log("\nCleaning up test data…");
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
