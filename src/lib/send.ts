// SEND adaptation — turns a pupil's structured SEND profile into the
// free-text "pupil adaptation notes" block the tutor prompt builder
// already accepts (PromptContext.pupilProfile, wrapped as <pupil_profile>
// in src/lib/ai/prompts.ts). PURE: no IO, unit-testable.
//
// Guardrail alignment: this adapts HOW the tutor communicates (output
// shape, pace, support) — never WHAT counts as understanding, and it is
// never surfaced to the pupil as a label. The teacher authors the profile;
// the AI honours it.

import type { PupilRecord } from "@/types";

type SendProfile = NonNullable<PupilRecord["send"]>;

// Cap the teacher's free-text notes so a long note can't dominate the
// system prompt (the builder also wraps + the LLM call is bounded).
const MAX_NOTES = 400;

const OUTPUT_FORMAT_GUIDANCE: Record<NonNullable<SendProfile["outputFormat"]>, string> = {
  short: "Keep replies very short — one clear sentence where possible. Avoid sub-clauses.",
  bullets: "When you must give more than one point, present it as a short bulleted list rather than a paragraph.",
  structured: "Give replies a clear, predictable shape: name the step, then ask one question. Signpost transitions explicitly.",
  visual: "Lean on concrete, picturable examples and spatial language; describe things the pupil can visualise rather than abstract definitions.",
};

// Scaffolding level 1 (light) → 5 (heavy). Drives how much the tutor
// breaks tasks down and how readily it offers a foothold.
function scaffoldingGuidance(level: NonNullable<SendProfile["scaffoldingLevel"]>): string {
  switch (level) {
    case 1:
      return "Scaffolding: light. Let the pupil run; only break a question down if they ask or stall twice.";
    case 2:
      return "Scaffolding: light-to-moderate. Offer a foothold after one stall.";
    case 3:
      return "Scaffolding: moderate. Break larger questions into one tractable step at a time.";
    case 4:
      return "Scaffolding: high. Lead with the smallest first step; check the pupil is with you before moving on.";
    case 5:
      return "Scaffolding: maximum. One tiny step per turn, frequent retrieval of what was just said, and confirm understanding before each new idea.";
  }
}

// Returns the adaptation block, or undefined if the profile carries no
// actionable content (so we don't inject an empty <pupil_profile>).
export function buildSendAdaptationBlock(send: SendProfile | undefined | null): string | undefined {
  if (!send) return undefined;

  const lines: string[] = [];

  if (send.outputFormat) {
    lines.push(OUTPUT_FORMAT_GUIDANCE[send.outputFormat]);
  }
  if (send.scaffoldingLevel) {
    lines.push(scaffoldingGuidance(send.scaffoldingLevel));
  }
  if (send.notes && send.notes.trim()) {
    const note = send.notes.trim().slice(0, MAX_NOTES);
    lines.push(`Teacher's note on this pupil: ${note}`);
  }

  if (lines.length === 0) return undefined;
  return lines.join("\n");
}

// True when a SEND profile has anything worth applying — handy for the
// teacher UI and for deciding whether to send a pupilProfile at all.
export function hasSendAdaptation(send: SendProfile | undefined | null): boolean {
  return buildSendAdaptationBlock(send) !== undefined;
}
