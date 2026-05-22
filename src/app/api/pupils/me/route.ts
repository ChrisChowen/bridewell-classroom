import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { getEffectiveChallengeLevel } from "@/lib/learner-profile-store";
import { buildSendAdaptationBlock } from "@/lib/send";
import type { ChallengeLevel, ClassRecord, PupilRecord } from "@/types";

// GET /api/pupils/me
//
// Returns the signed-in pupil's record + their class (including the
// approved lesson plan). Used by the pupil session page to anchor the
// tutor to the teacher-approved plan.
//
// Auth: Bearer ID token (anonymous Firebase Auth).

export async function GET(req: Request) {
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

  const snap = await a.db.collection("pupils").doc(decoded.uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "No pupil record yet — join a class first" }, { status: 404 });
  }
  const pupil = snap.data() as PupilRecord;

  const classSnap = await a.db.collection("classes").doc(pupil.classId).get();
  if (!classSnap.exists) {
    return NextResponse.json({ error: "Class no longer exists" }, { status: 404 });
  }
  const cls = classSnap.data() as ClassRecord;

  // Adaptive difficulty: the pupil inherits their drifted, per-pupil
  // challenge level (falls back to the lesson-wide default if we've never
  // profiled them). The session page passes this into the tutor as
  // lesson.challengeLevel so coaching is pitched per pupil, not per class.
  const lessonLevel = (cls.lessonPlan?.challengeLevel as ChallengeLevel | undefined) ?? "core";
  let effectiveChallengeLevel: ChallengeLevel = lessonLevel;
  try {
    effectiveChallengeLevel = await getEffectiveChallengeLevel(a.db, decoded.uid, lessonLevel);
  } catch {
    // Non-fatal: fall back to the lesson-wide level.
  }

  // SEND adaptation: derive the tutor's free-text adaptation block from the
  // pupil's structured SEND profile (set by the teacher). Fed to the tutor
  // via lesson chat as pupilProfile. Absent when the pupil has no profile.
  const pupilProfile = buildSendAdaptationBlock(pupil.send);

  return NextResponse.json({ pupil, class: cls, effectiveChallengeLevel, pupilProfile });
}
