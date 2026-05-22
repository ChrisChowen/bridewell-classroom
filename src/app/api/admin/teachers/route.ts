import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

// /api/admin/teachers — registered-teacher roster + account management for
// the admin surface. Admin-only ("admin" = the isAdmin flag on the caller's
// own allowlist doc, mirroring /api/admin/allowlist). Reads/writes via the
// admin SDK (bypasses client rules by design). (Work-stream B: admin
// surface / multi-teacher.)

type ReadyAdmin = Extract<ReturnType<typeof getAdmin>, { ready: true }>;

async function isAdmin(email: string | undefined, a: ReadyAdmin) {
  const e = (email ?? "").toLowerCase();
  if (!e) return false;
  const doc = await a.db.collection("allowedTeacherEmails").doc(e).get();
  return doc.exists && doc.data()?.isAdmin === true;
}

// Shared gate: ready admin + verified teacher + admin flag.
async function gate(req: Request) {
  const a = getAdmin();
  if (!a.ready) return { error: NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 }) };
  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return { error: NextResponse.json({ error: authed.error }, { status: authed.status }) };
  if (!(await isAdmin(authed.user.email, a))) {
    return { error: NextResponse.json({ error: "Admin teacher required" }, { status: 403 }) };
  }
  return { a, user: authed.user };
}

export async function GET(req: Request) {
  const ctx = await gate(req);
  if ("error" in ctx) return ctx.error;
  const { a } = ctx;

  // Admin-rights set (for the roster's admin column).
  const allow = await a.db.collection("allowedTeacherEmails").get();
  const adminEmails = new Set(
    allow.docs.filter((d) => d.data()?.isAdmin === true).map((d) => d.id.toLowerCase()),
  );

  const snap = await a.db.collection("teachers").get();
  const base = snap.docs.map((d) => {
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

  // Account status (enabled/disabled) from Firebase Auth, batched.
  const disabledByUid = new Map<string, boolean>();
  try {
    const ids = base.map((t) => ({ uid: t.id }));
    for (let i = 0; i < ids.length; i += 100) {
      const res = await a.auth.getUsers(ids.slice(i, i + 100));
      res.users.forEach((u) => disabledByUid.set(u.uid, u.disabled));
    }
  } catch {
    /* non-fatal — status column just shows unknown */
  }

  const teachers = base
    .map((t) => ({ ...t, disabled: disabledByUid.get(t.id) ?? false }))
    .sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0));

  return NextResponse.json({ teachers });
}

// POST /api/admin/teachers — enable/disable a teacher account.
// Body: { uid, disabled }. Guard: an admin cannot disable their OWN
// account (no self-lockout).
export async function POST(req: Request) {
  const ctx = await gate(req);
  if ("error" in ctx) return ctx.error;
  const { a, user } = ctx;

  const body = (await req.json().catch(() => null)) as { uid?: string; disabled?: boolean } | null;
  if (!body?.uid || typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "uid and disabled (boolean) required" }, { status: 400 });
  }
  if (body.uid === user.uid) {
    return NextResponse.json(
      { error: "You can't disable your own account — ask another admin." },
      { status: 409 },
    );
  }

  await a.auth.updateUser(body.uid, { disabled: body.disabled });
  return NextResponse.json({ ok: true, uid: body.uid, disabled: body.disabled });
}
