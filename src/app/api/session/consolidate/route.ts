import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { callLLM } from "@/lib/ai/llm";
import { consolidateLearnerProfile } from "@/lib/learner-profile-store";
import type { ChallengeLevel } from "@/types";

// POST /api/session/consolidate
//
// Called by the pupil's closing screen when the teacher ends the
// lesson. Reads the pupil's conversation history + their classifier
// trajectory + the lesson plan, and asks Gemini Pro to draft a short,
// pupil-facing close that names what they actually did:
//   - 1–3 specific things they showed they understood (cite their
//     phrasing where possible)
//   - 1 place they stretched (with what helped)
//   - 1 question for next time
//
// Body: { idToken }
// Returns: { close: { title, achievements, stretch, nextTime } }

interface Body { idToken: string; }

const SYSTEM = `You write a short pupil-facing close-of-lesson summary. Your job is to
make the pupil feel that the lesson had shape — specifically, that THEIR
contributions had shape. You will be given:
  - the lesson plan (title, learning objectives, critical concepts)
  - the conversation transcript between the pupil and the AI tutor
  - the engagement trajectory if available

Write ONE short close, addressed to the pupil directly ("you"), British
English. Style: calm, warm, professional. NO exclamations, NO emoji, NO
generic praise ("great job!"). Cite specific phrases the pupil used
when you can — they should feel seen.

Output strict JSON only.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    achievements: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    stretch: { type: "string" },
    nextTime: { type: "string" },
  },
  required: ["title", "achievements", "stretch", "nextTime"],
} as const;

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    // Never let an unhandled exception crash the client's res.json() —
    // always return a JSON 500. Log the message only (not the full error
    // object, which could carry request data) per the no-PII-in-logs rule.
    console.error("consolidate route error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Consolidation failed" },
      { status: 500 }
    );
  }
}

async function handle(req: Request) {
  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const pupilSnap = await a.db.collection("pupils").doc(decoded.uid).get();
  if (!pupilSnap.exists) return NextResponse.json({ error: "No pupil record" }, { status: 404 });
  const { classId, displayName } = pupilSnap.data() as { classId: string; displayName: string };

  const classSnap = await a.db.collection("classes").doc(classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const cls = classSnap.data() as { lessonPlan?: { title: string; learningObjectives?: string[]; criticalConcepts?: string[]; sequence?: Array<{ title: string }>; challengeLevel?: ChallengeLevel } };

  // Pull the conversation (newest first via the same path the panel uses).
  const conversationDocId = `${classId}_${decoded.uid}`;
  const msgs = await a.db
    .collection("conversations")
    .doc(conversationDocId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .limit(60)
    .get();
  const transcript = msgs.docs
    .map((d) => {
      const m = d.data() as { role: string; content: string };
      return `${m.role === "pupil" ? "Pupil" : "Tutor"}: ${m.content}`;
    })
    .join("\n");

  const snaps = await a.db
    .collection("engagementSnapshots")
    .where("pupilId", "==", decoded.uid)
    .orderBy("timestamp", "asc")
    .limit(20)
    .get();
  const trajectory = snaps.docs.map((d) => {
    const s = d.data() as { state: string; confidence: number };
    return `${s.state} (${(s.confidence * 100).toFixed(0)}%)`;
  });

  const userBlock = [
    `Pupil: ${displayName}`,
    `Lesson: ${cls.lessonPlan?.title ?? "Untitled"}`,
    cls.lessonPlan?.learningObjectives?.length
      ? `Objectives:\n${cls.lessonPlan.learningObjectives.map((o) => `- ${o}`).join("\n")}`
      : null,
    cls.lessonPlan?.criticalConcepts?.length
      ? `Critical concepts: ${cls.lessonPlan.criticalConcepts.join("; ")}`
      : null,
    `Engagement trajectory: ${trajectory.join(" → ") || "(no classifications)"}`,
    `Transcript (chronological):\n${transcript || "(no messages)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callLLM({
    use: "reasonEvaluator",
    system: SYSTEM,
    messages: [{ role: "user", content: userBlock }],
    responseSchema: SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 1024,
    temperature: 0.45,
    thinkingBudget: 512,
  });

  // Fold this session's evidence into the longitudinal learner profile and
  // let the per-pupil challenge level drift. Best-effort: a failure here
  // must never break the pupil's close-of-lesson screen, so we catch and
  // log the message only (no PII).
  try {
    await consolidateLearnerProfile(a.db, {
      pupilId: decoded.uid,
      classId,
      lessonTitle: cls.lessonPlan?.title ?? "Untitled lesson",
      lessonLevel: cls.lessonPlan?.challengeLevel ?? "core",
      displayName,
    });
  } catch (err) {
    console.error("learner-profile consolidation skipped:", err instanceof Error ? err.message : "unknown");
  }

  if (result.fallbackUsed || !result.json) {
    return NextResponse.json({
      close: {
        title: "Well done.",
        achievements: ["You stuck with the lesson and engaged with the questions."],
        stretch: "Some of this was new territory and you kept thinking.",
        nextTime: "Carry the questions you didn't fully answer into tomorrow's lesson.",
      },
      fallback: true,
    });
  }

  return NextResponse.json({ close: result.json });
}
