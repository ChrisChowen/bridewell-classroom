import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { classify } from "@/lib/admin/allowlist-entry";

// POST /api/admin/allowlist/bulk — add many teacher emails / domain
// wildcards to the allowlist in one go (bulk roster import). Admin-only.
// Body: { emails: string[], isAdmin?: boolean }.
// Returns a per-entry summary: { added, skipped (already present), invalid }.
// (Work-stream B: multi-teacher — bulk roster import.)

type ReadyAdmin = Extract<ReturnType<typeof getAdmin>, { ready: true }>;

async function isAdmin(email: string | undefined, a: ReadyAdmin) {
  const e = (email ?? "").toLowerCase();
  if (!e) return false;
  const doc = await a.db.collection("allowedTeacherEmails").doc(e).get();
  return doc.exists && doc.data()?.isAdmin === true;
}

const MAX_ENTRIES = 500;

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });
  if (!(await isAdmin(authed.user.email, a))) {
    return NextResponse.json({ error: "Admin teacher required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { emails?: unknown; isAdmin?: boolean } | null;
  if (!Array.isArray(body?.emails)) {
    return NextResponse.json({ error: "emails array required" }, { status: 400 });
  }
  const grantAdmin = body?.isAdmin === true;

  // De-dupe + cap.
  const raws = [...new Set(body.emails.filter((e): e is string => typeof e === "string").map((e) => e.trim()).filter(Boolean))];
  if (raws.length > MAX_ENTRIES) {
    return NextResponse.json({ error: `Too many entries (max ${MAX_ENTRIES})` }, { status: 413 });
  }

  const added: string[] = [];
  const skipped: string[] = [];
  const invalid: string[] = [];

  const batch = a.db.batch();
  const now = Date.now();
  for (const raw of raws) {
    const v = raw.toLowerCase();
    const c = classify(v);
    if (!c.ok) {
      invalid.push(raw);
      continue;
    }
    const ref = a.db.collection("allowedTeacherEmails").doc(v);
    const existing = await ref.get();
    if (existing.exists) {
      skipped.push(v);
      continue;
    }
    batch.set(ref, {
      email: v,
      addedAt: now,
      addedBy: authed.user.uid,
      isAdmin: grantAdmin,
      ...(c.kind === "domain" ? { wildcard: true, domain: v.slice(2) } : {}),
    });
    added.push(v);
  }
  if (added.length) await batch.commit();

  return NextResponse.json({
    summary: { added: added.length, skipped: skipped.length, invalid: invalid.length },
    added,
    skipped,
    invalid,
  });
}
