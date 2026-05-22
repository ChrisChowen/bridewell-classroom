// Longitudinal learner profile + adaptive per-pupil difficulty.
//
// PURE logic only — no Firebase, no LLM. The store layer
// (learner-profile-store.ts) reads the persisted session evidence and
// calls these functions; the consolidate route writes the result.
//
// The contribution this file encodes: a pupil's effective `challengeLevel`
// drifts on real, multi-signal evidence rather than staying pinned to the
// lesson-wide default. The drift is deliberately GENTLE and resists noise:
//   - at most ONE step per session (foundation ↔ core ↔ stretch),
//   - it moves only when at least TWO of three independent signals agree
//     (hysteresis — a single noisy session can't whipsaw a pupil's pitch),
//   - it holds when the session is too thin to be evidence.
//
// Guardrail alignment: difficulty is teacher-visible, never labelled to the
// pupil, and the teacher can always override (the lesson plan's level wins
// if the teacher re-pitches the class). We surface a pattern, not a verdict.

import type {
  ChallengeLevel,
  EngagementState,
  LearnerProfile,
  LearnerSessionRecord,
} from "@/types";

export const CHALLENGE_ORDER: ChallengeLevel[] = ["foundation", "core", "stretch"];

// Engagement states that count as evidence the pupil can take more
// challenge vs. evidence they need less. `off_task` is excluded from the
// "down" set because it's a behaviour signal, not a difficulty signal —
// dropping a struggling-but-bored pupil down a level is the wrong move.
const UP_STATES: ReadonlySet<EngagementState> = new Set<EngagementState>([
  "flowing",
  "productive_struggle",
]);
const DOWN_STATES: ReadonlySet<EngagementState> = new Set<EngagementState>([
  "wheel_spinning",
  "disengaged",
]);

// Tunable thresholds. Kept here, named, so the calibration is one edit and
// the eval harness can reference the same constants.
export const DRIFT_THRESHOLDS = {
  // Reason evaluator confidence (0..1).
  reasonHigh: 0.7,
  reasonLow: 0.4,
  // Scaffold presses in a session: at-or-below = self-reliant (+1),
  // at-or-above = leaning hard on scaffolds (−1).
  scaffoldLow: 1,
  scaffoldHigh: 4,
  // Minimum pupil turns before a session counts as evidence at all.
  minMessages: 4,
  // |score| needed to move a step (>=2 ⇒ two signals must agree).
  moveAt: 2,
} as const;

export interface SessionEvidence {
  sessionId: string;
  timestamp: number;
  lessonTitle: string;
  messageCount: number; // pupil turns in the session
  // Aggregated engagement across the session's snapshots.
  dominantState: EngagementState | null;
  avgEngagementConfidence: number | null;
  // Reason evaluator confidences this session (already filtered to this
  // pupil/session); empty if Reason never fired.
  avgReasonConfidence: number | null;
  reasonEventCount: number;
  // Total scaffold presses this session.
  scaffoldPresses: number;
}

export interface DriftDecision {
  next: ChallengeLevel;
  delta: -1 | 0 | 1;
  score: number; // signed sum of the three signals
  rationale: string;
}

function step(level: ChallengeLevel, delta: -1 | 0 | 1): ChallengeLevel {
  const i = CHALLENGE_ORDER.indexOf(level);
  const j = Math.min(CHALLENGE_ORDER.length - 1, Math.max(0, i + delta));
  return CHALLENGE_ORDER[j];
}

