// Cost/usage recorder — server-only (nodejs routes only; never imported by
// instrumentation.ts or any edge bundle). Increments a per-day aggregate
// doc (costTracking/{YYYY-MM-DD}) with token + estimated-cost totals,
// broken down by model key AND (when the request supplied it) by class and
// by teacher. Best-effort: every error is swallowed so accounting can never
// affect a tutor turn. No PII — only model keys, ids, token counts, and
// cost estimates.

import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { estimateCostUSD } from "./estimate";
import type { LLMUsageRecord } from "@/lib/ai/llm";
import type { CostContext } from "./context";

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Firestore field-path segments can't contain . ~ * / [ ]. Firebase UIDs and
// class ids are alphanumeric, but sanitise defensively so a malformed id can
// never corrupt the aggregate doc's structure.
function safeSegment(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
}

export interface UsageIncrements {
  setFields: { day: string; updatedAt: number };
  // fieldPath → numeric delta (caller wraps each in FieldValue.increment)
  increments: Record<string, number>;
}

// Pure: compute the per-day aggregate deltas for one LLM call. Tested
// directly so the attribution maths is pinned without Firestore.
export function buildUsageIncrements(
  u: LLMUsageRecord,
  attribution: CostContext | undefined,
  now: number
): UsageIncrements {
  const input = u.inputTokens ?? 0;
  const output = u.outputTokens ?? 0;
  const cost = estimateCostUSD(u.model, input, output);

  const increments: Record<string, number> = {
    calls: 1,
    inputTokens: input,
    outputTokens: output,
    costUSD: cost,
    [`byUse.${u.use}.calls`]: 1,
    [`byUse.${u.use}.inputTokens`]: input,
    [`byUse.${u.use}.outputTokens`]: output,
    [`byUse.${u.use}.costUSD`]: cost,
  };

  if (attribution?.classId) {
    const c = safeSegment(attribution.classId);
    increments[`byClass.${c}.calls`] = 1;
    increments[`byClass.${c}.costUSD`] = cost;
  }
  if (attribution?.teacherUid) {
    const t = safeSegment(attribution.teacherUid);
    increments[`byTeacher.${t}.calls`] = 1;
    increments[`byTeacher.${t}.costUSD`] = cost;
  }

  return { setFields: { day: dayKey(now), updatedAt: now }, increments };
}

export async function recordUsage(
  db: Firestore,
  u: LLMUsageRecord,
  attribution?: CostContext,
  now = Date.now()
): Promise<void> {
  try {
    const { setFields, increments } = buildUsageIncrements(u, attribution, now);
    const update: Record<string, unknown> = { ...setFields };
    for (const [path, delta] of Object.entries(increments)) {
      update[path] = FieldValue.increment(delta);
    }
    await db.collection("costTracking").doc(setFields.day).set(update, { merge: true });
  } catch {
    /* best-effort — never throw into the LLM path */
  }
}
