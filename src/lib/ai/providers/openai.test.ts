import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIProvider } from "./openai";
import type { ProviderGenerateRequest } from "./types";

// Verifies the GPT-5.2 adapter's request mapping + response/stream parsing by
// mocking the HTTP layer — the adapter can't be hit live here (no key), so
// this is what "ensures it works": the Responses-API request shape is correct
// and the response is parsed into the seam's result type.

const baseReq: ProviderGenerateRequest = {
  model: "gpt-5.2",
  system: "You are a tutor.",
  messages: [{ role: "user", content: "Hello" }],
  maxOutputTokens: 200,
  temperature: 0.55,
  thinkingBudget: 0,
  grounding: false,
};

function mockJsonFetch(payload: unknown) {
  const fn = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function bodyOf(fn: ReturnType<typeof vi.fn>) {
  const init = (fn.mock.calls[0] as unknown as [string, { body: string }])[1];
  return JSON.parse(init.body);
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "sk-test";
});
afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.restoreAllMocks();
});

describe("OpenAIProvider.available", () => {
  it("is true only with a key", () => {
    expect(new OpenAIProvider().available()).toBe(true);
    delete process.env.OPENAI_API_KEY;
    expect(new OpenAIProvider().available()).toBe(false);
  });
});

describe("OpenAIProvider.generate — request mapping", () => {
  it("maps to the Responses API shape (instructions/input/reasoning/no temperature)", async () => {
    const fn = mockJsonFetch({ output_text: "Hi there", usage: { input_tokens: 5, output_tokens: 3 } });
    const r = await new OpenAIProvider().generate(baseReq);

    const [url, init] = fn.mock.calls[0] as unknown as [
      string,
      { method: string; headers: Record<string, string> },
    ];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test");

    const body = bodyOf(fn);
    expect(body.model).toBe("gpt-5.2");
    expect(body.instructions).toBe("You are a tutor.");
    expect(body.input).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.reasoning).toEqual({ effort: "none" }); // thinkingBudget 0
    expect(body.max_output_tokens).toBeGreaterThanOrEqual(2048); // reasoning headroom
    expect("temperature" in body).toBe(false); // GPT-5.2 reasoning model
    expect("tools" in body).toBe(false);
    expect("text" in body).toBe(false);

    expect(r.text).toBe("Hi there");
    expect(r.usage).toEqual({ inputTokens: 5, outputTokens: 3 });
  });

  it("maps responseSchema to text.format json_schema", async () => {
    const fn = mockJsonFetch({ output_text: "{}" });
    await new OpenAIProvider().generate({
      ...baseReq,
      responseSchema: { type: "object", properties: { state: { type: "string" } } },
    });
    const body = bodyOf(fn);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.schema).toEqual({ type: "object", properties: { state: { type: "string" } } });
    expect("tools" in body).toBe(false); // schema + web search are mutually exclusive
  });

  it("maps grounding to the web_search tool", async () => {
    const fn = mockJsonFetch({ output_text: "answer" });
    await new OpenAIProvider().generate({ ...baseReq, grounding: true });
    const body = bodyOf(fn);
    expect(body.tools).toEqual([{ type: "web_search" }]);
  });

  it("maps thinkingBudget to reasoning effort tiers", async () => {
    for (const [budget, effort] of [
      [undefined, "medium"],
      [0, "none"],
      [256, "low"],
      [1024, "medium"],
      [4096, "high"],
    ] as const) {
      const fn = mockJsonFetch({ output_text: "x" });
      await new OpenAIProvider().generate({ ...baseReq, thinkingBudget: budget });
      expect(bodyOf(fn).reasoning.effort).toBe(effort);
      vi.restoreAllMocks();
      process.env.OPENAI_API_KEY = "sk-test";
    }
  });

  it("extracts url_citation annotations from the output", async () => {
    const fn = mockJsonFetch({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: "Plants photosynthesise.",
              annotations: [
                { type: "url_citation", url: "https://bbc.co.uk/bitesize", title: "Bitesize" },
              ],
            },
          ],
        },
      ],
    });
    const r = await new OpenAIProvider().generate({ ...baseReq, grounding: true });
    void fn;
    expect(r.text).toBe("Plants photosynthesise.");
    expect(r.citations).toEqual([{ uri: "https://bbc.co.uk/bitesize", title: "Bitesize" }]);
  });

  it("throws on a non-ok response (callLLM catches → fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, text: async () => "rate limited" })),
    );
    await expect(new OpenAIProvider().generate(baseReq)).rejects.toThrow(/429/);
  });
});

describe("OpenAIProvider.generateStream — SSE parsing", () => {
  function sseStream(frames: string[]) {
    const encoder = new TextEncoder();
    let i = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i < frames.length) controller.enqueue(encoder.encode(frames[i++]));
        else controller.close();
      },
    });
  }

  it("yields output_text deltas and stops at [DONE]", async () => {
    const frames = [
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "What " })}\n\n`,
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "part " })}\n\n`,
      `data: ${JSON.stringify({ type: "response.reasoning.delta", delta: "(ignored)" })}\n\n`,
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "catches light?" })}\n\n`,
      `data: [DONE]\n\n`,
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, body: sseStream(frames) })),
    );
    const out: string[] = [];
    for await (const d of new OpenAIProvider().generateStream(baseReq)) out.push(d);
    expect(out.join("")).toBe("What part catches light?");
  });
});
