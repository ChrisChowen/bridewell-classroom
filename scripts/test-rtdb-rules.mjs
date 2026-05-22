#!/usr/bin/env node
//
// Realtime Database security-rules test — runs against the emulator.
//   npm run test:rtdb   (wraps: firebase emulators:exec --only database,auth)
//
// Proves the live-mirror leak is closed: a teacher reads only their own
// class's pupils; another teacher / a pupil cannot read the class's full
// pupil mirror (names + engagement + safeguarding); a pupil reads only
// their own entry; the name-free aggregate + status stay projector-
// readable. Uses firebase-admin (seed + claims) + firebase v12 client
// (reads) — no extra deps.

import { initializeApp as adminInit, deleteApp as adminDelete } from "firebase-admin/app";
import { getDatabase as adminDatabase } from "firebase-admin/database";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { initializeApp as clientInit, deleteApp as clientDelete } from "firebase/app";
import {
  getDatabase as clientDatabase,
  connectDatabaseEmulator,
  ref,
  get,
  remove,
} from "firebase/database";
import {
  getAuth as clientGetAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const PROJECT = "bridewell-classroom";
const DB_URL = `https://${PROJECT}-default-rtdb.europe-west1.firebasedatabase.app`;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const DB_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000";

const admin = adminInit({ projectId: PROJECT, databaseURL: DB_URL }, "admin-rtdb-test");
const adb = adminDatabase(admin);
const aauth = adminAuth(admin);

const client = clientInit({ apiKey: "emulator", projectId: PROJECT, databaseURL: DB_URL }, "client-rtdb-test");
const cdb = clientDatabase(client);
const cauth = clientGetAuth(client);
connectDatabaseEmulator(cdb, DB_HOST.split(":")[0], Number(DB_HOST.split(":")[1]));
connectAuthEmulator(cauth, `http://${AUTH_HOST}`, { disableWarnings: true });

let pass = 0;
let fail = 0;
const failures = [];

function record(label, shouldAllow, allowed, err) {
  if (allowed === shouldAllow) pass++;
  else {
    fail++;
    failures.push(`${label}: expected ${shouldAllow ? "ALLOW" : "DENY"} but was ${allowed ? "ALLOWED" : "DENIED"}${err ? ` — ${err}` : ""}`);
  }
}

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
  await cauth.currentUser.getIdToken(true);
}

async function expectRead(label, path, shouldAllow) {
  try {
    await get(ref(cdb, path));
    record(label, shouldAllow, true);
  } catch (e) {
    const denied = /permission[_ ]denied/i.test(String(e?.message || e));
    record(label, shouldAllow, !denied, e?.message || e);
  }
}

async function expectRemove(label, path, shouldAllow) {
  try {
    await remove(ref(cdb, path));
    record(label, shouldAllow, true);
  } catch (e) {
    const denied = /permission[_ ]denied/i.test(String(e?.message || e));
    record(label, shouldAllow, !denied, e?.message || e);
  }
}

async function main() {
  const teacherA = await mkUser("teacherA@chrischowen.com", { role: "teacher" });
  const teacherB = await mkUser("teacherB@chrischowen.com", { role: "teacher" });
  const pupilA = await mkUser("pupilA@example.com", null);
  const pupilOther = await mkUser("pupilOther@example.com", null);

  // Seed the live mirror via admin (bypasses rules).
  await adb.ref("liveSessions/classA").set({
    meta: { teacherId: teacherA },
    status: { value: "active", ts: Date.now() },
    aggregate: { total: 2, counts: { flowing: 1 } },
    pupils: {
      [pupilA]: { displayName: "Alex", state: "flowing", safeguarding: { severity: "high", summary: "x" } },
      [pupilOther]: { displayName: "Sam", state: "wheel_spinning" },
    },
    interventions: {
      [pupilA]: { i1: { type: "hint", text: "try again", ts: Date.now() } },
    },
  });

  // Teacher A (owner).
  await as("teacherA@chrischowen.com");
  await expectRead("teacherA reads own class full pupils", "liveSessions/classA/pupils", true);
  await expectRead("teacherA reads own class interventions", "liveSessions/classA/interventions", true);

  // Teacher B (NOT owner) — the leak that must be closed.
  await as("teacherB@chrischowen.com");
  await expectRead("teacherB reads other class full pupils (LEAK)", "liveSessions/classA/pupils", false);
  await expectRead("teacherB reads other class interventions", "liveSessions/classA/interventions", false);

  // Pupil A (enrolled).
  await as("pupilA@example.com");
  await expectRead("pupilA reads whole pupils node", "liveSessions/classA/pupils", false);
  await expectRead("pupilA reads OWN pupil entry", `liveSessions/classA/pupils/${pupilA}`, true);
  await expectRead("pupilA reads ANOTHER pupil entry", `liveSessions/classA/pupils/${pupilOther}`, false);
  await expectRead("pupilA reads aggregate (projector data)", "liveSessions/classA/aggregate", true);
  await expectRead("pupilA reads status", "liveSessions/classA/status", true);
  await expectRead("pupilA reads OWN interventions", `liveSessions/classA/interventions/${pupilA}`, true);
  await expectRemove("pupilA acknowledges (removes) own intervention", `liveSessions/classA/interventions/${pupilA}/i1`, true);

  await signOut(cauth).catch(() => {});
  await clientDelete(client);
  await adminDelete(admin);

  console.log(`\nRTDB rules: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log("  ✗ " + f));
    process.exit(1);
  }
  console.log("✓ Live-mirror leak closed; legitimate reads intact.");
  process.exit(0);
}

main().catch((e) => {
  console.error("test-rtdb-rules harness error:", e);
  process.exit(1);
});
