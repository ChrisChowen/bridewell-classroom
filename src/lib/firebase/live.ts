"use client";

import { ref, onValue, off, push, set, remove } from "firebase/database";
import { getFirebase } from "./client";
import type { EngagementState } from "@/lib/brand";

export type SessionStatusValue = "active" | "paused" | "wrap_up" | "ended";

export interface SessionStatus {
  value: SessionStatusValue;
  ts: number;
  wrapUpNote?: string | null;
}

export interface Intervention {
  type: "hint" | "mode_one_turn" | "pair_up" | "pause";
  text?: string | null;
  rationale?: string | null;
  pairWith?: string | null;
  ts: number;
}

// Realtime Database client helpers. Single source for live class state
// subscriptions so component code doesn't reach into the SDK directly.

export interface LivePupil {
  pupilId: string;
  displayName: string;
  state: EngagementState;
  confidence: number;
  rationale?: string;
  cues?: string[];
  lastActive: number;
  trajectory: Array<{ state: EngagementState; t: number; confidence: number }>;
  lastPupilExcerpt?: string | null;
  scaffoldUsesRecent?: number;
  safeguarding?: {
    severity: "low" | "medium" | "high";
    summary: string;
    pupilExcerpt?: string | null;
    ts: number;
  } | null;
}

export interface LiveClass {
  pupils: Record<string, LivePupil>;
}

export function subscribeToLiveClass(
  classId: string,
  onUpdate: (live: LiveClass) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) {
    return () => {};
  }
  const r = ref(fb.rtdb, `liveSessions/${classId}/pupils`);
  const listener = onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, LivePupil>;
    onUpdate({ pupils: val });
  });
  return () => off(r, "value", listener);
}

export function subscribeToSessionStatus(
  classId: string,
  onUpdate: (status: SessionStatus | null) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return () => {};
  const r = ref(fb.rtdb, `liveSessions/${classId}/status`);
  const listener = onValue(r, (snap) => onUpdate(snap.val() as SessionStatus | null));
  return () => off(r, "value", listener);
}

export function subscribeToPupilInterventions(
  classId: string,
  pupilId: string,
  onNew: (intervention: Intervention & { id: string }) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return () => {};
  const r = ref(fb.rtdb, `liveSessions/${classId}/interventions/${pupilId}`);
  const seen = new Set<string>();
  const listener = onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Intervention>;
    for (const [id, intervention] of Object.entries(val)) {
      if (seen.has(id)) continue;
      seen.add(id);
      onNew({ id, ...intervention });
    }
  });
  return () => off(r, "value", listener);
}

export async function acknowledgeIntervention(
  classId: string,
  pupilId: string,
  interventionId: string
) {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return;
  // Mark consumed so a refresh doesn't replay. We just remove the
  // intervention node; the audit trail lives in Firestore.
  await remove(ref(fb.rtdb, `liveSessions/${classId}/interventions/${pupilId}/${interventionId}`));
}

// Re-exports so callers don't reach into firebase/database directly.
export { ref, push, set };
