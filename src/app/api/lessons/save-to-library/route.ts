import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import type { ClassRecord, LessonAppraisal, LessonLibraryEntry } from "@/types";

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

  const classSnap = await a.db.collection("classes").doc(body.classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const cls = classSnap.data() as ClassRecord;
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
    appraisal: body.appraisal,
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
