import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/auth";
import { selectReasonPrompt } from "@/layers/prompts";
import type { ReasonPromptType } from "@/types";

// POST /api/reason/fire
//
// Pupil session calls this when the trigger layer says Reason should
// fire (scaffold ceiling reached, topic boundary crossed, lesson-design
// concept just explained). Returns the prompt the tutor will show; the
// pupil session then renders the gold Reason card inline.
//
// We do not run the evaluator here — that happens at /api/reason/evaluate
// once the pupil has written their response.
//
// Body:
//   idToken, trigger, concept, subject?, priorTutorTurn?
//   lastType?: previously-fired prompt type so the selector avoids
//              repeats

interface Body {
  idToken: string;
  trigger: "scaffolding_ceiling" | "topic_boundary" | "teacher" | "lesson_design";
  concept: string;
  subject?: string;
  priorTutorTurn?: string;
  lastType?: ReasonPromptType;
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.concept || !body.trigger) {
    return NextResponse.json({ error: "idToken, trigger, concept required" }, { status: 400 });
  }
  const auth = await verifyAuthToken(body.idToken);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const pupilSnap = await a.db.collection("pupils").doc(auth.user.uid).get();
  if (!pupilSnap.exists) {
    return NextResponse.json({ error: "No pupil record" }, { status: 404 });
  }
  const { classId, displayName } = pupilSnap.data() as { classId: string; displayName: string };

  const picked = selectReasonPrompt({
    concept: body.concept,
    subject: body.subject,
    lastType: body.lastType,
    seed: Date.now(),
  });

  // Log the firing as a Reason event in Firestore (response will land
  // later via /api/reason/evaluate which updates this same event).
  const ref = await a.db.collection("reasonEvents").add({
    pupilId: auth.user.uid,
    pupilDisplayName: displayName,
    classId,
    timestamp: Date.now(),
    trigger: body.trigger,
    promptType: picked.type,
    promptText: picked.text,
    concept: body.concept,
    priorTutorTurn: body.priorTutorTurn ?? null,
    status: "pending",
  });

  return NextResponse.json({
    eventId: ref.id,
    promptType: picked.type,
    promptText: picked.text,
  });
}
