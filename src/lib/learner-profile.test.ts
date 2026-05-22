import { describe, it, expect } from "vitest";
import {
  decideDrift,
  foldSession,
  aggregateEvidence,
  toSessionRecord,
  CHALLENGE_ORDER,
  MAX_SESSIONS_RETAINED,
  type SessionEvidence,
} from "./learner-profile";
import type { ChallengeLevel, EngagementState } from "@/types";

function ev(partial: Partial<SessionEvidence> = {}): SessionEvidence {
  return {
    sessionId: "s1",
    timestamp: 1000,
    lessonTitle: "Photosynthesis",
    messageCount: 10,
    dominantState: null,
    avgEngagementConfidence: null,
    avgReasonConfidence: null,
    reasonEventCount: 0,
    scaffoldPresses: 2,
    ...partial,
  };
}

describe("decideDrift — gentleness & hysteresis", () => {
  it("holds when the session is too thin to be evidence", () => {
    const d = decideDrift("core", ev({ messageCount: 2, dominantState: "flowing" }));
    expect(d.delta).toBe(0);
    expect(d.next).toBe("core");
  });

  it("holds on a single positive signal (one signal is not enough)", () => {
    // Only the dominant-state signal is positive; scaffoldPresses=2 is neutral,
    // no Reason events. Score = +1 < moveAt.
    const d = decideDrift(
      "core",
      ev({ dominantState: "flowing", scaffoldPresses: 2, reasonEventCount: 0 }),
    );
    expect(d.score).toBe(1);
    expect(d.delta).toBe(0);
    expect(d.next).toBe("core");
  });

  it("raises one step when two signals agree (flowing + low scaffold)", () => {
    const d = decideDrift(
      "core",
      ev({ dominantState: "flowing", scaffoldPresses: 0 }),
    );
    expect(d.score).toBe(2);
    expect(d.delta).toBe(1);
    expect(d.next).toBe("stretch");
  });

  it("eases one step when two negative signals agree (wheel_spinning + heavy scaffold)", () => {
    const d = decideDrift(
      "core",
      ev({ dominantState: "wheel_spinning", scaffoldPresses: 5 }),
    );
    expect(d.score).toBe(-2);
    expect(d.delta).toBe(-1);
    expect(d.next).toBe("foundation");
  });

  it("moves at most one step even when all three signals agree", () => {
    const d = decideDrift(
      "foundation",
      ev({
        dominantState: "flowing",
        scaffoldPresses: 0,
        reasonEventCount: 3,
        avgReasonConfidence: 0.9,
      }),
    );
    expect(d.score).toBe(3);
    expect(d.next).toBe("core"); // one step up, not straight to stretch
  });

  it("clamps at the stretch ceiling", () => {
    const d = decideDrift(
      "stretch",
      ev({ dominantState: "flowing", scaffoldPresses: 0, reasonEventCount: 2, avgReasonConfidence: 0.85 }),
    );
    expect(d.next).toBe("stretch");
    expect(d.delta).toBe(1); // wanted to go up, but clamped
  });

  it("clamps at the foundation floor", () => {
    const d = decideDrift(
      "foundation",
      ev({ dominantState: "disengaged", scaffoldPresses: 6 }),
    );
    expect(d.next).toBe("foundation");
  });

  it("a high Reason + low Reason cancel against state to hold", () => {
    // disengaged (−1) but low scaffold (+1) and no Reason → score 0.
    const d = decideDrift("core", ev({ dominantState: "disengaged", scaffoldPresses: 0 }));
    expect(d.score).toBe(0);
    expect(d.next).toBe("core");
  });

  it("does not count off_task as a difficulty-down signal", () => {
    // off_task alone (behaviour, not difficulty) + neutral scaffold → no move.
    const d = decideDrift("core", ev({ dominantState: "off_task", scaffoldPresses: 2 }));
    expect(d.score).toBe(0);
    expect(d.next).toBe("core");
  });
});

