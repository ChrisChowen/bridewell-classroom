import { NextResponse } from "next/server";
import "@/lib/cost/recorder"; // best-effort LLM usage recorder (nodejs side-effect)
import { generateLessonPlan } from "@/lib/ai/lessonPlanner";
import { findSyllabus } from "@/lib/syllabi/library";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
  challengeLevel?: "foundation" | "core" | "stretch";
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.lessonsGenerate);
  if (limited) return limited;

  const a = getAdmin();
  if (!a.ready) {
    return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  }

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });

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
    challengeLevel: body.challengeLevel,
  });

  return NextResponse.json({ plan });
}
