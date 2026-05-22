// Pupil data lifecycle — GDPR subject access (Art. 15) + erasure (Art.
// 17). Server-only. Both functions take the admin Firestore + RTDB
// handles so they can be called from authed API routes AND exercised
// directly against the emulator in tests (the test is the safety net
// that proves erasure removes ONLY the target pupil's data).
//
// A pupil's data lives across:
//   Firestore: pupils/{uid}, conversations/{classId}_{uid}/messages/*,
//     engagementSnapshots|reasonEvents|safeguardingEvents|interventions
//     where pupilId == uid, learnerProfiles/{uid}
//   RTDB: liveSessions/{classId}/pupils/{uid},
//     liveSessions/{classId}/interventions/{uid}

import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { Database } from "firebase-admin/database";
import { anonKey } from "@/lib/live-keys";

export interface PupilDataExport {
  pupilId: string;
  classId: string;
  exportedAt: number;
  pupil: Record<string, unknown> | null;
  conversation: Array<Record<string, unknown>>;
  engagementSnapshots: Array<Record<string, unknown>>;
  reasonEvents: Array<Record<string, unknown>>;
  safeguardingEvents: Array<Record<string, unknown>>;
  interventions: Array<Record<string, unknown>>;
  learnerProfile: Record<string, unknown> | null;
}

export interface PupilDeletionManifest {
  pupilId: string;
  classId: string;
  deletedAt: number;
  counts: {
    pupil: number;
    conversationMessages: number;
    engagementSnapshots: number;
    reasonEvents: number;
    safeguardingEvents: number;
    interventions: number;
    learnerProfile: number;
    rtdbNodes: number;
  };
}

const PUPIL_COLLECTIONS = [
  "engagementSnapshots",
  "reasonEvents",
  "safeguardingEvents",
  "interventions",
] as const;

/** GDPR Art. 15 — gather everything held about one pupil. Read-only. */
export async function gatherPupilData(
  db: Firestore,
  pupilId: string
): Promise<PupilDataExport> {
  const pupilSnap = await db.collection("pupils").doc(pupilId).get();
  const pupil = pupilSnap.exists ? (pupilSnap.data() as Record<string, unknown>) : null;
  const classId = (pupil?.classId as string) ?? "";

  const out: PupilDataExport = {
    pupilId,
    classId,
    exportedAt: Date.now(),
    pupil,
    conversation: [],
    engagementSnapshots: [],
    reasonEvents: [],
    safeguardingEvents: [],
    interventions: [],
    learnerProfile: null,
  };

  if (classId) {
    const msgs = await db
      .collection("conversations")
      .doc(`${classId}_${pupilId}`)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get()
      .catch(() => null);
    if (msgs) out.conversation = msgs.docs.map((d) => d.data());
  }

  const [snaps, reasons, safeguard, interventions] = await Promise.all(
    PUPIL_COLLECTIONS.map((c) => db.collection(c).where("pupilId", "==", pupilId).get())
  );
  out.engagementSnapshots = snaps.docs.map((d) => d.data());
  out.reasonEvents = reasons.docs.map((d) => d.data());
  out.safeguardingEvents = safeguard.docs.map((d) => d.data());
  out.interventions = interventions.docs.map((d) => d.data());

  const profileSnap = await db.collection("learnerProfiles").doc(pupilId).get();
  out.learnerProfile = profileSnap.exists ? (profileSnap.data() as Record<string, unknown>) : null;

  return out;
}

/**
 * GDPR Art. 17 — erase everything held about one pupil. Destructive.
 * Caller MUST have already verified authorisation (teacher owns the
 * pupil's class). Returns a manifest of what was removed.
 */
export async function deletePupilData(
  db: Firestore,
  rtdb: Database,
  pupilId: string
): Promise<PupilDeletionManifest> {
  const pupilSnap = await db.collection("pupils").doc(pupilId).get();
  const classId = (pupilSnap.data()?.classId as string) ?? "";

  const counts: PupilDeletionManifest["counts"] = {
    pupil: 0,
    conversationMessages: 0,
    engagementSnapshots: 0,
    reasonEvents: 0,
    safeguardingEvents: 0,
    interventions: 0,
    learnerProfile: 0,
    rtdbNodes: 0,
  };

  // Conversation messages (subcollection) + parent doc.
  if (classId) {
    const convRef = db.collection("conversations").doc(`${classId}_${pupilId}`);
    const msgs = await convRef.collection("messages").get();
    counts.conversationMessages = msgs.size;
    await Promise.all(msgs.docs.map((d) => d.ref.delete()));
    await convRef.delete().catch(() => {});
  }

  // pupilId-keyed analytics + safeguarding collections.
  const collKeys = {
    engagementSnapshots: "engagementSnapshots",
    reasonEvents: "reasonEvents",
    safeguardingEvents: "safeguardingEvents",
    interventions: "interventions",
  } as const;
  for (const [countKey, coll] of Object.entries(collKeys)) {
    const snap = await db.collection(coll).where("pupilId", "==", pupilId).get();
    counts[countKey as keyof typeof counts] = snap.size;
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }

  // learnerProfile + the pupil doc itself.
  const profileRef = db.collection("learnerProfiles").doc(pupilId);
  if ((await profileRef.get()).exists) {
    counts.learnerProfile = 1;
    await profileRef.delete();
  }
  if (pupilSnap.exists) {
    counts.pupil = 1;
    await db.collection("pupils").doc(pupilId).delete();
  }

  // RTDB live entries — the per-pupil node, the pupil's intervention queue,
  // AND the names-stripped projector aggregate slot (keyed by the same
  // non-reversible UID hash the classifier writes). Missing the aggregate
  // slot would leave an orphaned, UID-derived record after erasure.
  if (classId) {
    await rtdb.ref(`liveSessions/${classId}/pupils/${pupilId}`).remove().catch(() => {});
    await rtdb.ref(`liveSessions/${classId}/interventions/${pupilId}`).remove().catch(() => {});
    await rtdb.ref(`liveSessions/${classId}/aggregate/${anonKey(pupilId)}`).remove().catch(() => {});
    counts.rtdbNodes = 3;
  }

  return { pupilId, classId, deletedAt: Date.now(), counts };
}
