import { NextResponse } from "next/server";
import {
  evaluateReasonResponse,
  type ReasonEvaluatorInput,
} from "@/layers/evaluator";
import { shapeResponse } from "@/layers/responder";
import { mentionsUnsupportedVisual } from "@/lib/ai/output-guards";
import "@/lib/cost/recorder"; // best-effort LLM usage recorder (nodejs side-effect)
import { getAdmin } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import { runWithCostContext } from "@/lib/cost/context";
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

  // Resolve the class up-front so the Pro-tier evaluator spend is booked to
  // it (cost attribution). Reused below for the persisted event + trajectory.
  const pupil = await resolveDataStore().getPupil(uid);
  const classId = pupil?.classId ?? null;

  const evaluation = await runWithCostContext(
    { classId: classId ?? undefined },
    () => evaluateReasonResponse(body)
  );
  const response = shapeResponse({ evaluation, concept: body.concept });

  // Same text-only defence-in-depth as /api/chat: the Reason soft-challenge
  // follow-up is LLM-generated and shown to the pupil, so log any slip that
  // promises a visual the tutor can't deliver (no PII — event only).
  if (response.tutorTurn && mentionsUnsupportedVisual(response.tutorTurn)) {
    console.warn(`tutor output guard: reason ${evaluation.branch} follow-up promised an unsupported visual`);
  }

  // Persist onto the reasonEvent doc (pupil/classId resolved above).
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

  // Append to the RTDB Reason trajectory on the pupil's live mirror. Use a
  // transaction (not get-then-update) so two near-simultaneous evaluate calls
  // can't drop a trajectory entry — matching the hardened engagement/run path.
  // (Admin SDK bypasses rules, so writing the whole node back is safe here.)
  if (classId) {
    type ReasonPoint = { confidence: number; branch: string; t: number };
    const liveRef = a.rtdb.ref(`liveSessions/${classId}/pupils/${uid}`);
    await liveRef.transaction((cur) => {
      const c = (cur ?? {}) as { reasonTrajectory?: ReasonPoint[] };
      const reasonTrajectory = [
        ...((c.reasonTrajectory ?? []) as ReasonPoint[]),
        { confidence: evaluation.confidence, branch: evaluation.branch, t: Date.now() },
      ].slice(-MAX_TRAJECTORY);
      return {
        ...c,
        reasonTrajectory,
        reasonConfidenceTrailing: evaluation.confidence,
        reasonBranchTrailing: evaluation.branch,
      };
    });
  }

  return NextResponse.json({ evaluation, response });
}
