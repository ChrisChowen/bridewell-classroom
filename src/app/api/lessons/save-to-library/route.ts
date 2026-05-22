import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import type { LessonAppraisal, LessonLibraryEntry } from "@/types";

// POST /api/lessons/save-to-library
//
// Teacher-only. Saves the lesson plan + the AI appraisal to the
// school's shared lessonLibrary. Future class-creation flows can offer
// these as starting points instead of generating from scratch.
//
// Body: { classId, appraisal }

interface Body {
  classId: string;
  appraisal: LessonAppraisal;
}

// The appraisal arrives from the (trusted teacher) client, but it's persisted
// into the SCHOOL-SHARED lessonLibrary other teachers read, so we whitelist
// its fields, clamp the rating to 1–5, and bound every string/array. Returns
// null if it can't be coerced into a valid appraisal.
function sanitiseAppraisal(raw: unknown): LessonAppraisal | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const rating = Math.round(Number(a.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const strArr = (v: unknown, items: number, n: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").slice(0, items).map((x) => x.slice(0, n))
      : [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  const m = (a.metrics && typeof a.metrics === "object" ? a.metrics : {}) as Record<string, unknown>;
  const statesObserved: Record<string, number> = {};
  if (m.statesObserved && typeof m.statesObserved === "object") {
    for (const [k, v] of Object.entries(m.statesObserved as Record<string, unknown>).slice(0, 10)) {
      statesObserved[k.slice(0, 40)] = num(v);
    }
  }

  return {
    rating: rating as 1 | 2 | 3 | 4 | 5,
    summary: str(a.summary, 1000),
    whatWorked: strArr(a.whatWorked, 12, 300),
    whatToAdjust: strArr(a.whatToAdjust, 12, 300),
    metrics: {
      pupilsClassified: num(m.pupilsClassified),
      statesObserved,
      safeguardingEvents: num(m.safeguardingEvents),
      reasonEvents: num(m.reasonEvents),
      reasonAcceptRate:
        typeof m.reasonAcceptRate === "number" ? Math.max(0, Math.min(1, m.reasonAcceptRate)) : undefined,
    },
    generatedAt: typeof a.generatedAt === "number" ? a.generatedAt : Date.now(),
  };
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });
  const teacherUid = authed.user.uid;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.classId || !body.appraisal) {
    return NextResponse.json({ error: "classId and appraisal required" }, { status: 400 });
  }
  const appraisal = sanitiseAppraisal(body.appraisal);
  if (!appraisal) {
    return NextResponse.json({ error: "Invalid appraisal (rating must be 1–5)" }, { status: 400 });
  }

  const cls = await resolveDataStore().getClass(body.classId);
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (cls.teacherId !== teacherUid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }
  if (!cls.lessonPlan) {
    return NextResponse.json({ error: "Class has no lesson plan" }, { status: 400 });
  }

  // Fetch the teacher record for displayName.
  const teacherSnap = await a.db.collection("teachers").doc(teacherUid).get();
  const teacher = teacherSnap.exists ? (teacherSnap.data() as { displayName?: string }) : undefined;

  const id = a.db.collection("lessonLibrary").doc().id;
  const entry: LessonLibraryEntry = {
    id,
    plan: cls.lessonPlan,
    appraisal,
    school: cls.school,
    savedAt: Date.now(),
    savedByTeacherId: teacherUid,
    savedByTeacherName: teacher?.displayName ?? "Teacher",
    sourceClassId: body.classId,
    syllabusId: cls.lessonPlan.syllabusId,
  };
  await a.db.collection("lessonLibrary").doc(id).set(entry);

  return NextResponse.json({ ok: true, entry });
}
