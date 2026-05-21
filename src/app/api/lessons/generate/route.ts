import { NextResponse } from "next/server";
import { generateLessonPlan } from "@/lib/ai/lessonPlanner";
import { findSyllabus } from "@/lib/syllabi/library";
import { getAdmin } from "@/lib/firebase/admin";

// POST /api/lessons/generate
//
// Body:
//   {
//     syllabusId: string,
//     teacherIntent: string,
//     className?: string,
//     yearGroup?: number,
//     classNotes?: string
//   }
//
// Auth: Authorization: Bearer <idToken> for a teacher.
// Returns the generated LessonPlan (not yet persisted; teacher reviews,
// edits, then submits to /api/classes/create with the plan attached).

interface Body {
  syllabusId: string;
  teacherIntent: string;
  className?: string;
  yearGroup?: number;
  classNotes?: string;
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) {
    return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }
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
  if (!body?.syllabusId || !body.teacherIntent?.trim()) {
    return NextResponse.json({ error: "syllabusId and teacherIntent required" }, { status: 400 });
  }
  const syllabus = findSyllabus(body.syllabusId);
  if (!syllabus) {
    return NextResponse.json({ error: `Unknown syllabusId: ${body.syllabusId}` }, { status: 404 });
  }

  const plan = await generateLessonPlan({
    syllabus,
    teacherIntent: body.teacherIntent.trim(),
    className: body.className,
    yearGroup: body.yearGroup,
    classNotes: body.classNotes,
  });

  return NextResponse.json({ plan });
}
