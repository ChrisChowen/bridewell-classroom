// Cost estimation for LLM usage. PURE — no IO. Rates are ESTIMATES (USD per
// 1M tokens) for the Gemini 2.5 tier the app uses; published prices change,
// so this is a planning/visibility figure, not a billing source of truth.
// Update RATES here if Google's pricing moves.

export interface Rate {
  inputPerM: number; // USD per 1,000,000 input tokens
  outputPerM: number; // USD per 1,000,000 output tokens
}

// Keyed by a substring of the model id. First match wins; falls back to a
// conservative default so an unknown model never silently costs 0.
const RATES: Array<{ match: string; rate: Rate }> = [
  { match: "flash", rate: { inputPerM: 0.3, outputPerM: 2.5 } },
  { match: "pro", rate: { inputPerM: 1.25, outputPerM: 10 } },
];
const DEFAULT_RATE: Rate = { inputPerM: 1.25, outputPerM: 10 };

export function rateForModel(model: string): Rate {
  const m = model.toLowerCase();
  for (const { match, rate } of RATES) {
    if (m.includes(match)) return rate;
  }
  return DEFAULT_RATE;
}

// Estimated USD cost of a single call. Missing token counts count as 0.
export function estimateCostUSD(model: string, inputTokens = 0, outputTokens = 0): number {
  const r = rateForModel(model);
  const cost = (Math.max(0, inputTokens) / 1_000_000) * r.inputPerM
    + (Math.max(0, outputTokens) / 1_000_000) * r.outputPerM;
  // round to 6 dp (sub-cent precision)
  return Math.round(cost * 1e6) / 1e6;
}
