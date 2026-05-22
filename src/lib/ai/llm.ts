// LLM client — provider-agnostic. Server-only.
//
// Single typed entry point used by every API route and every layers/
// module. callLLM resolves a named model key to a concrete model id and
// delegates the actual generation to whichever LLMProvider is selected
// by LLM_PROVIDER (default: gemini). The provider seam (./providers/) is
// the handover point: Unified Projects ships an adapter, sets the env
// var, and the whole app repoints with no caller changes.
//
// Capabilities surfaced through callLLM:
//   • Plain chat (tutor + scaffolding)
//   • Structured JSON output via responseSchema (classifier, Reason evaluator)
//   • Google Search grounding (expert tutor mode, Reason fact-check) — returns
//     citation metadata alongside the text
//   • Explicit thinkingBudget control
//
// Returns a deterministic stub when the provider is unavailable (e.g. no
// API key) or errors, so the UI stays exercisable (graceful degradation
// per CLAUDE.md §O).

import "server-only";
import { MODELS, type ModelKey } from "./models";
import { resolveProvider } from "./providers";
import type { LLMMessage, LLMCitation } from "./providers/types";

// Re-export the wire types so existing importers (`import { LLMMessage }
// from "@/lib/ai/llm"`) keep working unchanged.
export type { LLMMessage, LLMCitation } from "./providers/types";

export interface LLMCallOptions {
  use: ModelKey;
  system: string;
  messages: LLMMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  // Structured JSON output. When set, the model returns valid JSON matching
  // the schema (classifier, Reason evaluator, profile updater).
  responseSchema?: Record<string, unknown>;
  // Gemini 2.5 thinks by default. Pass 0 for fast tutor turns; leave
  // undefined (or pass a non-zero budget) for analysis tasks.
  thinkingBudget?: number;
  // Web-search grounding. Off by default to keep tutor turns cheap and
  // local; turn on for Expert mode and for Reason fact-checking.
  grounding?: boolean;
}

export interface LLMCallResult {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
  json?: unknown;
  citations?: LLMCitation[];
  // Search query strings the model actually executed, if grounding fired.
  searchQueries?: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
  const model = MODELS[opts.use];

  let provider;
  try {
    provider = resolveProvider();
  } catch (err) {
    // Unknown/misconfigured LLM_PROVIDER — degrade gracefully.
    return fallback(opts, model, err instanceof Error ? err.message : String(err));
  }

  if (!provider.available()) {
    return fallback(opts, model, `${provider.name} provider unavailable`);
  }

  try {
    const result = await provider.generate({
      model,
      system: opts.system,
      messages: opts.messages,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      temperature: opts.temperature ?? 0.6,
      thinkingBudget: opts.thinkingBudget,
      responseSchema: opts.responseSchema,
      grounding: !!opts.grounding,
    });

    let json: unknown | undefined;
    if (opts.responseSchema) {
      try {
        json = JSON.parse(result.text);
      } catch {
        json = undefined;
      }
    }

    return {
      text: result.text,
      modelUsed: model,
      fallbackUsed: false,
      json,
      citations: result.citations,
      searchQueries: result.searchQueries,
      usage: result.usage,
    };
  } catch (err) {
    return fallback(opts, model, err instanceof Error ? err.message : String(err));
  }
}

function fallback(opts: LLMCallOptions, model: string, reason: string): LLMCallResult {
  const lastUser = [...opts.messages].reverse().find((m) => m.role === "user");
  return {
    text:
      `[LLM fallback — ${model} unavailable: ${reason}] ` +
      (lastUser?.content ?? ""),
    modelUsed: model,
    fallbackUsed: true,
  };
}

// De-duplicate citations by URI, preserving order.
export function dedupeCitations(cs: LLMCitation[] | undefined): LLMCitation[] {
  if (!cs) return [];
  const seen = new Set<string>();
  const out: LLMCitation[] = [];
  for (const c of cs) {
    const key = c.uri ?? "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
