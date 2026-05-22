// Single source for the model IDs used across the app.
// Pivot 21 May 2026: Chris is providing a Gemini key, so we use Google
// Gemini models for the LLM tier. The job-to-model mapping mirrors what
// CLAUDE.md previously called for on Haiku/Sonnet:
//
//   tutor + scaffolding   → Flash-tier model (fast, cheap, good enough
//                           for constrained generation)
//   classifier + Reason   → Pro-tier model (better at structured JSON,
//   evaluator + profile     better at small-data state inference)
//   updater
//
// All callers go through src/lib/ai/llm.ts which abstracts the SDK so we
// can swap providers without touching the layers/ modules.

export const MODELS = {
  tutor: "gemini-2.5-flash",
  scaffold: "gemini-2.5-flash",
  // Two classifier keys: a cheap Flash-tier first pass and a Pro
  // tiebreaker we only call when Flash's confidence is below threshold
  // or its safeguarding signal disagrees with its engagement state.
  // Saves ~80% on classifier spend in steady-state classes while
  // preserving Pro-grade accuracy on the calls that matter.
  classifierFlash: "gemini-2.5-flash",
  classifier: "gemini-2.5-pro",
  reasonEvaluator: "gemini-2.5-pro",
  profileUpdater: "gemini-2.5-pro",
  // Distinct keys for lesson generation + appraisal (both Pro). Previously
  // these reused `reasonEvaluator`, which conflated three call-types under one
  // key — wrong for the per-`use` cost attribution + any future per-key
  // rate-limiting/caching.
  lessonPlanner: "gemini-2.5-pro",
  appraiser: "gemini-2.5-pro",
} as const;

export type ModelKey = keyof typeof MODELS;
