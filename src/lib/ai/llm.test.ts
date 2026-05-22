import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { callLLM } from "./llm";
import { registerProvider } from "./providers";
import type { LLMProvider, ProviderGenerateRequest, ProviderGenerateResult } from "./providers/types";

// The headline handover criterion: a different LLM backend can be
// dropped in by registering an adapter + setting LLM_PROVIDER, with NO
// changes to callers. These tests prove the swap and the graceful
// fallback, with no network and no Gemini key.

const originalProvider = process.env.LLM_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = originalProvider;
});

describe("callLLM — provider swap (handover seam)", () => {
  beforeEach(() => {
    // A stub adapter standing in for "Unified's own model gateway".
    const stub: LLMProvider = {
      name: "stub",
      available: () => true,
      async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
        return {
          text: req.responseSchema ? '{"ok":true}' : `STUB:${req.model}:${req.messages.at(-1)?.content}`,
          usage: { inputTokens: 1, outputTokens: 2 },
        };
      },
    };
    registerProvider("stub", () => stub);
    process.env.LLM_PROVIDER = "stub";
  });

  it("routes a tutor call through the swapped provider unchanged", async () => {
    const r = await callLLM({
      use: "tutor",
      system: "be a coach",
      messages: [{ role: "user", content: "why are leaves green?" }],
    });
    expect(r.fallbackUsed).toBe(false);
    expect(r.text).toContain("STUB:");
    expect(r.text).toContain("why are leaves green?");
    // modelUsed is still the app's mapped model id — the seam maps keys,
    // the provider only sees the concrete model.
    expect(r.modelUsed).toBeTruthy();
  });

  it("parses structured JSON output from the swapped provider", async () => {
    const r = await callLLM({
      use: "classifier",
      system: "classify",
      messages: [{ role: "user", content: "..." }],
      responseSchema: { type: "object" },
    });
    expect(r.fallbackUsed).toBe(false);
    expect(r.json).toEqual({ ok: true });
  });
});

describe("callLLM — graceful degradation", () => {
  it("falls back deterministically when the provider is unavailable", async () => {
    registerProvider("offline", () => ({
      name: "offline",
      available: () => false,
      async generate() {
        throw new Error("should not be called when unavailable");
      },
    }));
    process.env.LLM_PROVIDER = "offline";
    const r = await callLLM({
      use: "tutor",
      system: "x",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(r.fallbackUsed).toBe(true);
    expect(r.text).toContain("[LLM fallback");
    expect(r.text).toContain("hello");
  });

  it("falls back when the provider throws mid-generation", async () => {
    registerProvider("flaky", () => ({
      name: "flaky",
      available: () => true,
      async generate() {
        throw new Error("upstream 503");
      },
    }));
    process.env.LLM_PROVIDER = "flaky";
    const r = await callLLM({ use: "scaffold", system: "x", messages: [{ role: "user", content: "hi" }] });
    expect(r.fallbackUsed).toBe(true);
    expect(r.text).toContain("upstream 503");
  });

  it("falls back when LLM_PROVIDER names an unregistered backend", async () => {
    process.env.LLM_PROVIDER = "does-not-exist";
    const r = await callLLM({ use: "tutor", system: "x", messages: [{ role: "user", content: "hi" }] });
    expect(r.fallbackUsed).toBe(true);
  });
});
