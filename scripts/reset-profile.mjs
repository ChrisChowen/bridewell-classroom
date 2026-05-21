#!/usr/bin/env node
//
// Hard-reset a teacher's data on the live Firebase project.
//
// Resolves the auth user by email, then deletes everything tied to
// that uid:
//   - /teachers/{uid}
//   - /classes/{id} for every class they own
//   - /joinCodes/{code} for each deleted class
//   - /pupils where classId ∈ deleted classes
//   - /conversations/{classId__pupilId} for the affected pupils
//   - /engagementSnapshots where classId ∈ deleted classes
//   - /reasonEvents where classId ∈ deleted classes
//   - /interventions where classId ∈ deleted classes
//   - /lessonLibrary entries this teacher saved
//   - RTDB /liveSessions/{classId} for each deleted class
// Then deletes the Firebase Auth user. The teacher can re-register
// from a clean slate (assuming their email is still on the
// allowedTeacherEmails list — we don't touch that).
//
// USAGE
//   node scripts/reset-profile.mjs chris@chrischowen.com
//   node scripts/reset-profile.mjs --keep-auth chris@chrischowen.com
//
//   --keep-auth      Don't delete the Firebase Auth user — useful if
//                    you only want a data wipe.
//   --dry-run        Print what would be deleted without actually
//                    deleting.

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

const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const KEEP_AUTH = args.includes("--keep-auth");
const email = args.find((a) => a.includes("@"));

if (!email) {
  console.error("Usage: node scripts/reset-profile.mjs [--dry-run] [--keep-auth] <email>");
  process.exit(1);
}

console.log(`Reset target: ${email}`);
console.log(`Mode: ${DRY ? "DRY RUN" : "LIVE"} ${KEEP_AUTH ? "(auth retained)" : "(auth deleted)"}`);
console.log("");

// Look up the auth user.
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  console.error(`No auth user found for ${email}: ${err.message}`);
  process.exit(2);
}
console.log(`Auth user: ${user.uid}`);
console.log(`  display name: ${user.displayName ?? "(none)"}`);
console.log(`  role claim:   ${user.customClaims?.role ?? "(none)"}`);
console.log("");

async function maybeDelete(label, work) {
  console.log(`→ ${label}`);
  if (DRY) {
    console.log("  (dry-run — skipped)");
    return;
  }
  await work();
}

// Find every class this teacher owns.
const classesSnap = await db.collection("classes").where("teacherId", "==", user.uid).get();
const classIds = classesSnap.docs.map((d) => d.id);
const joinCodes = classesSnap.docs.map((d) => d.data().joinCode).filter(Boolean);
console.log(`Classes owned: ${classIds.length}`);
if (classIds.length) {
  for (const d of classesSnap.docs) {
    console.log(`  - ${d.id}  "${d.data().name ?? "(unnamed)"}" · joinCode ${d.data().joinCode ?? "(none)"}`);
  }
}
console.log("");

// Pupils who joined those classes.
const pupilDocs = [];
for (const cid of classIds) {
  const ps = await db.collection("pupils").where("classId", "==", cid).get();
  ps.docs.forEach((d) => pupilDocs.push(d));
}
console.log(`Pupils in those classes: ${pupilDocs.length}`);
console.log("");

// Engagement snapshots, Reason events, interventions, conversations
// touching these classes.
async function listAffected(collectionName) {
  if (!classIds.length) return [];
  // Firestore "in" supports up to 30 values; chunk if needed.
  const out = [];
  for (let i = 0; i < classIds.length; i += 30) {
    const chunk = classIds.slice(i, i + 30);
    const snap = await db.collection(collectionName).where("classId", "in", chunk).get();
    snap.docs.forEach((d) => out.push(d));
  }
  return out;
}

