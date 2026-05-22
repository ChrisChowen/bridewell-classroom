import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/auth";

// POST /api/conversation/append
//
// Pupil session calls this for each turn (pupil and tutor) so the
// teacher dashboard can read the conversation when drilling into a
// pupil. Server verifies the pupil's ID token and looks up their
// classId — the client never claims which class to write to.
//
// Body: { idToken, role: 'pupil'|'tutor', content, meta? }

interface Body {
  idToken: string;
  role: "pupil" | "tutor";
  content: string;
  meta?: Record<string, unknown>;
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.content || !body.role) {
    return NextResponse.json({ error: "idToken, role, content required" }, { status: 400 });
  }
  const auth = await verifyAuthToken(body.idToken);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const uid = auth.user.uid;

  const pupilSnap = await a.db.collection("pupils").doc(uid).get();
  if (!pupilSnap.exists) {
    return NextResponse.json({ error: "No pupil record" }, { status: 404 });
  }
  const { classId } = pupilSnap.data() as { classId: string };

  const docId = `${classId}_${uid}`;
  const ref = a.db.collection("conversations").doc(docId).collection("messages");
  await ref.add({
    role: body.role,
    content: body.content.slice(0, 4000),
    timestamp: Date.now(),
    meta: body.meta ?? null,
  });

  return NextResponse.json({ ok: true });
}
