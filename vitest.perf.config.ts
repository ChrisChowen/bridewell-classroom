import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Isolated perf-gate config — runs ONLY src/lib/perf.bench.test.ts, alone, so
// its timing isn't disturbed by the rest of the suite (the 30% ratio gate is
// stable in isolation but flaky under shared-suite CPU contention). Invoked by
// `npm run bench` (scripts/benchmark.mjs) and gated as its own CI step.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/lib/perf.bench.test.ts"],
    environment: "node",
    globals: false,
    // Single-threaded, no parallelism, to keep timings clean.
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "server-only": resolve(__dirname, "./src/test/empty-module.ts"),
    },
  },
});
