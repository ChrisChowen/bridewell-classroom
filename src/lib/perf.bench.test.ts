import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { escapeCsvCell, toCsv } from "./research-export";
import { createZip } from "./zip";
import { normaliseJoinCode } from "./joinCode";
import { formatLogLine } from "./log";
import { buildTutorSystemPrompt } from "./ai/prompts";

// Perf gate (the "scripts/benchmark.mjs / CI gates p95 regression ≥30%" stream,
// run here so it imports the real TS hot-path functions and rides the existing
// vitest CI job). Absolute timings differ wildly across machines, so we
// normalise every op against a fixed CALIBRATION loop measured in the same
// process — the resulting RATIO is machine-independent. Each op + the
// calibration are measured over several rounds and the MEDIAN taken to damp
// scheduler jitter. The committed baseline (scripts/perf-baseline.json) stores
// ratios; the gate fails only if an op's ratio regresses ≥30% — generous
// enough to never flake on CI noise, tight enough to catch a real regression.
//
// Re-baseline after an intentional change:  WRITE_PERF_BASELINE=1 npm test

const BASELINE_PATH = resolve(__dirname, "../../scripts/perf-baseline.json");
const ROUNDS = 9;
const TOLERANCE = 1.3; // ≥30% regression fails

// Use the MINIMUM across rounds (best case = the least scheduler/GC-disturbed
// measurement). For both the op and the calibration this is far more stable
// under shared-test-run CPU contention than the median, so the ratio gate
// catches real regressions without flaking on noise.
function best(xs: number[]): number {
  return Math.min(...xs);
}

// Fixed-cost calibration: a deterministic CPU loop. Its time is the "unit".
function calibrationOnce(): number {
  const t = performance.now();
  let acc = 0;
  for (let i = 0; i < 2_000_000; i++) acc += (i * 31 + 7) % 13;
  if (acc === -1) throw new Error("unreachable");
  return performance.now() - t;
}

function timeOnce(fn: () => void, iters: number): number {
  const t = performance.now();
  for (let i = 0; i < iters; i++) fn();
  return performance.now() - t;
}

// Representative pure hot-path ops + their iteration counts (sized so each
// round is a few ms — comparable to the calibration loop).
const longCell = "=cmd|'/c calc'!A1, with \"quotes\" and a comma";
const csvRows = Array.from({ length: 120 }, (_, i) => [`P${i}`, "flowing", 0.9, "pro"]);
const zipFiles = [
  { name: "a.csv", content: "id,state\r\n" + "P1,flowing\r\n".repeat(120) },
  { name: "b.csv", content: "x,y\r\n1,2\r\n".repeat(120) },
];
const OPS: Record<string, { fn: () => void; iters: number }> = {
  escapeCsvCell: { fn: () => escapeCsvCell(longCell), iters: 50_000 },
  toCsv: { fn: () => toCsv(["participantId", "state", "confidence", "tier"], csvRows), iters: 500 },
  createZip: { fn: () => createZip(zipFiles), iters: 500 },
  normaliseJoinCode: { fn: () => normaliseJoinCode("abc-def"), iters: 200_000 },
  formatLogLine: { fn: () => formatLogLine("info", { route: "chat", classId: "c1", durationMs: 42 }), iters: 50_000 },
  buildTutorSystemPrompt: {
    fn: () =>
      buildTutorSystemPrompt({
        mode: "coach",
        lessonTitle: "Photosynthesis",
        lessonSubject: "Biology",
        criticalConcepts: ["chlorophyll absorbs light", "glucose is the product"],
      }),
    iters: 20_000,
  },
};

function measureRatios(): Record<string, number> {
  const ratios: Record<string, number> = {};
  for (const [name, { fn, iters }] of Object.entries(OPS)) {
    const opTimes: number[] = [];
    const calTimes: number[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      fn(); // warm
      calTimes.push(calibrationOnce());
      opTimes.push(timeOnce(fn, iters));
    }
    ratios[name] = best(opTimes) / best(calTimes);
  }
  return ratios;
}

describe("perf gate (ratio-normalised, ≥30% regression fails)", () => {
  it("no hot-path op regressed beyond tolerance vs the committed baseline", () => {
    const ratios = measureRatios();

    if (process.env.WRITE_PERF_BASELINE === "1" || !existsSync(BASELINE_PATH)) {
      writeFileSync(
        BASELINE_PATH,
        JSON.stringify(
          { note: "Machine-independent op:calibration time ratios. Regenerate with WRITE_PERF_BASELINE=1.", tolerance: TOLERANCE, ratios },
          null,
          2,
        ) + "\n",
      );
      // First write (or explicit re-baseline) — nothing to compare against.
      expect(Object.keys(ratios).length).toBeGreaterThan(0);
      return;
    }

    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as { ratios: Record<string, number> };
    const regressions: string[] = [];
    for (const [name, ratio] of Object.entries(ratios)) {
      const base = baseline.ratios[name];
      if (base == null) continue; // new op — picked up on next re-baseline
      if (ratio > base * TOLERANCE) {
        regressions.push(`${name}: ratio ${ratio.toFixed(2)} vs baseline ${base.toFixed(2)} (>${Math.round((TOLERANCE - 1) * 100)}%)`);
      }
    }
    expect(regressions, regressions.join("\n")).toEqual([]);
  });
});
