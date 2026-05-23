import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";

// GET /api/admin/cost — recent daily LLM usage + estimated cost, for the
// admin surface. Admin-only. Reads the costTracking/{YYYY-MM-DD} aggregates
// written best-effort by the usage recorder (lib/cost/record.ts). Cost is an
// ESTIMATE (lib/cost/estimate.ts rates), not a billing source.

type ReadyAdmin = Extract<ReturnType<typeof getAdmin>, { ready: true }>;

async function isAdmin(email: string | undefined, a: ReadyAdmin) {
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

  const snap = await a.db.collection("costTracking").orderBy("day", "desc").limit(14).get();
  const days = snap.docs.map((d) => d.data());
  const totalCostUSD = Math.round(days.reduce((s, d) => s + (Number(d.costUSD) || 0), 0) * 1e4) / 1e4;
  const totalCalls = days.reduce((s, d) => s + (Number(d.calls) || 0), 0);

  // Roll up the per-class / per-teacher attribution across the window so the
  // admin widget can show where spend is concentrated. Estimate only.
  const byClass = rollup(days, "byClass");
  const byTeacher = rollup(days, "byTeacher");

  return NextResponse.json({
    days,
    totals: { costUSD: totalCostUSD, calls: totalCalls },
    byClass,
    byTeacher,
    estimate: true,
  });
}

// Sum a `byClass`/`byTeacher` breakdown across day docs into a sorted
// [{ id, calls, costUSD }] list (highest cost first, top 20).
function rollup(
  days: Array<Record<string, unknown>>,
  field: "byClass" | "byTeacher"
): Array<{ id: string; calls: number; costUSD: number }> {
  const acc = new Map<string, { calls: number; costUSD: number }>();
  for (const d of days) {
    const bucket = (d[field] ?? {}) as Record<string, { calls?: number; costUSD?: number }>;
    for (const [id, v] of Object.entries(bucket)) {
      const cur = acc.get(id) ?? { calls: 0, costUSD: 0 };
      cur.calls += Number(v.calls) || 0;
      cur.costUSD += Number(v.costUSD) || 0;
      acc.set(id, cur);
    }
  }
  return [...acc.entries()]
    .map(([id, v]) => ({ id, calls: v.calls, costUSD: Math.round(v.costUSD * 1e4) / 1e4 }))
    .sort((a, b) => b.costUSD - a.costUSD)
    .slice(0, 20);
}
