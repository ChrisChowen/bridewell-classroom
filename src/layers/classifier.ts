// Engagement classifier — Phase 1 module.
//
// Reads the last N tutor↔pupil turns plus a small bag of behavioural
// signals and returns one of five states from the productive-struggle
// literature with a confidence score. Runs on Gemini 2.5 Pro with a
// strict response schema; thinking is enabled (the call is async to the
// chat loop, so latency is forgiven).
//
// CLAUDE.md §D. State definitions match `lib/brand/tokens.ts`.
// Demo-day load-bearing piece: this is the surface the audience question
// "show me how the dashboard knows a pupil is struggling" lands against.

import "server-only";
import { callLLM } from "@/lib/ai/llm";
import type { EngagementState } from "@/lib/brand";

export interface ClassifierSignals {
  // Recent chat span we're classifying.
  windowSec: number;
  avgResponseTimeSec?: number;
  avgMessageLength?: number;
  questionRatio?: number;
  scaffoldUseCount?: number;
  // Whether the last scaffold ceiling was hit (3+ uses on one tutor turn).
  scaffoldCeilingHit?: boolean;
}

export interface ClassifierInput {
  // Conversation tail — chronological, oldest first. role 'pupil' | 'tutor'.
  turns: Array<{ role: "pupil" | "tutor"; content: string }>;
  signals: ClassifierSignals;
  lessonTitle?: string;
  lessonSubject?: string;
  criticalConcepts?: string[];
  pupilProfile?: string;
}

// Safeguarding signal: when the classifier reads the recent turns, it
// also flags anything that suggests the pupil has disclosed something
// concerning — bullying, self-harm, distress, abuse — so the dashboard
// can surface it to the teacher immediately. Never shown to the pupil.
// Severity is conservative: high means "intervene now"; medium means
// "look at this when you next glance at the dashboard".
export type SafeguardingSeverity = "none" | "low" | "medium" | "high";

export interface SafeguardingFlag {
  severity: SafeguardingSeverity;
  // One-sentence summary of what triggered the flag. Specific enough
  // for the teacher to read at a glance.
  summary: string;
  // The shortest verbatim slice of the pupil's recent messages that
  // triggered the flag. Lets the teacher see the actual phrase.
  pupilExcerpt?: string;
}

export interface ClassifierResult {
  state: EngagementState;
  confidence: number; // 0..1
  rationale: string; // one short sentence; never shown to the pupil
  // Echo back the signals the model relied on most. Useful for explaining
  // a classification to the teacher.
  cues: string[];
  // Safeguarding signal — see the type above. Always present; severity
  // "none" means nothing was flagged.
  safeguarding: SafeguardingFlag;
  fallbackUsed: boolean;
  // Which classifier tier produced this result. "flash" = first-pass
  // Flash call accepted on its own; "pro" = Pro tiebreaker or always-
  // Pro (safeguarding-relevant turns). Surfaced to the dashboard for
  // signal provenance.
  tier: "flash" | "pro";
}

