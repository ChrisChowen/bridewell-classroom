import { describe, it, expect } from "vitest";
import { shouldFireReason, type TriggerWatchInput } from "./trigger";

// The trigger layer decides WHEN Reason fires. Getting this wrong is a
// pedagogical failure (probing at the wrong moment) so the precedence
// and thresholds are pinned here.

function base(overrides: Partial<TriggerWatchInput> = {}): TriggerWatchInput {
  return {
    concept: "photosynthesis",
    scaffoldUsesOnConcept: 0,
    scaffoldCeiling: 3,
    conceptIsCritical: false,
    tutorJustExplainedConcept: false,
    topicBoundaryReached: false,
    ...overrides,
  };
}

describe("shouldFireReason", () => {
  it("does not fire when nothing is triggered", () => {
    expect(shouldFireReason(base())).toEqual({ fire: false });
  });

  it("fires on scaffolding ceiling when uses reach the ceiling", () => {
    const r = shouldFireReason(base({ scaffoldUsesOnConcept: 3, scaffoldCeiling: 3 }));
    expect(r).toEqual({ fire: true, reason: "scaffolding_ceiling" });
  });

  it("fires on scaffolding ceiling when uses exceed the ceiling", () => {
    const r = shouldFireReason(base({ scaffoldUsesOnConcept: 5, scaffoldCeiling: 3 }));
    expect(r.fire).toBe(true);
    expect(r.reason).toBe("scaffolding_ceiling");
  });

  it("does not fire on scaffolding when below the ceiling", () => {
    expect(shouldFireReason(base({ scaffoldUsesOnConcept: 2, scaffoldCeiling: 3 })).fire).toBe(false);
  });

  it("fires on lesson_design when a critical concept was just explained", () => {
    const r = shouldFireReason(base({ conceptIsCritical: true, tutorJustExplainedConcept: true }));
    expect(r).toEqual({ fire: true, reason: "lesson_design" });
  });

  it("does NOT fire lesson_design when the concept is not critical", () => {
    const r = shouldFireReason(base({ conceptIsCritical: false, tutorJustExplainedConcept: true }));
    expect(r.fire).toBe(false);
  });

  it("does NOT fire lesson_design when the tutor has not explained it yet", () => {
    const r = shouldFireReason(base({ conceptIsCritical: true, tutorJustExplainedConcept: false }));
    expect(r.fire).toBe(false);
  });

  it("fires on topic_boundary when a line of questioning closed", () => {
    const r = shouldFireReason(base({ topicBoundaryReached: true }));
    expect(r).toEqual({ fire: true, reason: "topic_boundary" });
  });

  it("prioritises scaffolding_ceiling over lesson_design and topic_boundary", () => {
    const r = shouldFireReason(
      base({
        scaffoldUsesOnConcept: 3,
        scaffoldCeiling: 3,
        conceptIsCritical: true,
        tutorJustExplainedConcept: true,
        topicBoundaryReached: true,
      })
    );
    // Scaffolding ceiling is the cognitive-surrender signal — it must win.
    expect(r.reason).toBe("scaffolding_ceiling");
  });

  it("prioritises lesson_design over topic_boundary", () => {
    const r = shouldFireReason(
      base({ conceptIsCritical: true, tutorJustExplainedConcept: true, topicBoundaryReached: true })
    );
    expect(r.reason).toBe("lesson_design");
  });
});
