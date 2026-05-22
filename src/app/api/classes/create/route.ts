import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { generateJoinCode } from "@/lib/joinCode";
import type { ClassRecord, LessonPlan, School } from "@/types";

// POST /api/classes/create
//
// Teacher-only. Creates a class with an approved LessonPlan attached.
// The LessonPlan comes pre-generated and pre-approved by the teacher
// (see /api/lessons/generate + the wizard at /dashboard/new-class).
//
// Atomic write of /classes/{id} + /joinCodes/{code} via a Firestore
// batch so a pupil can never resolve a code to a class that doesn't
// exist.

interface Body {
  name: string;
  subject: string;
  school: School;
  lessonPlan?: LessonPlan;
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });
  const teacherUid = authed.user.uid;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name || !body.subject || !body.school) {
    return NextResponse.json({ error: "name, subject, school required" }, { status: 400 });
  }

  // Lesson plans are written to Firestore as a single doc; bound the
  // size well below the 1MB Firestore document limit. Anything bigger
  // is almost certainly an error or abuse (image payloads, very long
  // pasted contexts).
  if (body.lessonPlan) {
    const planSize = JSON.stringify(body.lessonPlan).length;
    if (planSize > 256_000) {
      return NextResponse.json(
        { error: `Lesson plan too large (${Math.round(planSize / 1024)}KB; max 256KB)` },
        { status: 400 }
      );
    }
  }

  // If a lesson plan was provided, stamp the approval metadata.
  const lessonPlan: LessonPlan | undefined = body.lessonPlan
    ? {
        ...body.lessonPlan,
        approvedAt: Date.now(),
        approvedBy: teacherUid,
      }
    : undefined;

  // Generate a unique join code.
  let joinCode = generateJoinCode();
  for (let i = 0; i < 5; i++) {
    const existing = await a.db.collection("joinCodes").doc(joinCode).get();
    if (!existing.exists) break;
    joinCode = generateJoinCode();
  }

  const id = a.db.collection("classes").doc().id;
  const cls: ClassRecord = {
    id,
    teacherId: teacherUid,
    school: body.school,
    name: body.name,
    subject: body.subject,
    joinCode,
    createdAt: Date.now(),
    active: true,
    ...(lessonPlan ? { lessonPlan } : {}),
  };

  const batch = a.db.batch();
  batch.set(a.db.collection("classes").doc(id), cls);
  batch.set(a.db.collection("joinCodes").doc(joinCode), {
    classId: id,
    teacherId: teacherUid,
    createdAt: cls.createdAt,
  });
  await batch.commit();

  // Stamp the owning teacher into the RTDB live mirror so the hardened
  // database rules can scope `liveSessions/{id}/pupils` reads to the
  // owner. Without this, the teacher's own dashboard cannot read the
  // live cards. Best-effort: a failure here doesn't fail class creation
  // (the engagement-run route also self-heals meta on first snapshot).
  try {
    await a.rtdb.ref(`liveSessions/${id}/meta`).set({ teacherId: teacherUid });
  } catch {
    /* non-fatal — engagement/run writes meta defensively too */
  }

  return NextResponse.json({ ok: true, class: cls });
}
