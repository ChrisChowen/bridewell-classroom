import { NextResponse } from "next/server";
import { authorisePupilAccess } from "@/lib/pupil-auth";
import { CHALLENGE_ORDER } from "@/lib/learner-profile";
import type { ChallengeLevel, LearnerProfile } from "@/types";

// GET  /api/pupils/{pupilId}/profile  — the longitudinal learner profile
//   (adaptive-difficulty trajectory + rolling metrics). Teacher-only,
//   scoped to the teacher's own class.
//
// POST /api/pupils/{pupilId}/profile  — teacher override of the per-pupil
//   challenge level. Body: { challengeLevel }. The teacher's choice wins
//   over the AI's drift until the next consolidation re-evaluates it; the
//   override is recorded on the session trajectory for accountability.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> },
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const snap = await auth.admin.db.collection("learnerProfiles").doc(pupilId).get();
  if (!snap.exists) {
    return NextResponse.json({ profile: null });
  }
  return NextResponse.json({ profile: snap.data() as LearnerProfile });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> },
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => null)) as { challengeLevel?: string } | null;
  const level = body?.challengeLevel;
  if (!level || !CHALLENGE_ORDER.includes(level as ChallengeLevel)) {
    return NextResponse.json(
      { error: "challengeLevel must be one of foundation|core|stretch" },
      { status: 400 },
    );
  }

  const ref = auth.admin.db.collection("learnerProfiles").doc(pupilId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "No profile yet — the pupil needs at least one consolidated session before you can override the pitch." },
      { status: 409 },
    );
  }

  const now = Date.now();
  await ref.set(
    {
      challengeLevel: level,
      teacherOverride: { challengeLevel: level, by: auth.teacherUid, at: now },
      updatedAt: now,
    },
    { merge: true },
  );

  const updated = (await ref.get()).data() as LearnerProfile;
  return NextResponse.json({ profile: updated });
}
