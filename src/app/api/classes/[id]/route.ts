import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";

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

  const classSnap = await a.db.collection("classes").doc(id).get();
  if (!classSnap.exists) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  const cls = classSnap.data() as { teacherId: string };
  if (cls.teacherId !== decoded.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }

  const roster = await a.db.collection("pupils").where("classId", "==", id).get();
  const pupils = roster.docs.map((d) => d.data());

  return NextResponse.json({ class: classSnap.data(), pupils });
}
