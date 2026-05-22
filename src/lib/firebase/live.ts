"use client";

import { ref, onValue, off, push, set, remove, runTransaction } from "firebase/database";
import { getFirebase } from "./client";
import type { EngagementState } from "@/lib/brand";

// "not_started" is the default state of a fresh class: pupils can have
// joined and be sitting in the lobby, but the chat is locked until the
// teacher hits "Start class". Pupils see a calm overlay; the teacher
// gets a clear primary action.
export type SessionStatusValue = "not_started" | "active" | "paused" | "wrap_up" | "ended";

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
  // Step the pupil is currently inside, by index into the lesson plan's
  // `sequence`. Advances when the classifier sustains a high-confidence
  // engaged read across consecutive snapshots.
  currentStepIndex?: number;
  // Internal counter — consecutive snapshots at engaged + high
  // confidence. Resets to 0 on advance, and on any disengaged read.
  sustainedHighStreak?: number;
  // Optimistic between-snapshot signals — the pupil client bumps these
  // on every message so the dashboard shows movement before the next
  // classifier snapshot lands. Server overwrites them on snapshot.
  liveMessageCount?: number;
  lastMessageAt?: number;
  // True if the most recent classifier call fell back (LLM unavailable
  // or malformed JSON). Dashboard surfaces this as a degraded
  // indicator so the teacher knows the signal is not real.
  classifierFallback?: boolean;
  // Which classifier tier produced this snapshot ("flash" = cheap
  // first pass, "pro" = Pro tiebreaker or always-Pro for sensitive
  // turns). Lets the dashboard show provenance.
  classifierTier?: "flash" | "pro";
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

// A single nameless slot on the public `aggregate` node. This is the
// ONLY live data the classroom projector receives — it deliberately omits
// names, message excerpts, and safeguarding detail (see engagement/run).
export interface AggregatePupil {
  k: string;
  state: EngagementState;
  confidence: number;
  step: number;
  lastActive: number;
  concern: boolean;
}

// Projector subscription. Reads `liveSessions/{id}/aggregate`, which RTDB
// rules expose to any authed client (the projector signs in anonymously).
// The per-pupil node is teacher-scoped and intentionally NOT read here.
export function subscribeToLiveAggregate(
  classId: string,
  onUpdate: (rows: AggregatePupil[]) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return () => {};
  const r = ref(fb.rtdb, `liveSessions/${classId}/aggregate`);
  const listener = onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, AggregatePupil>;
    onUpdate(Object.values(val));
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

// Consumed-intervention ids persist in localStorage (capped) so a remount /
// strict-mode double-mount / pupil reconnect can't re-fire an intervention
// that was already delivered but whose RTDB `remove` hadn't yet landed.
function seenKey(classId: string, pupilId: string) {
  return `bw-seen-interventions-${classId}-${pupilId}`;
}
function loadSeen(classId: string, pupilId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(classId, pupilId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function persistSeen(classId: string, pupilId: string, seen: Set<string>) {
  try {
    // Keep only the most recent 100 ids — interventions are few per lesson.
    localStorage.setItem(seenKey(classId, pupilId), JSON.stringify([...seen].slice(-100)));
  } catch {
    /* private mode / quota — in-memory dedup still applies this session */
  }
}

export function subscribeToPupilInterventions(
  classId: string,
  pupilId: string,
  onNew: (intervention: Intervention & { id: string }) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return () => {};
  const r = ref(fb.rtdb, `liveSessions/${classId}/interventions/${pupilId}`);
  const seen = loadSeen(classId, pupilId);
  const listener = onValue(r, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Intervention>;
    for (const [id, intervention] of Object.entries(val)) {
      if (seen.has(id)) continue;
      seen.add(id);
      persistSeen(classId, pupilId, seen);
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

// Subscribe to a single pupil's live entry — used by the pupil's own
// session to read currentStepIndex (set by the engagement-run route as
// the classifier advances them through the plan).
export function subscribeToPupilSelf(
  classId: string,
  pupilId: string,
  onUpdate: (live: Partial<LivePupil> | null) => void
): () => void {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return () => {};
  const r = ref(fb.rtdb, `liveSessions/${classId}/pupils/${pupilId}`);
  const listener = onValue(r, (snap) => onUpdate(snap.val() as Partial<LivePupil> | null));
  return () => off(r, "value", listener);
}

// Optimistic per-message bump. The pupil client calls this every time
// they send a message so the dashboard cards move between classifier
// snapshots. We only touch the two fields the dashboard reads as a
// "movement" hint — we do not synthesise an engagement state, which
// would otherwise risk masking the real classifier signal.
export async function bumpPupilLiveMessage(classId: string, pupilId: string) {
  const fb = getFirebase();
  if (!fb.ready || !fb.rtdb) return;
  // Write ONLY the two optimistic leaves — never the whole node. The
  // classifier-owned fields (state, confidence, safeguarding, …) are
  // server-written via the admin SDK; a client transaction over the full
  // node would let a pupil overwrite their own engagement state or clear
  // a safeguarding flag. The RTDB rules are tightened to permit pupil
  // writes to these two leaves only, so a full-node write is also denied
  // at the rules layer (defence in depth).
  const base = `liveSessions/${classId}/pupils/${pupilId}`;
  try {
    await runTransaction(ref(fb.rtdb, `${base}/liveMessageCount`), (n) =>
      ((n as number | null) ?? 0) + 1
    );
    await set(ref(fb.rtdb, `${base}/lastMessageAt`), Date.now());
  } catch {
    /* non-fatal — the next classifier snapshot will resync */
  }
}

// Re-exports so callers don't reach into firebase/database directly.
export { ref, push, set };
