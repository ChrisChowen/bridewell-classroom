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
  // Close-of-lesson pupil-facing summary (session/consolidate). Its own key
  // for the same reason as lessonPlanner/appraiser — it previously borrowed
  // `reasonEvaluator`, which conflated a warm generative task with structured
  // Reason evaluation under one key (wrong for cost attribution + a clean
  // handover where Unified can repoint each purpose independently).
  sessionClose: "gemini-2.5-pro",
} as const;

export type ModelKey = keyof typeof MODELS;

// ── Provider-specific model ids ──────────────────────────────────────────
// The job→model map is per-provider: a backend swap changes the concrete ids
// AND (via the adapter) the API shape. `MODELS` above is the Gemini default;
// the maps below let `LLM_PROVIDER` repoint every job to that backend's ids.
//
// OpenAI / GPT-5.2 — what Unified Projects run for the schools. GPT-5.2 is a
// reasoning model, so fast-vs-deep tiering comes from reasoning.effort (mapped
// from each call's thinkingBudget in the adapter) rather than a separate model
// id; all jobs use `gpt-5.2`. If Unified have a smaller/faster variant (e.g. a
// `gpt-5.2-mini`) they can drop it into the fast-tier keys (tutor / scaffold /
// classifierFlash) here — no other change needed.
const OPENAI_MODELS: Record<ModelKey, string> = {
  tutor: "gpt-5.2",
  scaffold: "gpt-5.2",
  classifierFlash: "gpt-5.2",
  classifier: "gpt-5.2",
  reasonEvaluator: "gpt-5.2",
  profileUpdater: "gpt-5.2",
  lessonPlanner: "gpt-5.2",
  appraiser: "gpt-5.2",
  sessionClose: "gpt-5.2",
};

const MODELS_BY_PROVIDER: Record<string, Record<ModelKey, string>> = {
  gemini: MODELS,
  openai: OPENAI_MODELS,
};

// Resolve a job key to a concrete model id for the active provider. Defaults
// to the Gemini map; an unknown provider also falls back to Gemini ids (the
// adapter for that provider would have thrown earlier if truly misconfigured).
export function modelFor(use: ModelKey, provider = process.env.LLM_PROVIDER): string {
  const p = (provider || "gemini").toLowerCase();
  return (MODELS_BY_PROVIDER[p] ?? MODELS)[use];
}
