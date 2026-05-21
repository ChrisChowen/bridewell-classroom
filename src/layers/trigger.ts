// Reason trigger layer — Phase 2 module.
//
// Watches the chat stream and emits `reasonShouldFire` events when any of
// the four conditions in `brief/03` are met:
//
//   1. Topic boundary             — the AI's segmentation closed a line
//                                   of questioning. (Demo trigger fires
//                                   this manually until segmentation
//                                   lands.)
//   2. Scaffolding ceiling        — pupil has pressed Hint/Rephrase/
//                                   Simplify above the configured
//                                   ceiling (default 3) for the current
//                                   concept.
//   3. Teacher trigger            — teacher fires Reason from the
//                                   dashboard intervention panel.
//   4. Lesson-design trigger      — a concept marked as critical in the
//                                   lesson configuration was just
//                                   explained by the tutor; fire after
//                                   that turn.
//
// Defaults are designed so a teacher who never touches Reason still gets
// useful aggregated signal from the system-triggered cases.

export type ReasonTriggerReason =
  | "topic_boundary"
  | "scaffolding_ceiling"
  | "teacher"
  | "lesson_design";

export interface TriggerWatchInput {
  // The current concept under discussion (string label; later: a concept
  // ID once the lesson schema firms up).
  concept: string;
  // Scaffold uses observed on the current concept since the last Reason.
  scaffoldUsesOnConcept: number;
  // Ceiling above which Reason fires (per lesson config, default 3).
  scaffoldCeiling: number;
  // Whether the current concept is marked as critical in the lesson.
  conceptIsCritical: boolean;
  // Whether the AI just finished explaining the concept (i.e. the most
  // recent tutor turn referenced it). Used by the lesson-design trigger.
  tutorJustExplainedConcept: boolean;
  // Whether the AI's chat-segmentation logic just closed this line of
  // questioning. (Wired in Phase 2.)
  topicBoundaryReached: boolean;
}

export interface TriggerDecision {
  fire: boolean;
  reason?: ReasonTriggerReason;
}

export function shouldFireReason(input: TriggerWatchInput): TriggerDecision {
  if (input.scaffoldUsesOnConcept >= input.scaffoldCeiling) {
    return { fire: true, reason: "scaffolding_ceiling" };
  }
  if (input.conceptIsCritical && input.tutorJustExplainedConcept) {
    return { fire: true, reason: "lesson_design" };
  }
  if (input.topicBoundaryReached) {
    return { fire: true, reason: "topic_boundary" };
  }
  return { fire: false };
}