const snapshotsDocs = await listAffected("engagementSnapshots");
const reasonDocs = await listAffected("reasonEvents");
const interventionDocs = await listAffected("interventions");
const safeguardDocs = await listAffected("safeguardingEvents");
console.log(`engagementSnapshots:   ${snapshotsDocs.length}`);
console.log(`reasonEvents:          ${reasonDocs.length}`);
console.log(`interventions:         ${interventionDocs.length}`);
console.log(`safeguardingEvents:    ${safeguardDocs.length}`);

// Conversations are keyed by `${classId}__${pupilUid}`, with messages
// as a subcollection.
const conversationIds = [];
for (const cid of classIds) {
  const convs = await db.collection("conversations").where("classId", "==", cid).get();
  convs.docs.forEach((d) => conversationIds.push(d.id));
}
console.log(`conversations:         ${conversationIds.length}`);

// Lesson library entries saved by this teacher (sometimes there are
// none — saving is opt-in).
const lessonLib = await db.collection("lessonLibrary").where("savedBy", "==", user.uid).get();
console.log(`lessonLibrary saves:   ${lessonLib.size}`);
console.log("");

if (DRY) {
  console.log("DRY RUN — nothing was deleted. Drop --dry-run to do it for real.");
  process.exit(0);
}

// Bulk-delete using batched writes (500 ops per batch limit).
async function bulkDelete(docs) {
  let batch = db.batch();
  let ops = 0;
  for (const d of docs) {
    batch.delete(d.ref);
    ops += 1;
    if (ops === 480) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

await maybeDelete(`Delete /teachers/${user.uid}`, async () => {
  await db.collection("teachers").doc(user.uid).delete();
});

await maybeDelete(`Delete ${classIds.length} class docs`, async () => {
  await bulkDelete(classesSnap.docs);
});

await maybeDelete(`Delete ${joinCodes.length} joinCode docs`, async () => {
  let batch = db.batch();
  for (const code of joinCodes) {
    batch.delete(db.collection("joinCodes").doc(code));
  }
  await batch.commit();
});

await maybeDelete(`Delete ${pupilDocs.length} pupil docs`, async () => {
  await bulkDelete(pupilDocs);
});

await maybeDelete(`Delete ${snapshotsDocs.length} engagement snapshots`, async () => {
  await bulkDelete(snapshotsDocs);
});

await maybeDelete(`Delete ${reasonDocs.length} reason events`, async () => {
  await bulkDelete(reasonDocs);
});

await maybeDelete(`Delete ${interventionDocs.length} interventions`, async () => {
  await bulkDelete(interventionDocs);
});

await maybeDelete(`Delete ${safeguardDocs.length} safeguarding events`, async () => {
  await bulkDelete(safeguardDocs);
});

await maybeDelete(`Delete ${conversationIds.length} conversation docs (+ messages)`, async () => {
  for (const id of conversationIds) {
    // Delete messages subcollection first (recursiveDelete handles it).
    await db.recursiveDelete(db.collection("conversations").doc(id));
  }
});

await maybeDelete(`Delete ${lessonLib.size} lesson-library entries`, async () => {
  await bulkDelete(lessonLib.docs);
});

await maybeDelete(`Wipe RTDB /liveSessions for ${classIds.length} classes`, async () => {
  for (const cid of classIds) {
    await rtdb.ref(`liveSessions/${cid}`).remove();
  }
});

if (!KEEP_AUTH) {
  await maybeDelete(`Delete Firebase Auth user ${user.uid}`, async () => {
    await auth.deleteUser(user.uid);
  });
} else {
  console.log("→ Skipping auth deletion (--keep-auth set)");
}

console.log("");
console.log("✓ Reset complete.");
if (!KEEP_AUTH) {
  console.log(`  ${email} can re-register from /login as a fresh teacher.`);
} else {
  console.log(`  ${email} is still in Firebase Auth — but with no teacher doc, classes, or live state.`);
  console.log(`  Their next sign-in will land on /dashboard with zero classes; the API mints a new /teachers/{uid} doc on first action.`);
}

// Firebase Admin keeps an RTDB websocket open after work completes
// which prevents the script from exiting cleanly. Force exit so the
// CLI returns.
process.exit(0);
