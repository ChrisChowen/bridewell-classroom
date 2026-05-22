// Types for the plain-ESM metric module so the TS unit test + tsc are
// happy. The implementation lives in reason-eval-metrics.mjs (single
// source of the maths).

export const STATES: string[];

export interface Pair {
  gold: string;
  predicted: string;
}
export interface Pred extends Pair {
  confidence: number;
}

export interface ClassMetrics {
  tp: number;
  fp: number;
  fn: number;
  support: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface ConfusionResult {
  matrix: Record<string, Record<string, number>>;
  total: number;
  correct: number;
  accuracy: number;
}

export interface PrfResult {
  perClass: Record<string, ClassMetrics>;
  macro: { precision: number | null; recall: number | null; f1: number | null };
}

export interface CalibrationBucket {
  range: [number, number];
  n: number;
  accuracy: number | null;
  meanConfidence: number | null;
}

export interface CalibrationResult {
  buckets: CalibrationBucket[];
  ece: number | null;
}

export function confusionMatrix(pairs: Pair[], labels?: string[]): ConfusionResult;
export function prf(pairs: Pair[], labels?: string[]): PrfResult;
export function pairwise(
  pairs: Pair[],
  a?: string,
  b?: string,
): PrfResult & { confusion: ConfusionResult };
export function calibration(preds: Pred[], bucketEdges?: number[]): CalibrationResult;
export function round(v: number | null, dp?: number): number | null;
