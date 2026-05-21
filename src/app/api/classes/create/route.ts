import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
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

  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

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
  if (!body?.name || !body.subject || !body.school) {
    return NextResponse.json({ error: "name, subject, school required" }, { status: 400 });
  }

  // If a lesson plan was provided, stamp the approval metadata.
  const lessonPlan: LessonPlan | undefined = body.lessonPlan
    ? {
        ...body.lessonPlan,
        approvedAt: Date.now(),
        approvedBy: decoded.uid,
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
    teacherId: decoded.uid,
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
    teacherId: decoded.uid,
    createdAt: cls.createdAt,
  });
  await batch.commit();

  return NextResponse.json({ ok: true, class: cls });
}
