import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
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

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (decoded.role !== "teacher") {
    return NextResponse.json({ error: "Teacher role required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.classId || !body.appraisal) {
    return NextResponse.json({ error: "classId and appraisal required" }, { status: 400 });
  }

  const classSnap = await a.db.collection("classes").doc(body.classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const cls = classSnap.data() as ClassRecord;
  if (cls.teacherId !== decoded.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }
  if (!cls.lessonPlan) {
    return NextResponse.json({ error: "Class has no lesson plan" }, { status: 400 });
  }

  // Fetch the teacher record for displayName.
  const teacherSnap = await a.db.collection("teachers").doc(decoded.uid).get();
  const teacher = teacherSnap.exists ? (teacherSnap.data() as { displayName?: string }) : undefined;

  const id = a.db.collection("lessonLibrary").doc().id;
  const entry: LessonLibraryEntry = {
    id,
    plan: cls.lessonPlan,
    appraisal: body.appraisal,
    school: cls.school,
    savedAt: Date.now(),
    savedByTeacherId: decoded.uid,
    savedByTeacherName: teacher?.displayName ?? "Teacher",
    sourceClassId: body.classId,
    syllabusId: cls.lessonPlan.syllabusId,
  };
  await a.db.collection("lessonLibrary").doc(id).set(entry);

  return NextResponse.json({ ok: true, entry });
}