const SYSTEM = `You read the last several turns of a chat between a Year 7–9 pupil
and an AI tutor, plus behavioural signals. You return two things in one
call: an engagement classification AND a safeguarding signal.

(A) Engagement classification — one of five states from the
productive-struggle literature (Kapur 2008; Chen et al. 2024; Zhang
et al.). Be conservative: misclassifying "productive_struggle" as
"wheel_spinning" interrupts a pupil who is learning. Anchor to evidence
in the turns and signals; do not infer beyond them.

State definitions — read these carefully. Correctness is NOT engagement.
A pupil giving terse one-word correct answers without elaborating, asking
follow-ups, or showing their working is NOT flowing — they are
disengaged. A flowing pupil engages with substance.

CRITICAL DISTINCTION — flowing vs productive_struggle. Both are
substantive. The difference is *certainty*:

  - flowing = substantive + confident. The pupil sounds like they
      already know it. They state, connect, generalise. Hedging words
      ("maybe", "I think", "wait, is it…", "I'm not sure but…")
      should push you toward productive_struggle, NOT flowing.
  - productive_struggle = substantive + reasoning-aloud. The pupil is
      actively thinking, attempting partial answers, second-guessing
      themselves, asking "is this right?", or going back to revise an
      earlier idea. They are *visibly working*. This is the most
      learning-rich state and the one Kapur 2008 specifically
      privileges. If in doubt between flowing and
      productive_struggle, choose productive_struggle — it is the
      learning state, not flowing.

State list:

  - flowing: substantive + confident. Writes more than asked,
      elaborates unprompted, generalises, brings their own examples
      without hedging. One-word answers are NEVER flowing.
  - productive_struggle: substantive + uncertain. Slower, partial
      answers, hedges ("I think", "maybe"), revises mid-thought, asks
      follow-up questions about their own reasoning, takes
      thinking-time pauses, attempts examples even if imperfect.
  - wheel_spinning: repeated scaffold use without producing substance;
      echoing the tutor; same difficulty recurring; presses for hints
      rather than thinking.
  - disengaged: very short replies (one or two words), long silences,
      drifting off topic, doing the minimum to keep the tutor from
      asking again. Terse correct answers without elaboration belong
      here, NOT in flowing.
  - off_task: messages unrelated to the lesson; clearly not working.

A useful counterfactual: a pupil who SOUNDS LIKE THEY ALREADY KNEW
THIS is flowing. A pupil who SOUNDS LIKE THEY ARE FIGURING IT OUT
RIGHT NOW is productive_struggle. The system rewards the latter.

(B) Safeguarding flag — read the pupil's messages for any disclosure
that a class teacher would want to know about immediately: self-harm,
bullying, abuse, a parent/home situation that is causing distress, a
serious eating concern, a peer threat. Be careful — not every off-task
or low message is safeguarding. The bar is: would a sensible class
teacher want to see this in the next minute?

Severity:
  - "none": nothing in the transcript suggests a safeguarding concern.
  - "low": mild emotional language ("I'm tired"); worth noting but not
    a concern in itself.
  - "medium": a teacher should look at this when they next glance at
    the dashboard (e.g. "I hate everyone in my class"; "I had a really
    bad weekend").
  - "high": teacher needs to know immediately — explicit self-harm
    ideation, a credible threat, a disclosure of abuse, a clear
    cry-for-help phrase.

For medium/high, include the shortest verbatim pupil excerpt that
triggered the flag, plus a one-sentence summary. The summary is for
the teacher's eye; never shown to the pupil. False positives are
better than misses but be specific.

Output strict JSON only.`;

const SCHEMA = {
  type: "object",
  properties: {
    state: {
      type: "string",
      enum: ["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
    cues: { type: "array", items: { type: "string" }, maxItems: 4 },
    safeguarding: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["none", "low", "medium", "high"] },
        summary: { type: "string" },
        pupilExcerpt: { type: "string" },
      },
      required: ["severity", "summary"],
    },
  },
  required: ["state", "confidence", "rationale", "cues", "safeguarding"],
} as const;

