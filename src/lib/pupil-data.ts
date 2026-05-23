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

// Brief item N — gather a whole class's analytic events for the anonymised
// research export. Read-only. Returns the raw (still-identified) rows; the
// pure `buildResearchExport` pseudonymises + escapes them. Caller MUST have
// verified the teacher owns the class.
export interface ClassResearchData {
  participants: Array<{ uid: string; challengeLevel?: string; sessionsObserved?: number }>;
  engagement: Array<{ uid: string; timestamp: number; state: string; confidence: number; tier?: string; fallback?: boolean }>;
  reason: Array<{ uid: string; timestamp: number; promptType: string; confidence: number; branch: string }>;
  scaffolding: Array<{ uid: string; timestamp: number; action: string }>;
  interventions: Array<{ uid?: string | null; timestamp: number; type: string }>;
}

export async function gatherClassResearchData(
  db: Firestore,
  classId: string
): Promise<ClassResearchData> {
  const pupilsSnap = await db.collection("pupils").where("classId", "==", classId).get();
  const pupilIds = pupilsSnap.docs.map((d) => d.id);

  const profiles = await Promise.all(
    pupilIds.map((id) => db.collection("learnerProfiles").doc(id).get())
  );
  const profileById = new Map(
    profiles.map((p) => [p.id, p.exists ? (p.data() as Record<string, unknown>) : null])
  );

  const participants = pupilsSnap.docs.map((d) => {
    const prof = profileById.get(d.id);
    return {
      uid: d.id,
      challengeLevel: prof?.challengeLevel as string | undefined,
      sessionsObserved: prof?.sessionsObserved as number | undefined,
    };
  });

  const [engSnap, reaSnap, intSnap] = await Promise.all([
    db.collection("engagementSnapshots").where("sessionId", "==", classId).get(),
    db.collection("reasonEvents").where("classId", "==", classId).get(),
    db.collection("interventions").where("classId", "==", classId).get(),
  ]);

  const engagement = engSnap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      uid: x.pupilId as string,
      timestamp: x.timestamp as number,
      state: x.state as string,
      confidence: x.confidence as number,
      tier: x.classifierTier as string | undefined,
      fallback: x.classifierFallback as boolean | undefined,
    };
  });

  const reason = reaSnap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      uid: x.pupilId as string,
      timestamp: x.timestamp as number,
      promptType: x.promptType as string,
      confidence: x.confidence as number,
      branch: x.branch as string,
    };
  });

  const interventions = intSnap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      uid: (x.pupilId as string | null) ?? null,
      timestamp: x.timestamp as number,
      type: x.type as string,
    };
  });

  // Scaffold presses live in the conversation transcript as message metadata
  // (meta.scaffoldAction); read each participant's transcript and extract them.
  const scaffolding: ClassResearchData["scaffolding"] = [];
  await Promise.all(
    pupilIds.map(async (uid) => {
      const msgs = await db
        .collection("conversations")
        .doc(`${classId}_${uid}`)
        .collection("messages")
        .get()
        .catch(() => null);
      if (!msgs) return;
      for (const m of msgs.docs) {
        const x = m.data() as Record<string, unknown>;
        const action = (x.meta as Record<string, unknown> | undefined)?.scaffoldAction as
          | string
          | undefined;
        if (action) scaffolding.push({ uid, timestamp: x.timestamp as number, action });
      }
    })
  );

  return { participants, engagement, reason, scaffolding, interventions };
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
