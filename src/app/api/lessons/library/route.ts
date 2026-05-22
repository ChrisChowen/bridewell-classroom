import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

// GET /api/lessons/library?syllabusId=...&school=...
//
// Returns up to 20 library entries for the school, optionally filtered
// by syllabus id. Sorted by rating desc then recency desc — so the
// new-class wizard can offer the best-rated prior plan as a starting
// point.

export async function GET(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });

  const url = new URL(req.url);
  const syllabusId = url.searchParams.get("syllabusId");
  const school = url.searchParams.get("school");

  let q: FirebaseFirestore.Query = a.db.collection("lessonLibrary");
  if (school) q = q.where("school", "==", school);
  if (syllabusId) q = q.where("syllabusId", "==", syllabusId);
  const snap = await q.limit(40).get();

  const entries = snap.docs
    .map((d) => d.data())
    .sort((p, q) => {
      const pr = (p.appraisal?.rating ?? 0) as number;
      const qr = (q.appraisal?.rating ?? 0) as number;
      if (pr !== qr) return qr - pr;
      return (q.savedAt ?? 0) - (p.savedAt ?? 0);
    })
    .slice(0, 20);

  return NextResponse.json({ entries });
}
