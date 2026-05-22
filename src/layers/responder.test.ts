import { describe, it, expect } from "vitest";
import { shapeResponse, type ResponderInput } from "./responder";
import type { ReasonEvaluatorResult } from "./evaluator";

// The responder turns the evaluator's branch into the next tutor move.
// The load-bearing invariant: pattern_flag NEVER surfaces a verdict/score to
// the pupil — but it MUST still keep the conversation moving with a neutral
// continuative line (the pupil just answered; silence reads as being
// ignored), and DOES emit a dashboard signal. accept produces a
// concept-anchored acknowledgement; soft_challenge produces a follow-up.

function evalResult(over: Partial<ReasonEvaluatorResult> = {}): ReasonEvaluatorResult {
  return { confidence: 0.5, branch: "soft_challenge", rationale: "test", fallbackUsed: false, ...over };
}

function input(over: Partial<ResponderInput> = {}): ResponderInput {
  return { evaluation: evalResult(), concept: "chlorophyll absorbs light", ...over };
}

describe("shapeResponse", () => {
  it("accept: emits a tutor turn, no pattern flag", () => {
    const out = shapeResponse(input({ evaluation: evalResult({ branch: "accept", confidence: 0.8 }) }));
    expect(out.branch).toBe("accept");
    expect(out.emitPatternFlag).toBe(false);
    expect(out.tutorTurn && out.tutorTurn.length).toBeGreaterThan(0);
  });

  it("accept: tutor turn is concept-anchored, not generic praise", () => {
    const out = shapeResponse(
      input({ evaluation: evalResult({ branch: "accept" }), concept: "Light as a limiting factor" })
    );
    // Concept text (lower-cased mid-sentence) should appear in the line.
    expect(out.tutorTurn?.toLowerCase()).toContain("light as a limiting factor");
  });

  it("soft_challenge: uses the evaluator follow-up when present", () => {
    const out = shapeResponse(
      input({ evaluation: evalResult({ branch: "soft_challenge", followUp: "What about at night?" }) })
    );
    expect(out.branch).toBe("soft_challenge");
    expect(out.tutorTurn).toBe("What about at night?");
    expect(out.emitPatternFlag).toBe(false);
  });

  it("soft_challenge: falls back to a generic follow-up when none provided", () => {
    const out = shapeResponse(input({ evaluation: evalResult({ branch: "soft_challenge", followUp: undefined }) }));
    expect(out.branch).toBe("soft_challenge");
    expect(out.tutorTurn && out.tutorTurn.length).toBeGreaterThan(0);
  });

  it("pattern_flag: emits a neutral continuative line (no silence, no verdict)", () => {
    const out = shapeResponse(input({ evaluation: evalResult({ branch: "pattern_flag", confidence: 0.2 }) }));
    expect(out.branch).toBe("pattern_flag");
    // Not silence — the pupil just answered.
    expect(out.tutorTurn && out.tutorTurn.length).toBeGreaterThan(0);
    // No verdict / score / praise leaked.
    const t = (out.tutorTurn ?? "").toLowerCase();
    expect(t).not.toMatch(/wrong|incorrect|low|struggl|\d|%|score|well done|great/);
  });

  it("pattern_flag: DOES emit a dashboard pattern signal", () => {
    const out = shapeResponse(input({ evaluation: evalResult({ branch: "pattern_flag" }) }));
    expect(out.emitPatternFlag).toBe(true);
  });

  it("accept: tolerates an empty concept without crashing", () => {
    const out = shapeResponse(input({ evaluation: evalResult({ branch: "accept" }), concept: "" }));
    expect(out.tutorTurn && out.tutorTurn.length).toBeGreaterThan(0);
  });
});
