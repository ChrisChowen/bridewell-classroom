import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";

// POST /api/admin/allowlist — add an email to the teacher allowlist.
// GET  /api/admin/allowlist — list the allowlist.
//
// Admin-only. "Admin" is the `isAdmin: true` flag on the allowlist doc
// for the calling teacher's own email.

async function isAdmin(decodedToken: { uid: string; email?: string }, a: ReturnType<typeof getAdmin>) {
  if (!a.ready) return false;
  const email = (decodedToken.email ?? "").toLowerCase();
  if (!email) return false;
  const doc = await a.db.collection("allowedTeacherEmails").doc(email).get();
  return doc.exists && (doc.data()?.isAdmin === true);
}

async function authedAdmin(req: Request) {
  const a = getAdmin();
  if (!a.ready) return { error: NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 }) };

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) return { error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(idToken);
  } catch {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  if (decoded.role !== "teacher") {
    return { error: NextResponse.json({ error: "Teacher role required" }, { status: 403 }) };
  }
  if (!(await isAdmin(decoded, a))) {
    return { error: NextResponse.json({ error: "Admin teacher required" }, { status: 403 }) };
  }
  return { a, decoded };
}

export async function POST(req: Request) {
  const ctx = await authedAdmin(req);
  if ("error" in ctx) return ctx.error;
  const { a, decoded } = ctx;

  const body = (await req.json().catch(() => null)) as { email?: string; isAdmin?: boolean } | null;
  const email = body?.email?.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  await a.db.collection("allowedTeacherEmails").doc(email).set(
    {
      email,
      addedAt: Date.now(),
      addedBy: decoded.uid,
      isAdmin: body?.isAdmin === true,
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const ctx = await authedAdmin(req);
  if ("error" in ctx) return ctx.error;
  const { a } = ctx;

  const snap = await a.db.collection("allowedTeacherEmails").orderBy("addedAt", "desc").get();
  return NextResponse.json({
    allowlist: snap.docs.map((d) => d.data()),
  });
}
