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
import { modelFor, type ModelKey } from "./models";
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
  // Technical reason for a fallback (server-side only — never rendered to
  // pupils; the user-facing `text` is a calm generic line).
  fallbackReason?: string;
}

// Usage-recording hook. The model seam stays PURE — it never imports
// Firestore/admin. A server-only module (lib/cost/recorder) injects a
// recorder via setUsageRecorder, imported as a side-effect by the nodejs
// LLM routes (NOT instrumentation.ts — that compiles for the edge runtime
// and would drag firebase-admin into an unsupported bundle). callLLM
// invokes the recorder best-effort (fire-and-forget) after a real call, so
// cost tracking adds zero latency and can never break a tutor turn. No-op
// until a recorder is set (so the swap test + non-server contexts are
// unaffected).
export interface LLMUsageRecord {
  use: ModelKey;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}
let usageRecorder: ((u: LLMUsageRecord) => void) | null = null;
export function setUsageRecorder(fn: ((u: LLMUsageRecord) => void) | null): void {
  usageRecorder = fn;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
  const model = modelFor(opts.use);

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

    // Best-effort cost accounting. Never awaited, never throws into the call.
    if (usageRecorder) {
      try {
        usageRecorder({
          use: opts.use,
          model,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        });
      } catch {
        /* recording must never affect the tutor turn */
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

// Streaming entry point — yields text deltas for the live tutor turn.
// Plain text only (no responseSchema / no grounding). If the provider can't
// stream (or is unavailable / errors), this degrades to a single full-text
// chunk via callLLM, so callers get the same text either way. Per-call cost
// recording is intentionally skipped on the streamed path: it's the cheap
// fast-tier coach turn, and the expensive Pro calls (classifier / evaluator /
// planner / appraiser) stay non-streamed and fully tracked.
export async function* callLLMStream(
  opts: Omit<LLMCallOptions, "responseSchema" | "grounding">,
): AsyncGenerator<string> {
  const model = modelFor(opts.use);
  let provider;
  try {
    provider = resolveProvider();
  } catch {
    yield fallback(opts as LLMCallOptions, model, "provider misconfigured").text;
    return;
  }
  if (!provider.available() || typeof provider.generateStream !== "function") {
    // No streaming available — emit the whole reply as one chunk.
    const r = await callLLM(opts as LLMCallOptions);
    yield r.text;
    return;
  }
  try {
    const it = provider.generateStream({
      model,
      system: opts.system,
      messages: opts.messages,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      temperature: opts.temperature ?? 0.6,
      thinkingBudget: opts.thinkingBudget,
      grounding: false,
    });
    let any = false;
    for await (const delta of it) {
      if (delta) {
        any = true;
        yield delta;
      }
    }
    // If the stream produced nothing (rare), fall back to a non-streamed call.
    if (!any) {
      const r = await callLLM(opts as LLMCallOptions);
      yield r.text;
    }
  } catch {
    // Mid-stream or setup error → one-shot fallback so the turn still completes.
    const r = await callLLM(opts as LLMCallOptions);
    yield r.text;
  }
}

function fallback(opts: LLMCallOptions, model: string, reason: string): LLMCallResult {
  // Calm, non-technical line — this string can surface directly in the pupil
  // chat (graceful degradation, CLAUDE.md §O). NEVER leak the model id, the
  // raw error reason, or the pupil's own message back at them. The technical
  // detail stays in `fallbackReason` for server logs / the dashboard's
  // "not a real signal" indicator; callers that parse JSON check
  // `fallbackUsed` and use their own deterministic fallback regardless.
  return {
    text: "I can't reply just now — give it a moment and try again.",
    modelUsed: model,
    fallbackUsed: true,
    fallbackReason: reason,
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
