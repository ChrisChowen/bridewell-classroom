// Reason response layer — Phase 2 module.
//
// Branches on the evaluator's confidence score per `brief/03`:
//   accept (> 0.65)         → brief positive acknowledgement; resume.
//   soft_challenge (0.4–.65) → one follow-up targeting weakest segment.
//   pattern_flag (< 0.4)    → log, surface as pattern on the dashboard.
//                             NEVER an alert. The pupil never sees the
//                             score; framing stays generative.
//
// This module is pure logic — the evaluator already drafted the
// soft-challenge follow-up via Pro; here we just shape the next event
// for the chat surface and for Firestore/RTDB.

import type { ReasonEvaluatorResult } from "./evaluator";

export type ResponseBranch = ReasonEvaluatorResult["branch"];

export interface ResponderInput {
  evaluation: ReasonEvaluatorResult;
  concept: string;
}

export interface ResponderOutput {
  branch: ResponseBranch;
  // Text to insert into the chat as the next tutor turn (if any).
  tutorTurn?: string;
  // Whether to log this Reason event as a pattern signal for the teacher.
  emitPatternFlag: boolean;
}

const ACCEPT_LINES = [
  "Good — that is the move I was hoping for. Let us keep going.",
  "Right. That is the kind of answer that tells me you have it.",
  "Yes, that lands. Onward.",
];

export function shapeResponse(input: ResponderInput): ResponderOutput {
  const { evaluation } = input;
  switch (evaluation.branch) {
    case "accept":
      return {
        branch: "accept",
        tutorTurn:
          ACCEPT_LINES[Math.floor(Math.random() * ACCEPT_LINES.length)],
        emitPatternFlag: false,
      };
    case "soft_challenge":
      return {
        branch: "soft_challenge",
        tutorTurn: evaluation.followUp ??
          `Can you say a bit more about that?`,
        emitPatternFlag: false,
      };
    case "pattern_flag":
    default:
      // No verdict to the pupil. We let the conversation continue normally;
      // the signal goes to the teacher dashboard via the engagement loop.
      return {
        branch: "pattern_flag",
        tutorTurn: undefined,
        emitPatternFlag: true,
      };
  }
}
