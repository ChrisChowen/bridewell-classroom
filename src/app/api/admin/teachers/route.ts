import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

// GET /api/admin/teachers — the registered-teacher roster for the admin
// surface. Admin-only ("admin" = the isAdmin flag on the caller's own
// allowlist doc, mirroring /api/admin/allowlist). Reads via the admin SDK
// (bypasses client rules by design); returns non-sensitive account fields
// only. Cross-references the allowlist so the surface can show who also
// holds admin rights. (Work-stream B: admin surface / multi-teacher roster.)

async function isAdmin(email: string | undefined, a: Extract<ReturnType<typeof getAdmin>, { ready: true }>) {
  const e = (email ?? "").toLowerCase();
  if (!e) return false;
  const doc = await a.db.collection("allowedTeacherEmails").doc(e).get();
  return doc.exists && doc.data()?.isAdmin === true;
}

export async function GET(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });
  if (!(await isAdmin(authed.user.email, a))) {
    return NextResponse.json({ error: "Admin teacher required" }, { status: 403 });
  }

  // Which emails carry admin rights (for the roster's admin column).
  const allow = await a.db.collection("allowedTeacherEmails").get();
  const adminEmails = new Set(
    allow.docs.filter((d) => d.data()?.isAdmin === true).map((d) => d.id.toLowerCase()),
  );

  const snap = await a.db.collection("teachers").get();
  const teachers = snap.docs.map((d) => {
    const t = d.data() as { email?: string; displayName?: string; school?: string; role?: string; createdAt?: number };
    return {
      id: d.id,
      email: t.email ?? "",
      displayName: t.displayName ?? "",
      school: t.school ?? "",
      role: t.role ?? "Teacher",
      createdAt: t.createdAt ?? null,
      isAdmin: adminEmails.has((t.email ?? "").toLowerCase()),
    };
  });
  // Newest first.
  teachers.sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0));

  return NextResponse.json({ teachers });
}
