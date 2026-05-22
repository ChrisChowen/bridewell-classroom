import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

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

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return { error: NextResponse.json({ error: authed.error }, { status: authed.status }) };
  if (!(await isAdmin(authed.user, a))) {
    return { error: NextResponse.json({ error: "Admin teacher required" }, { status: 403 }) };
  }
  return { a, user: authed.user };
}

export async function POST(req: Request) {
  const ctx = await authedAdmin(req);
  if ("error" in ctx) return ctx.error;
  const { a, user } = ctx;

  const body = (await req.json().catch(() => null)) as { email?: string; isAdmin?: boolean } | null;
  const raw = body?.email?.toLowerCase().trim();
  if (!raw || !raw.includes("@")) {
    return NextResponse.json({ error: "Valid email or *@domain required" }, { status: 400 });
  }

  // Two accepted shapes: exact email "jane@kesw.org", or domain
  // wildcard "*@kesw.org" — whitelists the whole staff domain in one
  // entry so a school admin doesn't have to add every teacher.
  const isWildcard = raw.startsWith("*@");
  if (isWildcard) {
    const domain = raw.slice(2);
    if (!domain || domain.includes("@") || !domain.includes(".")) {
      return NextResponse.json(
        { error: "Domain wildcard must look like *@example.com" },
        { status: 400 }
      );
    }
  }

  await a.db.collection("allowedTeacherEmails").doc(raw).set(
    {
      email: raw,
      addedAt: Date.now(),
      addedBy: user.uid,
      isAdmin: body?.isAdmin === true,
      ...(isWildcard ? { wildcard: true, domain: raw.slice(2) } : {}),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true, kind: isWildcard ? "domain" : "email" });
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

// DELETE /api/admin/allowlist?email=<email-or-*@domain>
// Removes an allowlist entry. Admin-only. Guard: an admin cannot remove
// their OWN entry — that's the simplest protection against locking
// yourself (or the last admin) out of the admin surface.
export async function DELETE(req: Request) {
  const ctx = await authedAdmin(req);
  if ("error" in ctx) return ctx.error;
  const { a, user } = ctx;

  const url = new URL(req.url);
  const raw = url.searchParams.get("email")?.toLowerCase().trim();
  if (!raw) return NextResponse.json({ error: "email query param required" }, { status: 400 });

  if (raw === (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "You can't remove your own admin access — ask another admin." },
      { status: 409 },
    );
  }

  await a.db.collection("allowedTeacherEmails").doc(raw).delete();
  return NextResponse.json({ ok: true, removed: raw });
}
