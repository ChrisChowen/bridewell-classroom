// LLM provider abstraction — the handover seam.
//
// Every model call in the app goes through `callLLM` (../llm.ts), which
// resolves a named model key and delegates to whichever LLMProvider is
// selected by the LLM_PROVIDER env var. Gemini is the built-in adapter;
// Unified Projects can ship their own adapter (Vertex, Bedrock, an
// in-house gateway, …), register it, set LLM_PROVIDER, and the entire app
// repoints with ZERO changes to callers or to the orchestration in
// llm.ts. This file holds the wire types every adapter speaks.

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

// A fully-resolved request handed to a provider. model is the concrete
// model id (already mapped from the named key via MODELS), so providers
// never need to know about the app's job→model mapping.
export interface ProviderGenerateRequest {
  model: string;
  system: string;
  messages: LLMMessage[];
  maxOutputTokens: number;
  temperature: number;
  // Undefined = let the model decide. 0 = no thinking (fast turns).
  thinkingBudget?: number;
  // When set, the provider must return valid JSON matching this schema.
  responseSchema?: Record<string, unknown>;
  // Web-search grounding (mutually exclusive with responseSchema).
  grounding: boolean;
}

export interface ProviderGenerateResult {
  text: string;
  citations?: LLMCitation[];
  searchQueries?: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface LLMProvider {
  // Stable identifier matched against LLM_PROVIDER.
  readonly name: string;
  // Whether the provider is configured (e.g. its API key is present).
  // When false, callLLM serves a deterministic fallback instead.
  available(): boolean;
  // Perform one generation. May throw; callLLM catches and falls back.
  generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult>;
  // OPTIONAL: stream a generation as text deltas (for the live tutor turn).
  // Adapters that don't implement it simply aren't streamed — callLLMStream
  // falls back to a single full-text chunk via generate(). Only ever used for
  // plain text (never with grounding or responseSchema).
  generateStream?(req: ProviderGenerateRequest): AsyncIterable<string>;
}
