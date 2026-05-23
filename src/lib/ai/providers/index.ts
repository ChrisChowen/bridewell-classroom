// Provider registry + selector — the single place that decides which
// LLM backend the app talks to.
//
// HANDOVER: to point Bridewell Classroom at a different model backend,
//   1. write an adapter implementing LLMProvider (see ./gemini.ts),
//   2. registerProvider("yourname", () => new YourProvider()),
//   3. set LLM_PROVIDER=yourname in the environment.
// No caller, route, or layers/ module changes. That is the whole swap.

import type { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

type ProviderFactory = () => LLMProvider;

const registry = new Map<string, ProviderFactory>();
const instances = new Map<string, LLMProvider>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  registry.set(name.toLowerCase(), factory);
  // Drop any cached instance so re-registration (e.g. in tests) takes effect.
  instances.delete(name.toLowerCase());
}

/**
 * Resolve the active provider from LLM_PROVIDER (default "gemini").
 * Instances are memoised per name. Throws if the name is unregistered —
 * callLLM catches this and serves a fallback rather than crashing.
 */
export function resolveProvider(): LLMProvider {
  const name = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  const cached = instances.get(name);
  if (cached) return cached;
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown LLM_PROVIDER "${name}". Registered: ${[...registry.keys()].join(", ") || "(none)"}`
    );
  }
  const instance = factory();
  instances.set(name, instance);
  return instance;
}

// Built-in providers. Adding more here (or via registerProvider from app
// bootstrap) is how Unified extends the backend set.
registerProvider("gemini", () => new GeminiProvider());
// OpenAI / GPT-5.2 — the model Unified Projects run for the schools. Select
// with LLM_PROVIDER=openai + OPENAI_API_KEY (model ids in models.ts).
registerProvider("openai", () => new OpenAIProvider());
