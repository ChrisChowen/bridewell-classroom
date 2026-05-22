import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getDatabase, type Database } from "firebase-admin/database";
import { gatherPupilData, deletePupilData } from "./pupil-data";

// Runs against the Firestore + RTDB emulators (npm run test:emulator).
// Proves GDPR gather (Art. 15) + erasure (Art. 17): a pupil's data is
// fully exported, then fully deleted, while ANOTHER pupil's data is
// left untouched — the safety net for shipping the erasure path.

const PROJECT = "bridewell-classroom";
const CLASS = "classZ";
const TARGET = "pupilTarget";
const OTHER = "pupilOther";

let app: App;
let db: Firestore;
let rtdb: Database;

async function seed(pid: string) {
  await db.collection("pupils").doc(pid).set({ classId: CLASS, displayName: pid });
  await db
    .collection("conversations")
    .doc(`${CLASS}_${pid}`)
    .collection("messages")
    .doc("m1")
    .set({ role: "pupil", content: "secret " + pid, timestamp: Date.now() });
  await db.collection("engagementSnapshots").add({ pupilId: pid, classId: CLASS, state: "flowing" });
  await db.collection("reasonEvents").add({ pupilId: pid, classId: CLASS, branch: "accept" });
  await db.collection("safeguardingEvents").add({ pupilId: pid, classId: CLASS, severity: "low" });
  await db.collection("interventions").add({ pupilId: pid, classId: CLASS, type: "hint" });
  await db.collection("learnerProfiles").doc(pid).set({ summary: "profile " + pid });
  await rtdb.ref(`liveSessions/${CLASS}/pupils/${pid}`).set({ displayName: pid, state: "flowing" });
}

async function totalDocs(pid: string): Promise<number> {
  const pupil = (await db.collection("pupils").doc(pid).get()).exists ? 1 : 0;
  const msgs = (await db.collection("conversations").doc(`${CLASS}_${pid}`).collection("messages").get()).size;
  const snaps = (await db.collection("engagementSnapshots").where("pupilId", "==", pid).get()).size;
  const reasons = (await db.collection("reasonEvents").where("pupilId", "==", pid).get()).size;
  const safe = (await db.collection("safeguardingEvents").where("pupilId", "==", pid).get()).size;
  const intv = (await db.collection("interventions").where("pupilId", "==", pid).get()).size;
  const prof = (await db.collection("learnerProfiles").doc(pid).get()).exists ? 1 : 0;
  const rt = (await rtdb.ref(`liveSessions/${CLASS}/pupils/${pid}`).get()).exists() ? 1 : 0;
  return pupil + msgs + snaps + reasons + safe + intv + prof + rt;
}

beforeAll(async () => {
  app = initializeApp(
    { projectId: PROJECT, databaseURL: `https://${PROJECT}-default-rtdb.europe-west1.firebasedatabase.app` },
    "pupil-data-emulator-test"
  );
  db = getFirestore(app);
  rtdb = getDatabase(app);
  await seed(TARGET);
  await seed(OTHER);
});

afterAll(async () => {
  await deleteApp(app);
});

describe("gatherPupilData (GDPR Art. 15)", () => {
  it("returns the full data set for one pupil", async () => {
    const exp = await gatherPupilData(db, TARGET);
    expect(exp.pupil?.displayName).toBe(TARGET);
    expect(exp.classId).toBe(CLASS);
    expect(exp.conversation).toHaveLength(1);
    expect(exp.engagementSnapshots).toHaveLength(1);
    expect(exp.reasonEvents).toHaveLength(1);
    expect(exp.safeguardingEvents).toHaveLength(1);
    expect(exp.interventions).toHaveLength(1);
    expect(exp.learnerProfile?.summary).toBe("profile " + TARGET);
  });
});

describe("deletePupilData (GDPR Art. 17)", () => {
  it("erases the target pupil entirely and leaves others untouched", async () => {
    const manifest = await deletePupilData(db, rtdb, TARGET);
    expect(manifest.counts.pupil).toBe(1);
    expect(manifest.counts.conversationMessages).toBe(1);
    expect(manifest.counts.engagementSnapshots).toBe(1);

    expect(await totalDocs(TARGET)).toBe(0); // fully erased
    expect(await totalDocs(OTHER)).toBe(8); // isolation: other pupil intact
  });
});
