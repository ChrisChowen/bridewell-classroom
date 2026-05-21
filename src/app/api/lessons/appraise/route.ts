import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { appraiseLesson } from "@/lib/ai/appraiser";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ClassRecord } from "@/types";

// POST /api/lessons/appraise
//
// Teacher-only. Reads the class's classifier snapshots, Reason events,
// safeguarding events, and a sample of pupil conversations, then asks
// Gemini Pro for an appraisal of THE LESSON PLAN (not the pupils).
// Returns the appraisal + the underlying plan so the caller can
// optionally save the pair to /lessonLibrary.
//
// Body: { classId }

interface Body { classId: string; }

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.lessonsAppraise);
  if (limited) return limited;

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
  if (!body?.classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const classSnap = await a.db.collection("classes").doc(body.classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const cls = classSnap.data() as ClassRecord;
  if (cls.teacherId !== decoded.uid) {
    return NextResponse.json({ error: "Not your class" }, { status: 403 });
  }
  if (!cls.lessonPlan) {
    return NextResponse.json({ error: "Class has no lesson plan to appraise" }, { status: 400 });
  }

  // Pull the data inputs in parallel.
  const [snapshotsQ, reasonQ, safeguardingQ, convos] = await Promise.all([
    a.db.collection("engagementSnapshots").where("sessionId", "==", body.classId).get(),
    a.db.collection("reasonEvents").where("classId", "==", body.classId).get(),
    a.db.collection("safeguardingEvents").where("classId", "==", body.classId).get(),
    a.db.collection("conversations").listDocuments(),
  ]);

  const snapshots = snapshotsQ.docs.map((d) => {
    const x = d.data() as { state: string; confidence: number; rationale?: string };
    return { state: x.state, confidence: x.confidence, rationale: x.rationale };
  });
  const reasonEvents = reasonQ.docs.map((d) => {
    const x = d.data() as { branch?: string; confidence?: number };
    return { branch: x.branch, confidence: x.confidence };
  });

  // Grab a small conversation sample — last 4 turns from up to 4 pupils
  // in this class.
  const classConvos = convos.filter((c) => c.id.startsWith(body.classId + "_")).slice(0, 4);
  const sampleParts: string[] = [];
  for (const c of classConvos) {
    const msgs = await c.collection("messages").orderBy("timestamp", "desc").limit(4).get();
    const block = msgs.docs
      .reverse()
      .map((m) => {
        const x = m.data() as { role: string; content: string };
        return `${x.role === "pupil" ? "Pupil" : "Tutor"}: ${x.content}`;
      })
      .join("\n");
    sampleParts.push(`— pupil ${c.id.split("_")[1].slice(0, 6)} —\n${block}`);
  }
  const conversationSample = sampleParts.join("\n\n");

  const appraisal = await appraiseLesson({
    plan: cls.lessonPlan,
    snapshots,
    reasonEvents,
    safeguardingCount: safeguardingQ.size,
    conversationSample,
  });

  return NextResponse.json({ appraisal, plan: cls.lessonPlan });
}
