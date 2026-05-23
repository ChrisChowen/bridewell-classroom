import { NextResponse } from "next/server";
import "@/lib/cost/recorder"; // best-effort usage recorder (nodejs side-effect)
import { classifyEngagement, type ClassifierInput } from "@/layers/classifier";

// POST /api/engagement/classify — EVAL-ONLY classifier endpoint.
//
// Runs the REAL engagement classifier on supplied turns/signals and returns
// the result, with NO auth and NO persistence. This is the seam the
// ground-truth eval harness (scripts/reason-eval.mjs) grades against, so the
// numbers come from the exact production classifier (no re-implementation
// drift). Because it is unauthenticated, it is DISABLED in production
// (would otherwise be a cost-abuse vector) — eval runs against a dev server
// or a preview build with NODE_ENV !== "production".

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as ClassifierInput | null;
  if (!body || !Array.isArray(body.turns) || !body.signals) {
    return NextResponse.json({ error: "turns and signals required" }, { status: 400 });
  }

  const result = await classifyEngagement({
    turns: body.turns,
    signals: body.signals,
    lessonTitle: body.lessonTitle,
    lessonSubject: body.lessonSubject,
    criticalConcepts: body.criticalConcepts,
    pupilProfile: body.pupilProfile,
  });

  return NextResponse.json(result);
}
