import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import { gatherClassResearchData } from "@/lib/pupil-data";
import { buildResearchExport } from "@/lib/research-export";
import { createZip } from "@/lib/zip";
import { logInfo } from "@/lib/log";

// POST /api/classes/{classId}/research-export  (brief item N)
//
// Teacher-only, scoped to the teacher's own class. Returns a ZIP of
// pseudonymised (P001…), CSV-injection-safe analytic CSVs — engagement,
// Reason, scaffolding, and intervention events — for research use. No
// names, emails, UIDs, or raw chat/Reason free-text leave the server.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;

  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });

  const cls = await resolveDataStore().getClass(classId);
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (cls.teacherId !== authed.user.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }

  const data = await gatherClassResearchData(a.db, classId);
  const files = buildResearchExport({ classId, generatedAt: Date.now(), ...data });
  const zip = createZip(
    Object.entries(files).map(([name, content]) => ({ name, content }))
  );

  logInfo({
    event: "research_export",
    route: "classes/research-export",
    classId,
    teacherUid: authed.user.uid,
    count: data.participants.length,
  });

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      // classId is an opaque identifier, not PII.
      "Content-Disposition": `attachment; filename="research-export-${classId}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
