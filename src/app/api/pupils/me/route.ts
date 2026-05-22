import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import { buildSendAdaptationBlock } from "@/lib/send";
import type { ChallengeLevel } from "@/types";

// GET /api/pupils/me
//
// Returns the signed-in pupil's record + their class (including the
// approved lesson plan), their effective adaptive challenge level, and the
// SEND-derived tutor adaptation block. Used by the pupil session page.
//
// Reference implementation for the handover seams: this route touches NO
// Firebase directly — identity goes through the auth seam (verifyRequest)
// and all reads through the data seam (resolveDataStore).

export async function GET(req: Request) {
  // Any signed-in user (pupils are anonymous, no role required).
  const auth = await verifyRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const store = resolveDataStore();

  const pupil = await store.getPupil(auth.user.uid);
  if (!pupil) {
    return NextResponse.json({ error: "No pupil record yet — join a class first" }, { status: 404 });
  }

  const cls = await store.getClass(pupil.classId);
  if (!cls) {
    return NextResponse.json({ error: "Class no longer exists" }, { status: 404 });
  }

  // Adaptive difficulty: the pupil inherits their drifted, per-pupil
  // challenge level (falls back to the lesson-wide default if we've never
  // profiled them). The session page passes this into the tutor.
  const lessonLevel = (cls.lessonPlan?.challengeLevel as ChallengeLevel | undefined) ?? "core";
  let effectiveChallengeLevel: ChallengeLevel = lessonLevel;
  try {
    const profile = await store.getLearnerProfile(auth.user.uid);
    effectiveChallengeLevel = profile?.challengeLevel ?? lessonLevel;
  } catch {
    // Non-fatal: fall back to the lesson-wide level.
  }

  // SEND adaptation: derive the tutor's free-text adaptation block from the
  // pupil's structured SEND profile. Absent when the pupil has no profile.
  const pupilProfile = buildSendAdaptationBlock(pupil.send);

  return NextResponse.json({ pupil, class: cls, effectiveChallengeLevel, pupilProfile });
}
