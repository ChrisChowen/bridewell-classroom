import { NextResponse } from "next/server";
import { authorisePupilAccess } from "@/lib/pupil-auth";
import { resolveDataStore } from "@/lib/data";
import type { PupilRecord } from "@/types";

// GET  /api/pupils/{pupilId}/send  — read the pupil's SEND profile.
// POST /api/pupils/{pupilId}/send  — set it. Teacher-only, scoped to the
//   teacher's own class. The structured profile feeds the tutor's
//   adaptation (HOW it communicates) via buildSendAdaptationBlock; it is
//   never shown to the pupil.

const OUTPUT_FORMATS = ["short", "bullets", "structured", "visual"] as const;
type SendProfile = NonNullable<PupilRecord["send"]>;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> },
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const pupil = await resolveDataStore().getPupil(pupilId);
  return NextResponse.json({ send: pupil?.send ?? null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pupilId: string }> },
) {
  const { pupilId } = await params;
  const auth = await authorisePupilAccess(req, pupilId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => null)) as Partial<SendProfile> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "SEND profile object required" }, { status: 400 });
  }

  // Validate + normalise. An empty/cleared field is allowed (removes it).
  const send: SendProfile = {};
  if (body.outputFormat) {
    if (!OUTPUT_FORMATS.includes(body.outputFormat)) {
      return NextResponse.json(
        { error: `outputFormat must be one of ${OUTPUT_FORMATS.join("|")}` },
        { status: 400 },
      );
    }
    send.outputFormat = body.outputFormat;
  }
  if (body.scaffoldingLevel != null) {
    const lvl = Number(body.scaffoldingLevel);
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 5) {
      return NextResponse.json({ error: "scaffoldingLevel must be an integer 1-5" }, { status: 400 });
    }
    send.scaffoldingLevel = lvl as SendProfile["scaffoldingLevel"];
  }
  if (body.notes != null) {
    const note = String(body.notes).trim().slice(0, 400);
    if (note) send.notes = note;
  }

  await resolveDataStore().savePupil(pupilId, { send }, { merge: true });
  return NextResponse.json({ send });
}
