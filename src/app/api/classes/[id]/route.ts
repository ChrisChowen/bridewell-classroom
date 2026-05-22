import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

// GET /api/classes/[id]
//
// Teacher-only. Returns the class document + the roster of pupils so the
// class detail page can render without each card making its own pupil
// lookup.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });

  const classSnap = await a.db.collection("classes").doc(id).get();
  if (!classSnap.exists) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  const cls = classSnap.data() as { teacherId: string };
  if (cls.teacherId !== authed.user.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }

  const roster = await a.db.collection("pupils").where("classId", "==", id).get();
  const pupils = roster.docs.map((d) => d.data());

  return NextResponse.json({ class: classSnap.data(), pupils });
}
