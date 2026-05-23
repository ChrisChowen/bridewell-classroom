import { NextResponse } from "next/server";
import "@/lib/cost/recorder"; // registers the best-effort LLM usage recorder (nodejs side-effect)
import { callLLM, callLLMStream, dedupeCitations, type LLMMessage } from "@/lib/ai/llm";
import { buildTutorSystemPrompt, SCAFFOLD_SYSTEM } from "@/lib/ai/prompts";
import { mentionsUnsupportedVisual } from "@/lib/ai/output-guards";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withRequestLog } from "@/lib/log";
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
  // When true (and a plain coach turn), stream the reply as text deltas
  // instead of returning JSON — so the tutor's words appear as they're typed.
  stream?: boolean;
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

export function POST(req: Request) {
  // One structured request line (route/method/status/durationMs, no PII).
  return withRequestLog("chat", req, () => handleChat(req));
}

async function handleChat(req: Request) {
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
    const { fallbackReason, ...safe } = result;
    if (fallbackReason) console.warn("scaffold fallback:", fallbackReason); // operational, no PII
    // Defence-in-depth: the text-only tutor must never promise a visual it
    // can't deliver. The prompt forbids it; this measures slips. Log the
    // event only (no content) so we can track frequency without storing PII.
    if (mentionsUnsupportedVisual(result.text)) {
      console.warn(`tutor output guard: scaffold(${body.scaffold}) promised an unsupported visual`);
    }
    return NextResponse.json({
      ...safe,
      citations: dedupeCitations(result.citations),
      scaffold: body.scaffold,
    });
  }

  const mode: TutorMode = body.mode ?? "coach";
  // `body.system` is a raw system-prompt override for local testing only.
  // Honouring it in production would let any public caller fully reprogram
  // the tutor (jailbreak, off-task abuse) on our model budget, so we ignore
  // it outside development.
  const systemOverride = process.env.NODE_ENV !== "production" ? body.system : undefined;
  const system =
    systemOverride ??
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

  // Streaming coach turn — return the reply as text deltas so it appears as
  // it's produced. Only for plain coach mode (Expert needs grounding +
  // citations, which require the whole response, so it stays on the JSON path).
  if (body.stream && mode === "coach") {
    const encoder = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        try {
          for await (const delta of callLLMStream({
            use: "tutor",
            system,
            messages: body.messages,
            maxOutputTokens: 200,
            temperature: 0.55,
            thinkingBudget: 0,
          })) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          if (!full) controller.enqueue(encoder.encode("I can't reply just now — give it a moment and try again."));
        }
        // Same defence-in-depth guard as the JSON path, on the full text
        // (server-side log only — no PII, never shown to the pupil).
        if (mentionsUnsupportedVisual(full)) {
          console.warn("tutor output guard: streamed coach reply promised an unsupported visual");
        }
        controller.close();
      },
    });
    return new Response(rs, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Disable proxy buffering so deltas reach the client immediately.
        "X-Accel-Buffering": "no",
      },
    });
  }

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

  const { fallbackReason, ...safe } = result;
  if (fallbackReason) console.warn("tutor fallback:", fallbackReason); // operational, no PII
  // Defence-in-depth for the diagram-promise failure mode (see output-guards).
  if (mentionsUnsupportedVisual(result.text)) {
    console.warn(`tutor output guard: ${mode}-mode reply promised an unsupported visual`);
  }
  return NextResponse.json({
    ...safe,
    mode,
    citations: dedupeCitations(result.citations),
  });
}
