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

// Concept-aware accept lines. Generic praise tells the pupil "you did
// well"; concept-aware praise tells them WHY — which is what reinforces
// the learning moment. The {concept} token is substituted with the
// concept the Reason fired on (e.g. "chlorophyll absorbs light").
const ACCEPT_TEMPLATES = [
  "Right — you've shown that {concept}. Let's build on that.",
  "Yes, that's the move. You're using {concept} correctly. Onward.",
  "Good. You've put {concept} into your own words. Keep going.",
];

function pickAcceptLine(concept: string): string {
  const template = ACCEPT_TEMPLATES[Math.floor(Math.random() * ACCEPT_TEMPLATES.length)];
  // Concept might be a long phrase ("Light as a limiting factor"); lower-case
  // the first character so it reads naturally mid-sentence ("you've shown
  // that light as a limiting factor"). The tutor's BASE register is calm
  // and lowercase-conversational.
  const inflected = concept
    ? concept.charAt(0).toLowerCase() + concept.slice(1)
    : "the idea";
  return template.replace("{concept}", inflected);
}

export function shapeResponse(input: ResponderInput): ResponderOutput {
  const { evaluation, concept } = input;
  switch (evaluation.branch) {
    case "accept":
      return {
        branch: "accept",
        tutorTurn: pickAcceptLine(concept),
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
