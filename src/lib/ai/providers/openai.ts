// OpenAI provider — the GPT-5.2 adapter (what Unified Projects run for the
// schools). Implements LLMProvider against the OpenAI **Responses API**
// (POST /v1/responses), the recommended surface for the GPT-5 reasoning
// series. Holds ALL OpenAI-specific wire code so the rest of the app is
// unchanged — the swap is `LLM_PROVIDER=openai` + `OPENAI_API_KEY`.
//
// Capability mapping (our seam → Responses API):
//   system            → instructions
//   messages          → input: [{ role, content }]
//   responseSchema    → text.format: { type: "json_schema", schema, strict:false }
//   grounding         → tools: [{ type: "web_search" }]   (never with a schema)
//   thinkingBudget    → reasoning.effort  (0→none … high)
//   maxOutputTokens   → max_output_tokens (with headroom — reasoning tokens
//                       are billed against this budget too)
//   usage             → usage.input_tokens / usage.output_tokens
//
// NOTE: this adapter is written from the GPT-5.2 docs but is UNTESTED here
// (no OPENAI_API_KEY in this environment). Its request/response mapping is
// pinned by a unit test that mocks fetch (openai.test.ts). Two deliberate,
// conservative choices Unified may revisit:
//   • temperature is NOT sent — GPT-5.2 reasoning models reject a non-default
//     temperature; the model's default is used.
//   • json_schema is sent with strict:false — our schemas weren't authored to
//     OpenAI strict rules (additionalProperties:false + every field required),
//     so strict:true could 400. Non-strict still steers strongly to the
//     schema, and every caller already JSON.parses + validates fields with a
//     deterministic fallback. Unified can flip to strict once the schemas are
//     made strict-compliant.

import type {
  LLMCitation,
  LLMProvider,
  ProviderGenerateRequest,
  ProviderGenerateResult,
} from "./types";

const ENDPOINT = "https://api.openai.com/v1/responses";

// thinkingBudget → reasoning effort. Our fast tutor/scaffold turns pass 0
// (want minimal reasoning); the analysis jobs leave it higher.
function effortFromBudget(budget: number | undefined): "none" | "low" | "medium" | "high" {
  if (budget === undefined) return "medium";
  if (budget <= 0) return "none";
  if (budget <= 512) return "low";
  if (budget <= 1536) return "medium";
  return "high";
}

function buildBody(req: ProviderGenerateRequest, stream: boolean): Record<string, unknown> {
  const wantsGrounding = req.grounding && !req.responseSchema;
  const body: Record<string, unknown> = {
    model: req.model,
    instructions: req.system,
    input: req.messages.map((m) => ({ role: m.role, content: m.content })),
    // Reasoning tokens are billed against max_output_tokens, so give headroom
    // beyond the visible-output budget or short turns can come back empty.
    max_output_tokens: Math.max(req.maxOutputTokens + 1024, 2048),
    reasoning: { effort: effortFromBudget(req.thinkingBudget) },
    stream,
  };
  if (req.responseSchema) {
    body.text = {
      format: {
        type: "json_schema",
        name: "response",
        schema: req.responseSchema,
        strict: false,
      },
    };
  }
  if (wantsGrounding) {
    body.tools = [{ type: "web_search" }];
  }
  return body;
}

// Pull citations out of a non-streamed Responses payload: each message
// content part may carry `annotations` of type "url_citation".
function extractCitations(data: unknown): LLMCitation[] | undefined {
  const output = (data as { output?: unknown[] })?.output;
  if (!Array.isArray(output)) return undefined;
  const cites: LLMCitation[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown[] })?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const anns = (part as { annotations?: unknown[] })?.annotations;
      if (!Array.isArray(anns)) continue;
      for (const a of anns) {
        const ann = a as { type?: string; url?: string; title?: string };
        if (ann.type === "url_citation" && ann.url) {
          cites.push({ uri: ann.url, title: ann.title });
        }
      }
    }
  }
  return cites.length ? cites : undefined;
}

// Aggregate output text from a non-streamed payload. Prefers the convenience
// `output_text`; falls back to concatenating output_text content parts.
function extractText(data: unknown): string {
  const ot = (data as { output_text?: unknown }).output_text;
  if (typeof ot === "string") return ot;
  if (Array.isArray(ot)) return ot.join("");
  const output = (data as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return "";
  let text = "";
  for (const item of output) {
    const content = (item as { content?: unknown[] })?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const p = part as { type?: string; text?: string };
      if (p.type === "output_text" && typeof p.text === "string") text += p.text;
    }
  }
  return text;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  available(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private headers(): Record<string, string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(buildBody(req, false)),
    });
    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      text: extractText(data),
      citations: extractCitations(data),
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  }

  // Stream text deltas from the Responses API (Server-Sent Events). Each event
  // is `data: {json}`; we yield the `delta` of `response.output_text.delta`
  // events and stop at `response.completed` / `[DONE]`.
  async *generateStream(req: ProviderGenerateRequest): AsyncIterable<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(buildBody(req, true)),
    });
    if (!res.ok || !res.body) {
      throw new Error(`OpenAI stream ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line; each frame has data: lines.
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const evt = JSON.parse(payload) as { type?: string; delta?: string };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              yield evt.delta;
            }
          } catch {
            /* ignore keep-alive / non-JSON frames */
          }
        }
      }
    }
  }
}
