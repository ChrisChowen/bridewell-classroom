import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Unit-test config. Scope is deliberately the PURE logic — the Reason
// trigger/responder, prompt construction, join-code + rate-limit
// helpers — i.e. the safety-critical decision code that must never
// silently regress under autonomous work. LLM-calling modules
// (classifier, evaluator, lessonPlanner) are integration-tested
// elsewhere, not here, so the unit suite stays fast and deterministic
// with no network.
export default defineConfig({
  // Use React's automatic JSX runtime so component tests (.tsx) don't need
  // an explicit `import React` (matching the Next build).
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // Emulator-backed tests run under vitest.emulator.config.ts so the
    // default suite stays fast + emulator-free.
    exclude: ["**/node_modules/**", "src/**/*.emulator.test.ts"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: [
        "src/layers/trigger.ts",
        "src/layers/responder.ts",
        "src/lib/joinCode.ts",
        "src/lib/rate-limit.ts",
        "src/lib/ai/prompts.ts",
        "src/lib/ai/llm.ts",
        "src/lib/ai/providers/index.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // `server-only` is a build-time guard with no node entry point;
      // alias it to an empty module so server code imported transitively
      // by a unit-under-test (e.g. rate-limit → admin) can load.
      "server-only": resolve(__dirname, "./src/test/empty-module.ts"),
    },
  },
});
