import { NextResponse } from "next/server";
import {
  evaluateReasonResponse,
  type ReasonEvaluatorInput,
} from "@/layers/evaluator";
import { shapeResponse } from "@/layers/responder";
import "@/lib/cost/recorder"; // best-effort LLM usage recorder (nodejs side-effect)
import { getAdmin } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
  const limited = await enforceRateLimit(req, RATE_LIMITS.reasonEvaluate);
  if (limited) return limited;

  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.concept || !body.pupilResponse || !body.promptType) {
    return NextResponse.json(
      { error: "idToken, concept, promptType, pupilResponse required" },
      { status: 400 }
    );
  }

  const auth = await verifyAuthToken(body.idToken);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const uid = auth.user.uid;

  const evaluation = await evaluateReasonResponse(body);
  const response = shapeResponse({ evaluation, concept: body.concept });

  // Persist onto the reasonEvent doc.
  const pupil = await resolveDataStore().getPupil(uid);
  const classId = pupil?.classId ?? null;

  const eventPayload = {
    pupilId: uid,
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

  // The client supplies eventId (from /api/reason/fire) so we update the
  // same doc. But a malicious pupil could pass another pupil's eventId to
  // clobber their reasonEvent. Verify ownership before merging; if the doc
  // doesn't exist or belongs to someone else, write a fresh event instead.
  if (body.eventId) {
    const existing = await a.db.collection("reasonEvents").doc(body.eventId).get();
    if (existing.exists && (existing.data() as { pupilId?: string }).pupilId === uid) {
      await existing.ref.set(eventPayload, { merge: true });
    } else {
      await a.db.collection("reasonEvents").add(eventPayload);
    }
  } else {
    await a.db.collection("reasonEvents").add(eventPayload);
  }

  // Append to the RTDB Reason trajectory on the pupil's live mirror.
  if (classId) {
    const liveRef = a.rtdb.ref(`liveSessions/${classId}/pupils/${uid}`);
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
