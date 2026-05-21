import { NextResponse } from "next/server";
import {
  evaluateReasonResponse,
  type ReasonEvaluatorInput,
} from "@/layers/evaluator";
import { shapeResponse } from "@/layers/responder";
import { getAdmin } from "@/lib/firebase/admin";

// POST /api/reason/evaluate
//
// Body: ReasonEvaluatorInput + {
//   idToken,         // pupil's Firebase ID token
//   eventId?,        // /api/reason/fire returned this; we update the doc
// }
//
// Runs the evaluator (real Pro structured-output), branches via the
// responder, persists the response onto the existing reasonEvent doc
// (or creates one if missing), and updates the pupil's RTDB live mirror
// so the teacher's Reason-confidence trajectory ticks up immediately.

interface Body extends ReasonEvaluatorInput {
  idToken: string;
  eventId?: string;
}

const MAX_TRAJECTORY = 12;

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.concept || !body.pupilResponse || !body.promptType) {
    return NextResponse.json(
      { error: "idToken, concept, promptType, pupilResponse required" },
      { status: 400 }
    );
  }

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const evaluation = await evaluateReasonResponse(body);
  const response = shapeResponse({ evaluation, concept: body.concept });

  // Persist onto the reasonEvent doc.
  const pupilSnap = await a.db.collection("pupils").doc(decoded.uid).get();
  const classId = pupilSnap.exists ? (pupilSnap.data() as { classId: string }).classId : null;

  const eventPayload = {
    pupilId: decoded.uid,
    classId,
    timestamp: Date.now(),
    promptType: body.promptType,
    promptText: body.promptText,
    pupilResponse: body.pupilResponse,
    concept: body.concept,
    confidence: evaluation.confidence,
    branch: evaluation.branch,
    rationale: evaluation.rationale,
    weakestSegment: evaluation.weakestSegment ?? null,
    followUp: evaluation.followUp ?? null,
    status: "answered",
  };

  if (body.eventId) {
    await a.db.collection("reasonEvents").doc(body.eventId).set(eventPayload, { merge: true });
  } else {
    await a.db.collection("reasonEvents").add(eventPayload);
  }

  // Append to the RTDB Reason trajectory on the pupil's live mirror.
  if (classId) {
    const liveRef = a.rtdb.ref(`liveSessions/${classId}/pupils/${decoded.uid}`);
    const cur = (await liveRef.get()).val() as { reasonTrajectory?: Array<{ confidence: number; branch: string; t: number }>} | null;
    const next = [
      ...((cur?.reasonTrajectory ?? []) as Array<{ confidence: number; branch: string; t: number }>),
      { confidence: evaluation.confidence, branch: evaluation.branch, t: Date.now() },
    ].slice(-MAX_TRAJECTORY);
    await liveRef.update({
      reasonTrajectory: next,
      reasonConfidenceTrailing: evaluation.confidence,
      reasonBranchTrailing: evaluation.branch,
    });
  }

  return NextResponse.json({ evaluation, response });
}
