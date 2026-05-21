// Reason prompt library — Phase 2 module.
//
// Four prompt types per `brief/03_Reason_Function_Architecture_v2.md`,
// selected by the trigger layer. Selector avoids back-to-back repeats and
// subject-weights counterfactuals into maths/science and teach-back across
// all subjects. Templates use {concept} and {subject} placeholders so the
// prompt layer can fill them at runtime; the consulting company can edit
// the templates without touching code.

import type { ReasonPromptType } from "@/types";

export const REASON_TEMPLATES: Record<ReasonPromptType, string[]> = {
  paraphrase: [
    "In your own words, what is {concept}?",
    "How would you explain {concept} to yourself, in one sentence?",
  ],
  novel_example: [
    "Can you give me an example of {concept} we haven't already talked about?",
    "Where else in {subject} would you expect to see {concept} show up?",
  ],
  counterfactual: [
    "What would change if {concept} were not the case?",
    "Imagine {concept} worked the opposite way — what would you expect to see?",
  ],
  teach_back: [
    "Imagine you have to explain {concept} to someone in the year below you. Write a short explanation for them.",
    "If a friend in the year below asked you what {concept} means, what would you tell them?",
  ],
};

const SUBJECT_WEIGHTING: Record<string, Record<ReasonPromptType, number>> = {
  // Counterfactuals work better when manipulating variables; teach-back
  // works across subjects.
  default: { paraphrase: 1, novel_example: 1, counterfactual: 1, teach_back: 1 },
  mathematics: { paraphrase: 1, novel_example: 1, counterfactual: 1.6, teach_back: 1 },
  science: { paraphrase: 1, novel_example: 1, counterfactual: 1.5, teach_back: 1 },
  biology: { paraphrase: 1, novel_example: 1.2, counterfactual: 1.4, teach_back: 1 },
  chemistry: { paraphrase: 1, novel_example: 1, counterfactual: 1.5, teach_back: 1 },
  physics: { paraphrase: 1, novel_example: 1, counterfactual: 1.6, teach_back: 1 },
  english: { paraphrase: 1.3, novel_example: 1.3, counterfactual: 0.8, teach_back: 1.2 },
  history: { paraphrase: 1.2, novel_example: 1.2, counterfactual: 1, teach_back: 1.2 },
};

const TYPES: ReasonPromptType[] = ["paraphrase", "novel_example", "counterfactual", "teach_back"];

export function selectReasonPrompt({
  concept,
  subject,
  lastType,
  seed,
}: {
  concept: string;
  subject?: string;
  lastType?: ReasonPromptType;
  seed?: number;
}): { type: ReasonPromptType; text: string } {
  const subjKey = (subject ?? "").toLowerCase();
  const weights = SUBJECT_WEIGHTING[subjKey] ?? SUBJECT_WEIGHTING.default;
  const eligible = TYPES.filter((t) => t !== lastType);
  const totalWeight = eligible.reduce((sum, t) => sum + weights[t], 0);
  const rng = mulberry32(seed ?? Date.now());
  let pick = eligible[0];
  let r = rng() * totalWeight;
  for (const t of eligible) {
    r -= weights[t];
    if (r <= 0) {
      pick = t;
      break;
    }
  }
  const templates = REASON_TEMPLATES[pick];
  const tmpl = templates[Math.floor(rng() * templates.length)];
  const text = tmpl
    .replaceAll("{concept}", concept)
    .replaceAll("{subject}", subject ?? "the subject");
  return { type: pick, text };
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
