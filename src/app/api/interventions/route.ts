import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";

// POST /api/interventions
//
// Teacher-only. Writes a single intervention to RTDB that the pupil
// session subscribes to. The pupil renders the appropriate effect:
//   - "hint": injects a distinct teacher-coloured message into the chat
//   - "mode_one_turn": next tutor turn runs in Expert mode with a brief
//     teacher-supplied rationale
//   - "pair_up": gentle banner asking the pupil to pair with a named peer
//   - "pause": disables the pupil's chat input until the teacher resumes
//   - "mark_reviewed": no pupil-facing effect; clears the dashboard flag
//
// Also class-wide:
//   - "wrap_up": session status → "wrap_up"; pupils get a closing nudge
//   - "end": session status → "ended"; pupils land on the closing screen
//   - "resume": session status → "active"; clears pause
//
// Auth: Bearer ID token with role==='teacher'.

interface Body {
  classId: string;
  pupilId?: string; // required for per-pupil actions
  type:
    | "hint"
    | "mode_one_turn"
    | "pair_up"
    | "pause"
    | "mark_reviewed"
    | "wrap_up"
    | "end"
    | "resume";
  text?: string;
  rationale?: string;
  pairWith?: string; // displayName of the partner pupil
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (decoded.role !== "teacher") {
    return NextResponse.json({ error: "Teacher role required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.classId || !body.type) {
    return NextResponse.json({ error: "classId and type required" }, { status: 400 });
  }

  const classSnap = await a.db.collection("classes").doc(body.classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if ((classSnap.data() as { teacherId: string }).teacherId !== decoded.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }

  const now = Date.now();

  // Class-wide status updates.
  if (body.type === "wrap_up" || body.type === "end" || body.type === "resume" || body.type === "pause") {
    const statusMap = {
      pause: "paused",
      resume: "active",
      wrap_up: "wrap_up",
      end: "ended",
    } as const;
    // Class-wide pause is a different flavour from per-pupil pause; we
    // route a per-pupil pause through the pupilId-targeted intervention
    // below if a pupilId is supplied.
    if (body.type === "pause" && body.pupilId) {
      await a.rtdb.ref(`liveSessions/${body.classId}/interventions/${body.pupilId}`).push({
        type: "pause",
        ts: now,
      });
    } else {
      await a.rtdb.ref(`liveSessions/${body.classId}/status`).set({
        value: statusMap[body.type],
        ts: now,
        wrapUpNote: body.type === "wrap_up" ? body.text ?? null : null,
      });
    }
  }

  // Per-pupil interventions.
  if (
    body.type === "hint" ||
    body.type === "mode_one_turn" ||
    body.type === "pair_up" ||
    body.type === "mark_reviewed"
  ) {
    if (!body.pupilId) {
      return NextResponse.json({ error: "pupilId required for this intervention type" }, { status: 400 });
    }
    // Verify the pupil is in this class — class ownership alone isn't
    // enough, since a teacher could otherwise act on pupils outside
    // their classroom by spoofing a pupilId.
    const pupilSnap = await a.db.collection("pupils").doc(body.pupilId).get();
    if (!pupilSnap.exists || (pupilSnap.data() as { classId?: string }).classId !== body.classId) {
      return NextResponse.json({ error: "That pupil is not in this class" }, { status: 403 });
    }
    if (body.type === "mark_reviewed") {
      // Clears the safeguarding flag (if any) on the pupil's live mirror.
      await a.rtdb.ref(`liveSessions/${body.classId}/pupils/${body.pupilId}/safeguarding`).set(null);
    } else {
      await a.rtdb.ref(`liveSessions/${body.classId}/interventions/${body.pupilId}`).push({
        type: body.type,
        text: body.text ?? null,
        rationale: body.rationale ?? null,
        pairWith: body.pairWith ?? null,
        ts: now,
      });
    }
  }

  // Log all interventions to Firestore for the audit trail / export.
  await a.db.collection("interventions").add({
    classId: body.classId,
    teacherId: decoded.uid,
    pupilId: body.pupilId ?? null,
    type: body.type,
    text: body.text ?? null,
    rationale: body.rationale ?? null,
    pairWith: body.pairWith ?? null,
    timestamp: now,
  });

  return NextResponse.json({ ok: true });
}
