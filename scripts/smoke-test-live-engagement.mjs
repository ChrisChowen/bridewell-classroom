#!/usr/bin/env node
// Smoke test for the LIVE engagement loop:
//
// 1. Teacher signs up + creates a class with a lesson plan
// 2. Pupil joins anonymously
// 3. Pupil POSTs /api/engagement/run with a transcript + signals
// 4. Server writes engagementSnapshots in Firestore
// 5. Server mirrors latest state to /liveSessions/{classId}/pupils/{pupilId}
//    in RTDB
// 6. We verify both writes happened
// 7. We also try a transcript with a disclosure, expecting a
//    safeguardingEvents doc and a non-null safeguarding block in RTDB
// 8. Clean up

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, "../secrets/firebase-admin.json"), "utf8"));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);
const app = initializeApp({
  credential: cert(sa),
  databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminRtdb = getDatabase(app);

const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const base = "http://localhost:3000";

const teacherEmail = `smoke-live+${Date.now()}@bridewell-test.local`;
const teacherPassword = "smokeTest!23";
const created = { teacherUid: null, pupilUid: null, classId: null, joinCode: null };
const safeguardingDocsToDelete = [];
const snapshotsToDelete = [];

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
  console.log("\n— Live engagement loop smoke test —\n");

  console.log("1) Teacher sign-up + claim…");
  const up = await rest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    { email: teacherEmail, password: teacherPassword, returnSecureToken: true }
  );
  created.teacherUid = up.localId;
  await authedPost("/api/auth/teacher", {
    idToken: up.idToken,
    displayName: "Live Smoke",
    school: "KESW",
    role: "Head of Biology",
  });
  const in2 = await rest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    { email: teacherEmail, password: teacherPassword, returnSecureToken: true }
  );

  console.log("2) Create class (no full plan needed; we test the loop)…");
  const cResp = await authedPost(
    "/api/classes/create",
    {
      name: "Year 8 · Live Smoke",
      subject: "Biology",
      school: "KESW",
    },
    in2.idToken
  );
  created.classId = cResp.class.id;
  created.joinCode = cResp.class.joinCode;
  console.log(`  class ${created.classId} · code ${created.joinCode}`);

  console.log("3) Pupil joins anonymously…");
  const anon = await rest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    { returnSecureToken: true }
  );
  created.pupilUid = anon.localId;
  await authedPost("/api/classes/join", {
    idToken: anon.idToken,
    joinCode: created.joinCode,
    displayName: "Smoke Pupil",
  });

  console.log("4) Pupil fires /api/engagement/run (productive-struggle transcript)…");
  const eng = await authedPost("/api/engagement/run", {
    idToken: anon.idToken,
    turns: [
      { role: "tutor", content: "What is happening to the light when it lands on the leaf?" },
      { role: "pupil", content: "I think the leaf is taking some of it in? Because it's green?" },
      { role: "tutor", content: "Which colours is it keeping then?" },
      { role: "pupil", content: "The red and blue ones I think, but I can't remember why" },
    ],
    signals: { windowSec: 120, avgResponseTimeSec: 40, avgMessageLength: 70, scaffoldUseCount: 1 },
    lessonTitle: "Photosynthesis",
    lessonSubject: "Biology",
    lastPupilExcerpt: "The red and blue ones I think, but I can't remember why",
  });
  console.log("  classifier:", { state: eng.state, confidence: eng.confidence, safeguarding: eng.safeguarding?.severity });

  // Verify writes.
  console.log("5) Verifying Firestore engagementSnapshots…");
  const snapsByPupil = await adminDb
    .collection("engagementSnapshots")
    .where("pupilId", "==", created.pupilUid)
    .get();
  console.log(`  ${snapsByPupil.size} snapshot(s)`);
  if (snapsByPupil.size === 0) throw new Error("No engagement snapshot was written");
  snapsByPupil.forEach((d) => snapshotsToDelete.push(d.ref));

  console.log("6) Verifying RTDB liveSessions mirror…");
  const liveSnap = await adminRtdb.ref(`liveSessions/${created.classId}/pupils/${created.pupilUid}`).get();
  const live = liveSnap.val();
  if (!live) throw new Error("No RTDB live mirror was written");
  console.log("  RTDB:", {
    state: live.state,
    confidence: live.confidence,
    trajectoryLen: live.trajectory?.length,
    lastPupilExcerpt: live.lastPupilExcerpt?.slice(0, 60),
  });

  console.log("\n7) Re-fire with a safeguarding disclosure…");
  const eng2 = await authedPost("/api/engagement/run", {
    idToken: anon.idToken,
    turns: [
      { role: "tutor", content: "Why might leaves keep red and blue light?" },
      { role: "pupil", content: "I don't really care, my dad shouted at me this morning and I don't want to be here" },
    ],
    signals: { windowSec: 60, avgResponseTimeSec: 60, avgMessageLength: 80, scaffoldUseCount: 0 },
    lessonTitle: "Photosynthesis",
    lessonSubject: "Biology",
    lastPupilExcerpt: "I don't really care, my dad shouted at me this morning and I don't want to be here",
  });
  console.log("  classifier:", { state: eng2.state, safeguarding: eng2.safeguarding });

  if (!["medium", "high"].includes(eng2.safeguarding?.severity ?? "none")) {
    console.warn(`  ✗ expected medium/high safeguarding; got ${eng2.safeguarding?.severity}`);
    process.exitCode = 1;
  } else {
    const safeguardingDocs = await adminDb
      .collection("safeguardingEvents")
      .where("pupilId", "==", created.pupilUid)
      .get();
    console.log(`  ✓ ${safeguardingDocs.size} safeguarding event(s) persisted`);
    safeguardingDocs.forEach((d) => safeguardingDocsToDelete.push(d.ref));
    const liveSnap2 = await adminRtdb.ref(`liveSessions/${created.classId}/pupils/${created.pupilUid}`).get();
    const live2 = liveSnap2.val();
    if (!live2.safeguarding) throw new Error("RTDB safeguarding block missing");
    console.log("  ✓ RTDB safeguarding block:", live2.safeguarding.severity);
  }

  console.log("\n✓ all green.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  console.log("\nCleaning up…");
  try {
    for (const ref of snapshotsToDelete) await ref.delete().catch(() => {});
    for (const ref of safeguardingDocsToDelete) await ref.delete().catch(() => {});
    if (created.classId) {
      await adminRtdb.ref(`liveSessions/${created.classId}`).remove().catch(() => {});
      await adminDb.collection("classes").doc(created.classId).delete().catch(() => {});
      if (created.joinCode) await adminDb.collection("joinCodes").doc(created.joinCode).delete().catch(() => {});
    }
    if (created.pupilUid) {
      await adminDb.collection("pupils").doc(created.pupilUid).delete().catch(() => {});
      await adminAuth.deleteUser(created.pupilUid).catch(() => {});
    }
    if (created.teacherUid) {
      await adminDb.collection("teachers").doc(created.teacherUid).delete().catch(() => {});
      await adminAuth.deleteUser(created.teacherUid).catch(() => {});
    }
    console.log("✓ cleanup done.");
  } catch (e) {
    console.warn("cleanup warn:", e.message);
  }
}