export async function classifyEngagement(input: ClassifierInput): Promise<ClassifierResult> {
  const transcript = input.turns
    .map((t) => `${t.role === "pupil" ? "Pupil" : "Tutor"}: ${t.content}`)
    .join("\n");
  const signalLines = [
    `window_sec: ${input.signals.windowSec}`,
    input.signals.avgResponseTimeSec !== undefined && `avg_response_time_sec: ${input.signals.avgResponseTimeSec.toFixed(1)}`,
    input.signals.avgMessageLength !== undefined && `avg_message_length: ${Math.round(input.signals.avgMessageLength)}`,
    input.signals.questionRatio !== undefined && `question_ratio: ${input.signals.questionRatio.toFixed(2)}`,
    input.signals.scaffoldUseCount !== undefined && `scaffold_use_count: ${input.signals.scaffoldUseCount}`,
    input.signals.scaffoldCeilingHit !== undefined && `scaffold_ceiling_hit: ${input.signals.scaffoldCeilingHit}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userBlock = [
    input.lessonTitle && `Lesson: ${input.lessonTitle}${input.lessonSubject ? ` (${input.lessonSubject})` : ""}.`,
    input.criticalConcepts?.length && `Critical concepts: ${input.criticalConcepts.join(", ")}.`,
    input.pupilProfile && `Pupil profile: ${input.pupilProfile}`,
    "Transcript (oldest first):",
    transcript,
    "Signals:",
    signalLines,
  ]
    .filter(Boolean)
    .join("\n\n");

  // First-pass on Flash. ~80% of classifications are unambiguous
  // (clearly flowing or clearly off-task) and Flash handles them at a
  // fraction of the Pro cost. We escalate to Pro when:
  //   - Flash confidence is below 0.55 (it's not sure)
  //   - Flash flagged safeguarding above "low" (high stakes, Pro should re-read)
  //   - Flash returned non-JSON or fell back entirely
  const flash = await callLLM({
    use: "classifierFlash",
    system: SYSTEM,
    messages: [{ role: "user", content: userBlock }],
    responseSchema: SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 1024,
    temperature: 0.2,
    thinkingBudget: 0,
  });

  let result = flash;
  let tier: "flash" | "pro" = "flash";
  const flashJson = parseClassifier(flash);
  const flashUncertain =
    !flashJson ||
    (flashJson.confidence ?? 0) < 0.55 ||
    (flashJson.safeguarding?.severity === "medium" ||
      flashJson.safeguarding?.severity === "high") ||
    flash.fallbackUsed;

  if (flashUncertain) {
    // Pro thinks by default; give it room but cap so the call returns
    // quickly enough for the dashboard refresh cadence.
    result = await callLLM({
      use: "classifier",
      system: SYSTEM,
      messages: [{ role: "user", content: userBlock }],
      responseSchema: SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: 2048,
      temperature: 0.2,
      thinkingBudget: 1024,
    });
    tier = "pro";
  }

  if (result.fallbackUsed || !result.json) {
    // Do NOT default to flowing — that would silently render this
    // pupil as "doing well" on the teacher dashboard when in fact the
    // classifier is offline. We return productive_struggle with low
    // confidence so the dashboard does NOT falsely reassure the
    // teacher, plus the fallback flag the live mirror surfaces as a
    // degraded indicator.
    // GDPR: never log model text here — on fallback result.text echoes
    // the classifier prompt, which contains pupil turns (PII). Log only
    // non-identifying operational metadata.
    console.warn("CLASSIFIER_FALLBACK", {
      fallback: result.fallbackUsed,
      tier,
      reason: result.fallbackUsed ? "llm_unavailable" : "non_json_output",
    });
    return {
      state: "productive_struggle",
      confidence: 0.1,
      // No raw model text here either — on fallback it echoes the prompt
      // (pupil turns). A plain operational message keeps the snapshot
      // free of duplicated pupil content.
      rationale: result.fallbackUsed
        ? "Classifier temporarily unavailable — engagement read is a safe placeholder, not a real signal."
        : "Classifier returned malformed output — engagement read is a safe placeholder.",
      cues: ["classifier_fallback"],
      safeguarding: { severity: "none", summary: "" },
      fallbackUsed: true,
      tier,
    };
  }

  const j = result.json as {
    state: EngagementState;
    confidence: number;
    rationale: string;
    cues: string[];
    safeguarding?: {
      severity?: SafeguardingSeverity;
      summary?: string;
      pupilExcerpt?: string;
    };
  };
  const safeguarding: SafeguardingFlag = {
    severity: j.safeguarding?.severity ?? "none",
    summary: j.safeguarding?.summary ?? "",
    pupilExcerpt: j.safeguarding?.pupilExcerpt,
  };
  return {
    state: j.state,
    confidence: Math.min(1, Math.max(0, j.confidence ?? 0)),
    rationale: j.rationale,
    cues: Array.isArray(j.cues) ? j.cues.slice(0, 4) : [],
    safeguarding,
    fallbackUsed: false,
    tier,
  };
}

// Helper: pull the typed JSON object out of an LLM result without
// throwing. Used by the Flash-tier first pass to decide whether to
// escalate to Pro.
function parseClassifier(r: { json?: unknown }): {
  confidence?: number;
  safeguarding?: { severity?: SafeguardingSeverity };
} | null {
  if (!r.json || typeof r.json !== "object") return null;
  return r.json as {
    confidence?: number;
    safeguarding?: { severity?: SafeguardingSeverity };
  };
}
