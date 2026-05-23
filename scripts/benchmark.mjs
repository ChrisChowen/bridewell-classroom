#!/usr/bin/env node
//
// Perf baseline + regression gate (the goal's "scripts/benchmark.mjs; CI gates
// p95 regression ≥30%" stream). The actual benchmark lives in
// src/lib/perf.bench.test.ts so it imports the REAL TypeScript hot-path
// functions and rides the existing vitest CI job (no separate runner). It
// normalises each op against a fixed calibration loop measured in the same
// process — the ratio is machine-independent — takes the median over rounds,
// and fails if any op's ratio regresses ≥30% vs scripts/perf-baseline.json.
//
// USAGE
//   node scripts/benchmark.mjs           # run the gate (compare to baseline)
//   node scripts/benchmark.mjs --write   # regenerate the baseline after an
//                                        # intentional perf-affecting change
import { spawnSync } from "node:child_process";

const write = process.argv.includes("--write");
const env = { ...process.env };
if (write) env.WRITE_PERF_BASELINE = "1";

const r = spawnSync("npx", ["vitest", "run", "-c", "vitest.perf.config.ts"], {
  stdio: "inherit",
  env,
});
process.exit(r.status ?? 1);
