import { NextResponse } from "next/server";
import { authorisePupilAccess } from "@/lib/pupil-auth";
import { gatherPupilData } from "@/lib/pupil-data";

// GET /api/pupils/{pupilId}/export
//
// GDPR Article 15 (right of access). Teacher-only, scoped to the
// teacher's own class. Returns everything held about the pupil as JSON,
// suitable for fulfilling a subject-access request via the school.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> }
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const data = await gatherPupilData(auth.admin.db, pupilId);
  return NextResponse.json(data, {
    headers: {
      // Encourage the browser to download it as a file.
      "Content-Disposition": `attachment; filename="pupil-${pupilId}-export.json"`,
    },
  });
}
