#!/usr/bin/env node
//
// Firestore security-rules test — runs against the emulator.
//   npm run test:rules    (wraps: firebase emulators:exec --only firestore,auth)
//
// Uses only deps already in the project (firebase-admin to seed + set
// claims, firebase client v12 to attempt reads as each role) — no
// peer-conflicting rules-unit-testing dependency. Proves the v3 scoping:
// teachers read only their own classes/pupils/conversations, the
// teacher-email PII leak is closed, and server-only analytics +
// safeguarding collections are unreadable by any client.

import { initializeApp as adminInit, deleteApp as adminDelete } from "firebase-admin/app";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { initializeApp as clientInit, deleteApp as clientDelete } from "firebase/app";
import {
  getFirestore as clientFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  getAuth as clientGetAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const PROJECT = "bridewell-classroom";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

// Admin auto-connects to emulators via the *_EMULATOR_HOST env vars.
const admin = adminInit({ projectId: PROJECT }, "admin-rules-test");
const adb = adminFirestore(admin);
const aauth = adminAuth(admin);

const client = clientInit({ apiKey: "emulator", projectId: PROJECT }, "client-rules-test");
const cdb = clientFirestore(client);
const cauth = clientGetAuth(client);
connectFirestoreEmulator(cdb, FS_HOST.split(":")[0], Number(FS_HOST.split(":")[1]));
connectAuthEmulator(cauth, `http://${AUTH_HOST}`, { disableWarnings: true });

let pass = 0;
let fail = 0;
const failures = [];

async function mkUser(email, claims) {
  const cred = await createUserWithEmailAndPassword(cauth, email, "password123");
  const uid = cred.user.uid;
  if (claims) await aauth.setCustomUserClaims(uid, claims);
  await signOut(cauth);
  return uid;
}

async function as(email) {
  await signOut(cauth).catch(() => {});
  await signInWithEmailAndPassword(cauth, email, "password123");
  // Force-refresh so freshly-set custom claims are present on the token.
  await cauth.currentUser.getIdToken(true);
}

function record(label, shouldAllow, allowed, err) {
  if (allowed === shouldAllow) {
    pass++;
  } else {
    fail++;
    failures.push(
      `${label}: expected ${shouldAllow ? "ALLOW" : "DENY"} but was ${allowed ? "ALLOWED" : "DENIED"}` +
        (err ? ` — ${err}` : "")
    );
  }
}

async function expect(label, path, shouldAllow) {
  try {
    await getDoc(doc(cdb, path));
    record(label, shouldAllow, true);
  } catch (e) {
    const denied = String(e?.code || e).includes("permission-denied");
    record(label, shouldAllow, !denied, e?.code || e);
  }
}

// Test a collection QUERY (list op) — rules evaluate these differently
// from single-doc gets, and the live client uses queries for the
// dashboard class list, the per-class pupil list, and conversations.
async function expectQuery(label, q, shouldAllow) {
  try {
    await getDocs(q);
    record(label, shouldAllow, true);
  } catch (e) {
    const denied = String(e?.code || e).includes("permission-denied");
    record(label, shouldAllow, !denied, e?.code || e);
  }
}

async function main() {
  // 1. Users first (so seeded classes can reference real uids).
  const teacherA = await mkUser("teacherA@chrischowen.com", { role: "teacher" });
  const teacherB = await mkUser("teacherB@chrischowen.com", { role: "teacher" });
  const pupilA = await mkUser("pupilA@example.com", null); // no teacher claim

  // 2. Seed Firestore via admin (bypasses rules).
  await adb.doc(`teachers/${teacherA}`).set({ email: "teacherA@chrischowen.com", displayName: "A" });
  await adb.doc(`teachers/${teacherB}`).set({ email: "teacherB@chrischowen.com", displayName: "B" });
  await adb.doc("classes/classA").set({ teacherId: teacherA, name: "Y8 A" });
  await adb.doc("classes/classB").set({ teacherId: teacherB, name: "Y8 B" });
  await adb.doc(`pupils/${pupilA}`).set({ classId: "classA", displayName: "Alex" });
  await adb.doc(`conversations/classA_${pupilA}/messages/m1`).set({ role: "pupil", content: "hi", timestamp: Date.now() });
  await adb.doc("safeguardingEvents/s1").set({ classId: "classA", severity: "high" });
  await adb.doc("engagementSnapshots/e1").set({ classId: "classA", state: "flowing" });

  // 3. Teacher A (owner of classA). Includes the exact QUERY shapes the
  // live client issues (classes.ts dashboard list, ClassesPanel pupil
  // list, conversation.ts message history) — these must still work.
  await as("teacherA@chrischowen.com");
  await expect("teacherA reads own class", "classes/classA", true);
  await expect("teacherA reads other's class", "classes/classB", false);
  await expect("teacherA reads own teacher doc", `teachers/${teacherA}`, true);
  await expect("teacherA reads OTHER teacher doc (PII)", `teachers/${teacherB}`, false);
  await expect("teacherA reads own class pupil", `pupils/${pupilA}`, true);
  await expect("teacherA reads own class conversation", `conversations/classA_${pupilA}/messages/m1`, true);
  await expect("teacherA reads safeguardingEvent (server-only)", "safeguardingEvents/s1", false);
  await expect("teacherA reads engagementSnapshot (server-only)", "engagementSnapshots/e1", false);
  // Live query shapes:
  await expectQuery(
    "teacherA dashboard class query (where teacherId==self)",
    query(collection(cdb, "classes"), where("teacherId", "==", teacherA), orderBy("createdAt", "desc")),
    true
  );
  await expectQuery(
    "teacherA pupil list query (where classId==ownClass)",
    query(collection(cdb, "pupils"), where("classId", "==", "classA")),
    true
  );
  await expectQuery(
    "teacherA conversation messages query (orderBy timestamp)",
    query(collection(cdb, "conversations", `classA_${pupilA}`, "messages"), orderBy("timestamp", "desc"), limit(12)),
    true
  );

  // 4. Teacher B (does NOT own classA).
  await as("teacherB@chrischowen.com");
  await expect("teacherB reads other's class pupil", `pupils/${pupilA}`, false);
  await expect("teacherB reads other's conversation", `conversations/classA_${pupilA}/messages/m1`, false);

  // 5. Pupil A (enrolled in classA).
  await as("pupilA@example.com");
  await expect("pupilA reads own class", "classes/classA", true);
  await expect("pupilA reads other class", "classes/classB", false);
  await expect("pupilA reads own pupil doc", `pupils/${pupilA}`, true);
  await expect("pupilA reads safeguardingEvent (never)", "safeguardingEvents/s1", false);
  await expect("pupilA reads a teacher doc", `teachers/${teacherA}`, false);

  await signOut(cauth).catch(() => {});
  await clientDelete(client);
  await adminDelete(admin);

  console.log(`\nFirestore rules: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log("  ✗ " + f));
    process.exit(1);
  }
  console.log("✓ All rule scoping assertions hold.");
  process.exit(0);
}

main().catch((e) => {
  console.error("test-rules harness error:", e);
  process.exit(1);
});
