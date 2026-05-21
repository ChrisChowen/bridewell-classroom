import { NextResponse } from "next/server";
import { callLLM, dedupeCitations, type LLMMessage } from "@/lib/ai/llm";
import { buildTutorSystemPrompt, SCAFFOLD_SYSTEM } from "@/lib/ai/prompts";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActivityType, ScaffoldAction, TutorMode } from "@/types";

// POST /api/chat — tutor chat path.
//
// Body shape:
//   {
//     messages:   [{ role: 'user'|'assistant', content: string }, ...],
//     mode?:      'coach' | 'expert',     // default 'coach'
//     scaffold?:  'hint' | 'rephrase' | 'simplify',
//     lesson?:    { title, subject, criticalConcepts?, context? },
//     pupilProfile?: string,
//     system?:    string,                  // raw override (testing only)
//   }
//
// Coach mode runs on Gemini 2.5 Flash with thinking off (fast turns).
// Expert mode runs the same model but enables Google Search grounding so
// factual answers cite real sources. Scaffolding generators take only the
// prior tutor turn as input and emit a constrained transformation.

type Body = {
  messages: LLMMessage[];
  mode?: TutorMode;
  scaffold?: ScaffoldAction;
  lesson?: {
    title?: string;
    subject?: string;
    criticalConcepts?: string[];
    context?: string;
    tutorAddendum?: string;
    keyVocabulary?: string[];
    challengeLevel?: "foundation" | "core" | "stretch";
  };
  // The current step in the lesson plan, if the pupil is inside one.
  step?: {
    title?: string;
    goal?: string;
    activityType?: ActivityType;
  };
  // If set, the pupil has completed the main sequence and is running
  // the extension brief. Tutor pitches above-syllabus.
  extension?: {
    brief: string;
    stretchHint?: string;
  };
  pupilProfile?: string;
  system?: string;
};

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.chat);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  // Defensive caps on input. Without these, a long-running chat could
  // accumulate megabytes and balloon prompt cost.
  const totalChars = body.messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  if (totalChars > 32_000) {
    return NextResponse.json(
      { error: "messages too long", limit: 32000, actual: totalChars },
      { status: 413 },
    );
  }

  if (body.scaffold) {
    const system = SCAFFOLD_SYSTEM[body.scaffold];
    const lastTutor =
      [...body.messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
    const result = await callLLM({
      use: "scaffold",
      system,
      messages: [{ role: "user", content: lastTutor }],
      maxOutputTokens: 96,
      temperature: 0.45,
      thinkingBudget: 0,
    });
    return NextResponse.json({
      ...result,
      citations: dedupeCitations(result.citations),
      scaffold: body.scaffold,
    });
  }

  const mode: TutorMode = body.mode ?? "coach";
  const system =
    body.system ??
    buildTutorSystemPrompt({
      mode,
      lessonTitle: body.lesson?.title,
      lessonSubject: body.lesson?.subject,
      criticalConcepts: body.lesson?.criticalConcepts,
      lessonContext: body.lesson?.context,
      tutorAddendum: body.lesson?.tutorAddendum,
      keyVocabulary: body.lesson?.keyVocabulary,
      activityType: body.step?.activityType,
      stepTitle: body.step?.title,
      stepGoal: body.step?.goal,
      pupilProfile: body.pupilProfile,
      challengeLevel: body.lesson?.challengeLevel,
      inExtension: !!body.extension,
      extensionBrief: body.extension?.brief,
      extensionStretchHint: body.extension?.stretchHint,
    });

  const result = await callLLM({
    use: "tutor",
    system,
    messages: body.messages,
    maxOutputTokens: mode === "expert" ? 384 : 200,
    temperature: mode === "expert" ? 0.4 : 0.55,
    // Coach turns are short and need to be fast; Expert turns may search.
    thinkingBudget: 0,
    grounding: mode === "expert",
  });

  return NextResponse.json({
    ...result,
    mode,
    citations: dedupeCitations(result.citations),
  });
}