// The core adaptive-difficulty decision. Pure, deterministic, explainable.
export function decideDrift(
  current: ChallengeLevel,
  ev: SessionEvidence,
): DriftDecision {
  const t = DRIFT_THRESHOLDS;

  // Too little happened to read anything into it — hold.
  const hasSignal =
    ev.dominantState !== null || ev.reasonEventCount > 0 || ev.messageCount >= t.minMessages;
  if (ev.messageCount < t.minMessages || !hasSignal) {
    return {
      next: current,
      delta: 0,
      score: 0,
      rationale: "Not enough of the session to read — holding the current pitch.",
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // Signal 1 — Reason confidence.
  if (ev.reasonEventCount > 0 && ev.avgReasonConfidence !== null) {
    if (ev.avgReasonConfidence >= t.reasonHigh) {
      score += 1;
      reasons.push("strong Reason responses");
    } else if (ev.avgReasonConfidence <= t.reasonLow) {
      score -= 1;
      reasons.push("thin Reason responses");
    }
  }

  // Signal 2 — dominant engagement state.
  if (ev.dominantState && UP_STATES.has(ev.dominantState)) {
    score += 1;
    reasons.push(`mostly ${ev.dominantState.replace("_", " ")}`);
  } else if (ev.dominantState && DOWN_STATES.has(ev.dominantState)) {
    score -= 1;
    reasons.push(`mostly ${ev.dominantState.replace("_", " ")}`);
  }

  // Signal 3 — scaffold reliance.
  if (ev.scaffoldPresses <= t.scaffoldLow) {
    score += 1;
    reasons.push("little reliance on scaffolds");
  } else if (ev.scaffoldPresses >= t.scaffoldHigh) {
    score -= 1;
    reasons.push("heavy reliance on scaffolds");
  }

  let delta: -1 | 0 | 1 = 0;
  if (score >= t.moveAt) delta = 1;
  else if (score <= -t.moveAt) delta = -1;

  const next = step(current, delta);
  let rationale: string;
  if (next === current) {
    rationale =
      delta === 0
        ? `Mixed or insufficient signal (${reasons.join(", ") || "no clear signal"}) — holding at ${current}.`
        : `Already at ${current}; ${reasons.join(", ")}.`;
  } else {
    rationale = `${reasons.join(", ")} → ${delta > 0 ? "raising" : "easing"} to ${next}.`;
  }

  return { next, delta, score, rationale };
}

// Build the per-session record (the trajectory entry) from evidence + the
// before/after levels.
export function toSessionRecord(
  ev: SessionEvidence,
  before: ChallengeLevel,
  after: ChallengeLevel,
): LearnerSessionRecord {
  return {
    sessionId: ev.sessionId,
    timestamp: ev.timestamp,
    lessonTitle: ev.lessonTitle,
    messageCount: ev.messageCount,
    dominantState: ev.dominantState,
    avgEngagementConfidence: round2(ev.avgEngagementConfidence),
    avgReasonConfidence: round2(ev.avgReasonConfidence),
    reasonEventCount: ev.reasonEventCount,
    scaffoldPresses: ev.scaffoldPresses,
    challengeBefore: before,
    challengeAfter: after,
  };
}

// How many session records to retain on the profile. Enough for a
// term-long trajectory in the drill-down without unbounded growth.
export const MAX_SESSIONS_RETAINED = 40;

// Fold one session's evidence into the (possibly absent) profile. Pure:
// returns the next profile; the store persists it. `lessonLevel` is the
// lesson-wide default — used as the starting pitch for a pupil we've never
// seen, so a brand-new pupil inherits the teacher's class-level choice.
export function foldSession(
  prev: LearnerProfile | null,
  ev: SessionEvidence,
  identity: { pupilId: string; classId: string; displayName?: string; lessonLevel: ChallengeLevel },
  narrative?: string,
): LearnerProfile {
  const before: ChallengeLevel = prev?.challengeLevel ?? identity.lessonLevel;
  const decision = decideDrift(before, ev);
  const record = toSessionRecord(ev, before, decision.next);

  const sessions = [...(prev?.sessions ?? []), record].slice(-MAX_SESSIONS_RETAINED);

  // Optional fields are OMITTED when absent rather than set to undefined —
  // Firestore rejects undefined values.
  const displayName = identity.displayName ?? prev?.displayName;
  const nextNarrative = narrative ?? prev?.narrative;

  return {
    pupilId: identity.pupilId,
    classId: identity.classId,
    ...(displayName !== undefined ? { displayName } : {}),
    challengeLevel: decision.next,
    sessionsObserved: (prev?.sessionsObserved ?? 0) + 1,
    metrics: recomputeMetrics(sessions),
    ...(nextNarrative !== undefined ? { narrative: nextNarrative } : {}),
    sessions,
    createdAt: prev?.createdAt ?? ev.timestamp,
    updatedAt: ev.timestamp,
  };
}

// Rolling metrics across the retained sessions. Means ignore null entries
// (sessions where that signal never fired).
function recomputeMetrics(sessions: LearnerSessionRecord[]): LearnerProfile["metrics"] {
  const reasonVals = sessions
    .map((s) => s.avgReasonConfidence)
    .filter((v): v is number => v !== null);
  const avgReasonConfidence = reasonVals.length
    ? round2(reasonVals.reduce((a, b) => a + b, 0) / reasonVals.length)
    : null;

  const avgScaffoldPresses = sessions.length
    ? round2(sessions.reduce((a, s) => a + s.scaffoldPresses, 0) / sessions.length)
    : null;

  // Rank dominant states by frequency across sessions.
  const counts = new Map<EngagementState, number>();
  for (const s of sessions) {
    if (s.dominantState) counts.set(s.dominantState, (counts.get(s.dominantState) ?? 0) + 1);
  }
  const dominantStates = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([state]) => state);

  return {
    avgReasonConfidence,
    avgScaffoldPresses,
    dominantStates,
    lastUpdated: sessions.at(-1)?.timestamp ?? Date.now(),
  };
}

// Aggregate raw signal arrays into SessionEvidence. The store passes the
// already-loaded snapshots / reason confidences / scaffold count; this keeps
// the aggregation pure and unit-testable.
export function aggregateEvidence(input: {
  sessionId: string;
  timestamp: number;
  lessonTitle: string;
  messageCount: number;
  engagement: Array<{ state: EngagementState; confidence: number }>;
  reasonConfidences: number[];
  scaffoldPresses: number;
}): SessionEvidence {
  const { engagement, reasonConfidences } = input;

  // Dominant state = most frequent; ties broken by the more recent (last wins
  // because snapshots arrive in time order).
  let dominantState: EngagementState | null = null;
  let avgEngagementConfidence: number | null = null;
  if (engagement.length) {
    const counts = new Map<EngagementState, number>();
    for (const s of engagement) counts.set(s.state, (counts.get(s.state) ?? 0) + 1);
    let best = -1;
    for (const s of engagement) {
      const c = counts.get(s.state)!;
      if (c >= best) {
        best = c;
        dominantState = s.state;
      }
    }
    avgEngagementConfidence =
      engagement.reduce((a, s) => a + s.confidence, 0) / engagement.length;
  }

  const avgReasonConfidence = reasonConfidences.length
    ? reasonConfidences.reduce((a, b) => a + b, 0) / reasonConfidences.length
    : null;

  return {
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    lessonTitle: input.lessonTitle,
    messageCount: input.messageCount,
    dominantState,
    avgEngagementConfidence,
    avgReasonConfidence,
    reasonEventCount: reasonConfidences.length,
    scaffoldPresses: input.scaffoldPresses,
  };
}

function round2(v: number | null): number | null {
  if (v === null) return null;
  return Math.round(v * 100) / 100;
}
