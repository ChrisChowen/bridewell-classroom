// Cost/usage recorder — server-only (nodejs routes only; never imported by
// instrumentation.ts or any edge bundle). Increments a per-day aggregate
// doc (costTracking/{YYYY-MM-DD}) with token + estimated-cost totals,
// broken down by model key. Best-effort: every error is swallowed so
// accounting can never affect a tutor turn. No PII — only model keys,
// token counts, and cost estimates.

import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { estimateCostUSD } from "./estimate";
import type { LLMUsageRecord } from "@/lib/ai/llm";

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export async function recordUsage(db: Firestore, u: LLMUsageRecord, now = Date.now()): Promise<void> {
  try {
    const input = u.inputTokens ?? 0;
    const output = u.outputTokens ?? 0;
    const cost = estimateCostUSD(u.model, input, output);
    const ref = db.collection("costTracking").doc(dayKey(now));
    await ref.set(
      {
        day: dayKey(now),
        updatedAt: now,
        calls: FieldValue.increment(1),
        inputTokens: FieldValue.increment(input),
        outputTokens: FieldValue.increment(output),
        costUSD: FieldValue.increment(cost),
        [`byUse.${u.use}.calls`]: FieldValue.increment(1),
        [`byUse.${u.use}.inputTokens`]: FieldValue.increment(input),
        [`byUse.${u.use}.outputTokens`]: FieldValue.increment(output),
        [`byUse.${u.use}.costUSD`]: FieldValue.increment(cost),
      },
      { merge: true },
    );
  } catch {
    /* best-effort — never throw into the LLM path */
  }
}
