// Gemini provider — the built-in LLMProvider adapter.
//
// Holds ALL Google-GenAI-SDK-specific code: client construction, the
// generateContent call shape, grounding/citation flattening, and usage
// extraction. Nothing else in the app imports @google/genai — so a
// different provider is a sibling file, not a cross-cutting change.

import { GoogleGenAI } from "@google/genai";
import type {
  LLMCitation,
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResult,
} from "./types";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;

  available(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const c = this.getClient();
    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Grounding and structured output are mutually exclusive in the
    // Gemini API: search OR JSON, never both in one call.
    const wantsGrounding = req.grounding && !req.responseSchema;

    const config: Record<string, unknown> = {
      systemInstruction: req.system,
      maxOutputTokens: req.maxOutputTokens,
      temperature: req.temperature,
    };
    if (req.thinkingBudget !== undefined) {
      config.thinkingConfig = { thinkingBudget: req.thinkingBudget };
    }
    if (req.responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = req.responseSchema;
    }
    if (wantsGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await c.models.generateContent({ model: req.model, contents, config });
    const text = response.text ?? "";

    // Flatten grounding metadata into citations + the executed queries.
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
        citations = chunks
          .map((ch) => ch.web)
          .filter((w): w is { uri?: string; title?: string } => !!w)
          .map((w) => ({ uri: w.uri, title: w.title }));
      }
    }

    return {
      text,
      citations,
      searchQueries,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  }

  // Stream a plain-text generation as deltas. Used for the live tutor turn
  // (coach mode) so the reply appears as it's produced. No grounding / no
  // responseSchema here — those need the whole response (citations / valid
  // JSON), so callLLMStream never routes them through streaming.
  async *generateStream(req: ProviderGenerateRequest): AsyncIterable<string> {
    const c = this.getClient();
    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const config: Record<string, unknown> = {
      systemInstruction: req.system,
      maxOutputTokens: req.maxOutputTokens,
      temperature: req.temperature,
    };
    if (req.thinkingBudget !== undefined) {
      config.thinkingConfig = { thinkingBudget: req.thinkingBudget };
    }
    const stream = await c.models.generateContentStream({
      model: req.model,
      contents,
      config,
    });
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) yield t;
    }
  }
}
