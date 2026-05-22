// Learner-profile store — the admin-side bridge between persisted session
// evidence and the pure drift engine in learner-profile.ts. Server-only.
//
// Takes the admin Firestore handle (like pupil-data.ts) so it can run from
// the consolidate route AND be exercised directly against the emulator.
//
// It reads the evidence that accrued SINCE the last consolidation
// (timestamp > profile.updatedAt), aggregates it, folds it into the
// longitudinal profile, and persists learnerProfiles/{pupilId}. A
// consolidation with no new activity is a no-op (so a double-tapped
// "end lesson" can't pollute the trajectory with empty sessions).

import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { EngagementState } from "@/lib/brand";
import type { ChallengeLevel, LearnerProfile } from "@/types";
import { aggregateEvidence, foldSession } from "./learner-profile";

export interface ConsolidateInput {
  pupilId: string;
  classId: string;
  lessonTitle: string;
  // Lesson-wide default — the starting pitch for a pupil we've not seen.
  lessonLevel: ChallengeLevel;
  displayName?: string;
  // Optional LLM-written teacher-facing narrative (never shown to pupils).
  narrative?: string;
  // Injectable clock for deterministic tests.
  now?: number;
}

export interface ConsolidateResult {
  written: boolean;
  reason?: string;
  profile: LearnerProfile | null;
}

export async function consolidateLearnerProfile(
  db: Firestore,
  input: ConsolidateInput,
): Promise<ConsolidateResult> {
  const now = input.now ?? Date.now();
  const profileRef = db.collection("learnerProfiles").doc(input.pupilId);
  const prevSnap = await profileRef.get();
  const prev = prevSnap.exists ? (prevSnap.data() as LearnerProfile) : null;
  const since = prev?.updatedAt ?? 0;

  // Engagement snapshots for this pupil, scoped to new-since-last-consolidation.
  const snapDocs = await db
    .collection("engagementSnapshots")
    .where("pupilId", "==", input.pupilId)
    .get();
  const engagement = snapDocs.docs
    .map((d) => d.data() as { state: EngagementState; confidence: number; timestamp: number; sessionId?: string })
    .filter((s) => (s.timestamp ?? 0) > since && (!s.sessionId || s.sessionId === input.classId))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((s) => ({ state: s.state, confidence: s.confidence }));

  // Reason events with a landed confidence (answered), new-since-last.
  const reasonDocs = await db
    .collection("reasonEvents")
    .where("pupilId", "==", input.pupilId)
    .get();
  const reasonConfidences = reasonDocs.docs
    .map((d) => d.data() as { confidence?: number; timestamp: number; classId?: string })
    .filter(
      (r) =>
        (r.timestamp ?? 0) > since &&
        typeof r.confidence === "number" &&
        (!r.classId || r.classId === input.classId),
    )
    .map((r) => r.confidence as number);

  // Conversation: pupil turn count + scaffold presses, new-since-last.
  const msgDocs = await db
    .collection("conversations")
    .doc(`${input.classId}_${input.pupilId}`)
    .collection("messages")
    .get();
  let messageCount = 0;
  let scaffoldPresses = 0;
  for (const d of msgDocs.docs) {
    const m = d.data() as { role: string; timestamp: number; meta?: { scaffoldAction?: string } | null };
    if ((m.timestamp ?? 0) <= since) continue;
    if (m.role === "pupil") messageCount += 1;
    if (m.meta?.scaffoldAction) scaffoldPresses += 1;
  }

  // Nothing new happened — don't append an empty session.
  if (messageCount === 0 && engagement.length === 0 && reasonConfidences.length === 0) {
    return { written: false, reason: "no new activity since last consolidation", profile: prev };
  }

  const evidence = aggregateEvidence({
    sessionId: input.classId,
    timestamp: now,
    lessonTitle: input.lessonTitle,
    messageCount,
    engagement,
    reasonConfidences,
    scaffoldPresses,
  });

  const next = foldSession(
    prev,
    evidence,
    {
      pupilId: input.pupilId,
      classId: input.classId,
      displayName: input.displayName,
      lessonLevel: input.lessonLevel,
    },
    input.narrative,
  );

  await profileRef.set(next, { merge: false });
  return { written: true, profile: next };
}

// Read the pupil's effective challenge level, falling back to the
// lesson-wide default if we've never profiled them. Used by /api/pupils/me
// so the tutor inherits the drifted, per-pupil pitch.
export async function getEffectiveChallengeLevel(
  db: Firestore,
  pupilId: string,
  lessonLevel: ChallengeLevel,
): Promise<ChallengeLevel> {
  const snap = await db.collection("learnerProfiles").doc(pupilId).get();
  if (!snap.exists) return lessonLevel;
  const p = snap.data() as LearnerProfile;
  return p.challengeLevel ?? lessonLevel;
}
