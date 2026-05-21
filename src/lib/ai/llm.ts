// LLM client — Gemini. Server-only.
//
// Single typed entry point used by every API route and every layers/ module.
// Hides the SDK so we can swap providers later without touching callers.
//
// Capabilities surfaced through callLLM:
//   • Plain chat (tutor + scaffolding)
//   • Structured JSON output via responseSchema (classifier, Reason evaluator)
//   • Google Search grounding (expert tutor mode, Reason fact-check) — returns
//     citation metadata alongside the text
//   • Explicit thinkingBudget control (Gemini 2.5 thinks by default; tutor
//     turns want 0, classifier and Reason evaluator want it on)
//
// Returns a deterministic stub when GEMINI_API_KEY is missing so the UI
// stays exercisable without a key (graceful degradation per CLAUDE.md §O).

import "server-only";
import { GoogleGenAI } from "@google/genai";
import { MODELS, type ModelKey } from "./models";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMCitation {
  uri?: string;
  title?: string;
  // The slice of the response text this citation applies to.
  startIndex?: number;
  endIndex?: number;
}

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
  // Google Search grounding. Off by default to keep tutor turns cheap and
  // local; turn on for Expert mode and for Reason fact-checking.
  grounding?: boolean;
}

export interface LLMCallResult {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
  json?: unknown;
  citations?: LLMCitation[];
  // Google Search query strings the model actually executed, if grounding
  // fired. Useful for the Verified affordance in the UI.
  searchQueries?: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client = new GoogleGenAI({ apiKey });
  return client;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMCallResult> {
  const model = MODELS[opts.use];
  const c = getClient();
  if (!c) return fallback(opts, model, "GEMINI_API_KEY not set");

  try {
    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Grounding and structured output are mutually exclusive in the Gemini
    // API. The model can search OR return JSON, not both in one call.
    const wantsGrounding = !!opts.grounding && !opts.responseSchema;

    const config: Record<string, unknown> = {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      temperature: opts.temperature ?? 0.6,
    };
    if (opts.thinkingBudget !== undefined) {
      config.thinkingConfig = { thinkingBudget: opts.thinkingBudget };
    }
    if (opts.responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = opts.responseSchema;
    }
    if (wantsGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await c.models.generateContent({ model, contents, config });
    const text = response.text ?? "";

    let json: unknown | undefined;
    if (opts.responseSchema) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }

    // Grounding metadata: the candidate carries groundingMetadata with
    // groundingChunks (web sources) and groundingSupports (which text spans
    // are backed by which chunks). Flatten into LLMCitation[] for the UI.
    const candidate = response.candidates?.[0];
    const gm = candidate?.groundingMetadata;
    let citations: LLMCitation[] | undefined;
    let searchQueries: string[] | undefined;
    if (gm) {
      searchQueries = gm.webSearchQueries ?? undefined;
      const chunks = gm.groundingChunks ?? [];
      const supports = gm.groundingSupports ?? [];
      if (supports.length > 0) {
        citations = supports.flatMap((s) => {
          const idxs = s.groundingChunkIndices ?? [];
          return idxs
            .map((i) => chunks[i]?.web)
            .filter((w): w is { uri?: string; title?: string } => !!w)
            .map((w) => ({
              uri: w.uri,
              title: w.title,
              startIndex: s.segment?.startIndex,
              endIndex: s.segment?.endIndex,
            }));
        });
      } else if (chunks.length > 0) {
        // No span-level supports but sources exist — surface them anyway.
        citations = chunks
          .map((ch) => ch.web)
          .filter((w): w is { uri?: string; title?: string } => !!w)
          .map((w) => ({ uri: w.uri, title: w.title }));
      }
    }

    return {
      text,
      modelUsed: model,
      fallbackUsed: false,
      json,
      citations,
      searchQueries,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
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
