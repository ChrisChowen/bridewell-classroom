import { NextResponse } from "next/server";
import { authorisePupilAccess } from "@/lib/pupil-auth";
import { deletePupilData } from "@/lib/pupil-data";

// POST /api/pupils/{pupilId}/delete
//
// GDPR Article 17 (right to erasure). Teacher-only, scoped to the
// teacher's own class. Irreversibly removes ALL data held about the
// pupil (Firestore + RTDB) and returns a manifest of what was removed.
//
// Requires a confirmation token in the body so a stray request can't
// erase a pupil — the caller must echo the pupilId. The UI surfaces a
// confirmation modal naming exactly what will be deleted.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> }
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => null)) as { confirmPupilId?: string } | null;
  if (body?.confirmPupilId !== pupilId) {
    return NextResponse.json(
      { error: "confirmPupilId must echo the pupilId to confirm erasure" },
      { status: 400 }
    );
  }

  const manifest = await deletePupilData(auth.admin.db, auth.admin.rtdb, pupilId);
  return NextResponse.json({ ok: true, manifest });
}
