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
  // Two equality filters don't normally need a composite index, but degrade
  // gracefully if Firestore ever demands one for this combination: fall back
  // to the school filter alone (then filter syllabus in memory) rather than
  // 500 the wizard's "suggested plans" panel.
  let snap;
  try {
    snap = await q.limit(40).get();
  } catch {
    let fb: FirebaseFirestore.Query = a.db.collection("lessonLibrary");
    if (school) fb = fb.where("school", "==", school);
    snap = await fb.limit(80).get();
  }

  const entries = snap.docs
    .map((d) => d.data())
    // Apply the syllabus filter in memory too — harmless on the happy path
    // (already filtered by the query) and correct on the index-fallback path.
    .filter((e) => !syllabusId || e.syllabusId === syllabusId)
    .sort((p, q) => {
      const pr = (p.appraisal?.rating ?? 0) as number;
      const qr = (q.appraisal?.rating ?? 0) as number;
      if (pr !== qr) return qr - pr;
      return (q.savedAt ?? 0) - (p.savedAt ?? 0);
    })
    .slice(0, 20);

  return NextResponse.json({ entries });
}
