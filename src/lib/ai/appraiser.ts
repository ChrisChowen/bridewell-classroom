// Post-class appraisal — reads the engagement snapshots, Reason events,
// safeguarding events, and conversation excerpts from one class, and
// asks Gemini Pro to produce a structured appraisal of the lesson plan
// (NOT of the pupils). Output is what a senior teacher would say to a
// colleague who's about to teach the same plan: what worked, what to
// adjust, a 1–5 rating.

import "server-only";
import { callLLM } from "./llm";
import type { LessonAppraisal, LessonPlan } from "@/types";

const SYSTEM = `You appraise a completed AI-tutor lesson plan, not the pupils. A senior
teacher has finished running this plan with their class. You will be
given the plan, the engagement classifier outcomes across the class,
the count of safeguarding flags raised, the count and accept-rate of
Reason events, and a small sample of pupil-tutor exchanges.

Your job is to write the appraisal a colleague would want to read
before teaching the same plan tomorrow. Be specific. Cite the parts of
the sequence that worked and the parts that produced wheel-spinning
or off-task drift. Be willing to give the plan a low rating if the
data justifies it.

Output strict JSON only.`;

const SCHEMA = {
  type: "object",
  properties: {
    rating: { type: "integer", minimum: 1, maximum: 5 },
    summary: { type: "string" },
    whatWorked: { type: "array", items: { type: "string" }, maxItems: 5 },
    whatToAdjust: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
  required: ["rating", "summary", "whatWorked", "whatToAdjust"],
} as const;

export interface AppraiseInput {
  plan: LessonPlan;
  snapshots: Array<{ state: string; confidence: number; rationale?: string; pupilId?: string }>;
  reasonEvents: Array<{ branch?: string; confidence?: number }>;
  safeguardingCount: number;
  conversationSample: string; // joined transcript, maybe truncated
}

export async function appraiseLesson(
  input: AppraiseInput
): Promise<LessonAppraisal & { fallbackUsed: boolean }> {
  const statesObserved: Record<string, number> = {};
  for (const s of input.snapshots) {
    statesObserved[s.state] = (statesObserved[s.state] ?? 0) + 1;
  }

  const reasonAcceptCount = input.reasonEvents.filter((r) => r.branch === "accept").length;
  const reasonAcceptRate = input.reasonEvents.length
    ? reasonAcceptCount / input.reasonEvents.length
    : undefined;

  // Distinct pupils that produced a classifier snapshot — keyed by pupilId,
  // NOT array index (the classifier fires several times per pupil, so an
  // index-based set just re-counted snapshots). Falls back to the snapshot
  // count only if no ids were supplied.
  const pupilIds = input.snapshots.map((s) => s.pupilId).filter((id): id is string => !!id);
  const metrics: LessonAppraisal["metrics"] = {
    pupilsClassified: pupilIds.length ? new Set(pupilIds).size : input.snapshots.length,
    statesObserved,
    safeguardingEvents: input.safeguardingCount,
    reasonEvents: input.reasonEvents.length,
    reasonAcceptRate,
  };

  const userBlock = [
    `Lesson plan: ${input.plan.title}`,
    `Subject / Year: ${input.plan.subject} · Year ${input.plan.yearGroup}`,
    `Estimated minutes: ${input.plan.estimatedMinutes}`,
    `Sequence:\n${input.plan.sequence
      .map((s, i) => `  ${i + 1}. [${s.activityType}] ${s.title} — ${s.goal}`)
      .join("\n")}`,
    `Critical concepts: ${input.plan.criticalConcepts.join("; ")}`,
    `Tutor addendum (the prompt the teacher approved):\n${input.plan.tutorAddendum}`,
    "",
    `Engagement classifier outcomes (${input.snapshots.length} snapshots):`,
    Object.entries(statesObserved)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n"),
    `Reason events: ${input.reasonEvents.length} fired, accept-rate ${
      reasonAcceptRate !== undefined ? Math.round(reasonAcceptRate * 100) + "%" : "—"
    }`,
    `Safeguarding flags raised at medium+: ${input.safeguardingCount}`,
    "",
    "Conversation sample (truncated):",
    input.conversationSample.slice(0, 6000),
  ].join("\n\n");

  const result = await callLLM({
    use: "reasonEvaluator",
    system: SYSTEM,
    messages: [{ role: "user", content: userBlock }],
    responseSchema: SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 1024,
    temperature: 0.4,
    thinkingBudget: 1024,
  });

  if (result.fallbackUsed || !result.json) {
    return {
      rating: 3,
      summary: "Appraisal generator was unavailable; the plan ran without an AI rating.",
      whatWorked: [],
      whatToAdjust: ["Re-run the appraisal when the LLM is reachable."],
      metrics,
      generatedAt: Date.now(),
      fallbackUsed: true,
    };
  }

  const j = result.json as {
    rating: number;
    summary: string;
    whatWorked: string[];
    whatToAdjust: string[];
  };
  return {
    rating: clampRating(j.rating),
    summary: j.summary,
    whatWorked: j.whatWorked ?? [],
    whatToAdjust: j.whatToAdjust ?? [],
    metrics,
    generatedAt: Date.now(),
    fallbackUsed: false,
  };
}

function clampRating(r: unknown): LessonAppraisal["rating"] {
  const n = Math.max(1, Math.min(5, Math.round(Number(r) || 3)));
  return n as LessonAppraisal["rating"];
}
