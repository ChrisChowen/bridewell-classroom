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
  classifier: "gemini-2.5-pro",
  reasonEvaluator: "gemini-2.5-pro",
  profileUpdater: "gemini-2.5-pro",
} as const;

export type ModelKey = keyof typeof MODELS;