describe("aggregateEvidence", () => {
  it("picks the most frequent engagement state and means the confidence", () => {
    const e = aggregateEvidence({
      sessionId: "s1",
      timestamp: 1,
      lessonTitle: "L",
      messageCount: 8,
      engagement: [
        { state: "flowing", confidence: 0.8 },
        { state: "wheel_spinning", confidence: 0.6 },
        { state: "flowing", confidence: 1.0 },
      ],
      reasonConfidences: [0.6, 0.8],
      scaffoldPresses: 3,
    });
    expect(e.dominantState).toBe("flowing");
    expect(e.avgEngagementConfidence).toBeCloseTo(0.8, 5);
    expect(e.avgReasonConfidence).toBeCloseTo(0.7, 5);
    expect(e.reasonEventCount).toBe(2);
  });

  it("returns nulls when no signals fired", () => {
    const e = aggregateEvidence({
      sessionId: "s1",
      timestamp: 1,
      lessonTitle: "L",
      messageCount: 0,
      engagement: [],
      reasonConfidences: [],
      scaffoldPresses: 0,
    });
    expect(e.dominantState).toBeNull();
    expect(e.avgReasonConfidence).toBeNull();
    expect(e.avgEngagementConfidence).toBeNull();
  });
});

describe("foldSession", () => {
  it("a brand-new pupil starts from the lesson-wide level", () => {
    const p = foldSession(null, ev({ dominantState: "flowing", scaffoldPresses: 0 }), {
      pupilId: "u1",
      classId: "c1",
      displayName: "Alex",
      lessonLevel: "foundation",
    });
    expect(p.sessionsObserved).toBe(1);
    expect(p.sessions[0].challengeBefore).toBe("foundation");
    expect(p.sessions[0].challengeAfter).toBe("core"); // drifted up one
    expect(p.challengeLevel).toBe("core");
    expect(p.createdAt).toBe(1000);
  });

  it("accumulates sessions and recomputes rolling metrics", () => {
    let p = foldSession(null, ev({ sessionId: "a", timestamp: 1, avgReasonConfidence: 0.6, reasonEventCount: 1, scaffoldPresses: 2 }), {
      pupilId: "u1",
      classId: "c1",
      lessonLevel: "core",
    });
    p = foldSession(p, ev({ sessionId: "b", timestamp: 2, avgReasonConfidence: 0.8, reasonEventCount: 1, scaffoldPresses: 4 }), {
      pupilId: "u1",
      classId: "c1",
      lessonLevel: "core",
    });
    expect(p.sessionsObserved).toBe(2);
    expect(p.sessions).toHaveLength(2);
    expect(p.metrics.avgReasonConfidence).toBeCloseTo(0.7, 5);
    expect(p.metrics.avgScaffoldPresses).toBeCloseTo(3, 5);
  });

  it("caps retained sessions at MAX_SESSIONS_RETAINED but keeps counting", () => {
    let p = foldSession(null, ev({ sessionId: "s0", timestamp: 0 }), {
      pupilId: "u1",
      classId: "c1",
      lessonLevel: "core",
    });
    for (let i = 1; i < MAX_SESSIONS_RETAINED + 5; i++) {
      p = foldSession(p, ev({ sessionId: "s" + i, timestamp: i }), {
        pupilId: "u1",
        classId: "c1",
        lessonLevel: "core",
      });
    }
    expect(p.sessions.length).toBe(MAX_SESSIONS_RETAINED);
    expect(p.sessionsObserved).toBe(MAX_SESSIONS_RETAINED + 5);
    // Oldest were dropped; newest retained.
    expect(p.sessions.at(-1)!.sessionId).toBe("s" + (MAX_SESSIONS_RETAINED + 4));
  });

  it("preserves an existing narrative when none is supplied this session", () => {
    let p = foldSession(null, ev(), { pupilId: "u1", classId: "c1", lessonLevel: "core" }, "First note.");
    expect(p.narrative).toBe("First note.");
    p = foldSession(p, ev({ sessionId: "s2", timestamp: 2 }), { pupilId: "u1", classId: "c1", lessonLevel: "core" });
    expect(p.narrative).toBe("First note."); // carried forward
  });
});

describe("toSessionRecord", () => {
  it("rounds confidences to 2dp and records before/after", () => {
    const r = toSessionRecord(
      ev({ avgReasonConfidence: 0.66666, avgEngagementConfidence: 0.33333 }),
      "core",
      "stretch",
    );
    expect(r.avgReasonConfidence).toBe(0.67);
    expect(r.avgEngagementConfidence).toBe(0.33);
    expect(r.challengeBefore).toBe("core");
    expect(r.challengeAfter).toBe("stretch");
  });
});

describe("CHALLENGE_ORDER invariant", () => {
  it("is foundation < core < stretch", () => {
    expect(CHALLENGE_ORDER).toEqual<ChallengeLevel[]>(["foundation", "core", "stretch"]);
  });
});

// Type-level sanity: EngagementState values used in tests are real.
const _states: EngagementState[] = ["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"];
void _states;
