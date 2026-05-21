// Reason evaluator — Phase 2 module.
//
// Reads the pupil's response to a Reason prompt and returns a confidence
// score in [0, 1] with a short rationale and the weakest segment (used by
// the responder layer to construct a soft-challenge follow-up).
//
// Runs on Gemini 2.5 Pro with structured JSON output. Grounding is OFF by
// default — the evaluator measures the pupil's reasoning, not the truth
// value of the concept. A separate `factCheck` mode is available for the
// rare case where the teacher wants the model to verify the pupil's
// answer against Google Search.

import "server-only";
import { callLLM } from "@/lib/ai/llm";
import type { ReasonPromptType } from "@/types";

export interface ReasonEvaluatorInput {
  concept: string;
  subject?: string;
  promptType: ReasonPromptType;
  promptText: string;
  pupilResponse: string;
  // Optional: the prior tutor turn the pupil is responding against.
  // Used by the lexical-overlap signal (low overlap is good).
  priorTutorTurn?: string;
}

export interface ReasonEvaluatorResult {
  confidence: number; // 0..1
  branch: "accept" | "soft_challenge" | "pattern_flag";
  rationale: string; // one short sentence; never shown to the pupil
  weakestSegment?: string; // a short slice of the pupil's response
  followUp?: string; // soft-challenge question targeting the weakest segment
  fallbackUsed: boolean;
}

const SYSTEM = `You evaluate a Year 7–9 pupil's response to a generative prompt asked
by an AI tutor. The pupil is being asked to show understanding in their
own words — paraphrase, novel example, counterfactual, or teach-back.

Return a confidence score in [0, 1] that the pupil's response demonstrates
real understanding rather than echoing the tutor, plus the branch this
maps to (accept > 0.65; soft_challenge 0.4–0.65; pattern_flag < 0.4) and
a short rationale.

Heuristics:
  - Length and substance: empty or one-word responses are pattern_flag.
  - Lexical echo: high overlap with the prior tutor turn is suspicious.
  - Novel example or restatement using the pupil's own vocabulary is
    evidence of understanding even when imperfect.
  - Generosity beats severity. The system never tells a pupil they have
    failed; the score guides the next move, not a verdict.

When confidence is between 0.4 and 0.65, also produce:
  - weakest_segment: the shortest slice of the pupil response that is
    weakest (a phrase, not a sentence).
  - follow_up: one short, generative question targeting that segment.
    No more than 22 words. British English. No exclamations.

Output strict JSON only.`;

const SCHEMA = {
  type: "object",
  properties: {
    confidence: { type: "number", minimum: 0, maximum: 1 },
    branch: { type: "string", enum: ["accept", "soft_challenge", "pattern_flag"] },
    rationale: { type: "string" },
    weakest_segment: { type: "string" },
    follow_up: { type: "string" },
  },
  required: ["confidence", "branch", "rationale"],
} as const;

export async function evaluateReasonResponse(
  input: ReasonEvaluatorInput
): Promise<ReasonEvaluatorResult> {
  const userBlock = [
    `Concept: ${input.concept}${input.subject ? ` (${input.subject})` : ""}`,
    `Prompt type: ${input.promptType}`,
    `Prompt text: ${input.promptText}`,
    input.priorTutorTurn ? `Prior tutor turn:\n${input.priorTutorTurn}` : null,
    `Pupil response:\n${input.pupilResponse}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callLLM({
    use: "reasonEvaluator",
    system: SYSTEM,
    messages: [{ role: "user", content: userBlock }],
    responseSchema: SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 2048,
    temperature: 0.25,
    thinkingBudget: 1024,
  });

  if (result.fallbackUsed || !result.json) {
    return {
      confidence: 0,
      branch: "pattern_flag",
      rationale: result.fallbackUsed
        ? `Evaluator unavailable (${result.text.slice(0, 80)}…)`
        : "Evaluator returned non-JSON output",
      fallbackUsed: true,
    };
  }
  const j = result.json as {
    confidence?: number;
    branch?: ReasonEvaluatorResult["branch"];
    rationale?: string;
    weakest_segment?: string;
    follow_up?: string;
  };
  // Validate required fields. A partially-formed object would otherwise
  // pass through and either crash the responder or quietly emit a
  // generic follow-up, masking an evaluator failure.
  if (
    typeof j.confidence !== "number" ||
    !j.branch ||
    !["accept", "soft_challenge", "pattern_flag"].includes(j.branch) ||
    !j.rationale
  ) {
    return {
      confidence: 0,
      branch: "pattern_flag",
      rationale: "Evaluator returned an incomplete JSON object",
      fallbackUsed: true,
    };
  }
  return {
    confidence: Math.min(1, Math.max(0, j.confidence)),
    branch: j.branch,
    rationale: j.rationale,
    weakestSegment: j.weakest_segment,
    followUp: j.follow_up,
    fallbackUsed: false,
  };
}
