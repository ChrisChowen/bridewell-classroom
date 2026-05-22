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

  // Cap free-text the teacher pastes before it reaches the LLM — bounds
  // prompt cost and the injection surface. Generous (a rich brief is fine).
  const cap = (s: string | undefined, max: number) =>
    s ? s.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : s;

  // generateLessonPlan already degrades to a syllabus-derived fallback when
  // the model is unavailable or returns a malformed shape, but wrap it so an
  // unexpected throw returns a clean 500 (not an unhandled crash that breaks
  // the wizard's res.json()). Log the message only — no PII.
  try {
    const plan = await generateLessonPlan({
      syllabus,
      teacherIntent: cap(body.teacherIntent, 1500)!.trim(),
      className: cap(body.className, 120),
      yearGroup: body.yearGroup,
      classNotes: cap(body.classNotes, 2000),
      challengeLevel: body.challengeLevel,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("lesson-plan generation error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Could not generate a lesson plan. Please try again." }, { status: 500 });
  }
}
