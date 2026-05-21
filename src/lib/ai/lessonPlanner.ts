// Lesson plan generator. Takes a syllabus entry + the teacher's
// natural-language intent and returns a structured LessonPlan via
// Gemini 2.5 Pro. Used by /api/lessons/generate. Strict JSON via
// responseSchema; thinking budget on so the model can reason about
// pacing and concept dependency.
//
// CLAUDE.md §G: the teacher writes the system prompt — but they
// shouldn't have to. The AI writes the lesson plan and the teacher
// approves or edits it. This module is the bridge.

import "server-only";
import { callLLM } from "./llm";
import { ACTIVITIES, ALL_ACTIVITY_TYPES } from "./activities";
import type { SyllabusEntry } from "@/lib/syllabi/types";
import type { ActivityType, LessonPlan } from "@/types";

export interface GenerateLessonPlanInput {
  syllabus: SyllabusEntry;
  teacherIntent: string;
  // Optional refinement: the teacher's class context (Year group, set,
  // SEND notes), which the AI takes as soft guidance.
  className?: string;
  yearGroup?: number;
  classNotes?: string;
}

function buildSystemPrompt(): string {
  // Activity catalogue, injected so the planner picks from a real menu
  // rather than freelancing labels.
  const activityCatalogue = ALL_ACTIVITY_TYPES.map(
    (k) => `  - "${k}" — ${ACTIVITIES[k].label}: ${ACTIVITIES[k].description}`
  ).join("\n");

  return `You are a senior teacher who has run thousands of lessons. A colleague
will give you (a) a syllabus extract from the UK National Curriculum and
(b) a short natural-language brief describing what they want the pupils
to learn in this lesson. You produce a structured lesson plan that an
AI tutor will then run with the pupil.

Hard rules:
  - The tutor will be operating in COACH mode by default — it asks
    rather than answers. Your plan must work with that constraint.
  - You will name the small set of concepts whose understanding is
    critical. The AI will fire its "Reason" probing interaction on
    these. Pick 2–4. Critical means: if the pupil cannot demonstrate
    this in their own words, they have not learned the topic.
  - You will produce a SEQUENCE of 2–5 steps. Pacing matters — a 30
    minute lesson does not get 5 steps.
  - Each step gets an ACTIVITY TYPE drawn from this catalogue:
${activityCatalogue}
  - **Vary the activities across the sequence.** A real Year-8 lesson
    is not 45 minutes of pure Socratic dialogue — it moves between
    questioning, prediction, retrieval, sorting, worked examples, and
    short application. Open with socratic to surface prior knowledge;
    mix in retrieval_quiz or sort_or_match for a fast tempo change;
    use prediction or worked_example_with_gaps where the topic invites
    it; close with teach_back or exam_style_practice. Do not repeat
    the same activity in adjacent steps.
  - Each step also has a goal, an opening prompt the tutor uses to
    enter it, and the critical concepts that surface during that step.
    Anticipate the 1–3 most common pupil misconceptions per step.
    Give each step an estimatedMinutes (5–15 typical).
  - Write a "tutor addendum" paragraph that we will splice into the
    tutor's coach-mode system prompt. Address the tutor directly
    ("Anchor the conversation around X. If the pupil says Y, gently
    probe Z."). British English, calm, no exclamations, no emoji.
  - Default scaffoldCeiling is 3. Lift to 4 only if the topic is
    unusually hard.
  - Surface anything you assumed in notesForTeacher (e.g. "I have
    assumed pupils have met word equations before"). The teacher will
    review these.

Output strict JSON only — no prose outside the schema.`;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
    criticalConcepts: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    keyVocabulary: { type: "array", items: { type: "string" } },
    sequence: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          goal: { type: "string" },
          activityType: { type: "string", enum: ALL_ACTIVITY_TYPES },
          criticalConcepts: { type: "array", items: { type: "string" } },
          openingPrompt: { type: "string" },
          expectedMisconceptions: { type: "array", items: { type: "string" } },
          estimatedMinutes: { type: "integer", minimum: 3, maximum: 30 },
        },
        required: ["title", "goal", "activityType", "criticalConcepts", "openingPrompt"],
      },
    },
    tutorAddendum: { type: "string" },
    scaffoldCeiling: { type: "integer", minimum: 1, maximum: 6 },
    estimatedMinutes: { type: "integer", minimum: 10, maximum: 120 },
    notesForTeacher: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "learningObjectives",
    "criticalConcepts",
    "sequence",
    "tutorAddendum",
    "scaffoldCeiling",
    "estimatedMinutes",
  ],
} as const;

export async function generateLessonPlan(
  input: GenerateLessonPlanInput
): Promise<LessonPlan & { fallbackUsed: boolean }> {
  const { syllabus, teacherIntent } = input;

  const userBlock = [
    `Syllabus reference: ${syllabus.subject} · ${syllabus.keyStage} · Year ${syllabus.yearGroup} · "${syllabus.topic}"`,
    `Source: ${syllabus.source.name}`,
    `Programme of study: ${syllabus.programmeOfStudy}`,
    `Curriculum learning outcomes:\n${syllabus.learningOutcomes.map((o) => `- ${o}`).join("\n")}`,
    `Suggested duration: ${syllabus.suggestedMinutes} minutes.`,
    syllabus.criticalConcepts.length
      ? `Default critical concepts:\n${syllabus.criticalConcepts.map((c) => `- ${c}`).join("\n")}`
      : null,
    syllabus.keyVocabulary.length
      ? `Key vocabulary:\n${syllabus.keyVocabulary.map((v) => `- ${v}`).join(", ")}`
      : null,
    "",
    `Teacher class context: ${input.className ?? "n/a"}${input.yearGroup ? ` (Year ${input.yearGroup})` : ""}`,
    input.classNotes ? `Teacher notes about the class: ${input.classNotes}` : null,
    "",
    `Teacher brief (natural language) — produce the lesson plan to land this:`,
    teacherIntent.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callLLM({
    use: "reasonEvaluator", // Pro tier; we want thinking on for this.
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userBlock }],
    responseSchema: SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 4096,
    thinkingBudget: 2048,
    temperature: 0.4,
  });

  if (result.fallbackUsed || !result.json) {
    return {
      id: cryptoRandomId(),
      title: `${syllabus.topic} (fallback)`,
      subject: syllabus.subject,
      yearGroup: input.yearGroup ?? syllabus.yearGroup,
      teacherIntent,
      syllabusId: syllabus.id,
      learningObjectives: syllabus.learningOutcomes.slice(0, 4),
      criticalConcepts: syllabus.criticalConcepts,
      keyVocabulary: syllabus.keyVocabulary,
      sequence: [
        {
          title: syllabus.topic,
          goal: syllabus.learningOutcomes[0] ?? "Introduce the topic",
          activityType: "socratic",
          criticalConcepts: syllabus.criticalConcepts,
          openingPrompt: `Let us begin with ${syllabus.topic}. What do you already know?`,
          estimatedMinutes: syllabus.suggestedMinutes,
        },
      ],
      tutorAddendum:
        `Lesson plan generator was unavailable; using the syllabus directly. ` +
        `Anchor to ${syllabus.topic} for Year ${syllabus.yearGroup}.`,
      scaffoldCeiling: 3,
      defaultMode: "coach",
      estimatedMinutes: syllabus.suggestedMinutes,
      generatedAt: Date.now(),
      notesForTeacher: [
        `LLM was unavailable when this plan was generated (${result.text.slice(0, 120)}…). ` +
          `Plan reflects the syllabus directly; edit before approving.`,
      ],
      fallbackUsed: true,
    };
  }

  const j = result.json as {
    title: string;
    learningObjectives: string[];
    criticalConcepts: string[];
    keyVocabulary?: string[];
    sequence: Array<{
      title: string;
      goal: string;
      activityType?: ActivityType;
      criticalConcepts: string[];
      openingPrompt: string;
      expectedMisconceptions?: string[];
      estimatedMinutes?: number;
    }>;
    tutorAddendum: string;
    scaffoldCeiling: number;
    estimatedMinutes: number;
    notesForTeacher?: string[];
  };

  // Belt-and-braces: ensure every step has an activity, defaulting to
  // socratic if the model returned a step without one.
  const sequence = j.sequence.map((s) => ({
    title: s.title,
    goal: s.goal,
    activityType: (s.activityType ?? "socratic") as ActivityType,
    criticalConcepts: s.criticalConcepts,
    openingPrompt: s.openingPrompt,
    expectedMisconceptions: s.expectedMisconceptions,
    estimatedMinutes: s.estimatedMinutes,
  }));

  return {
    id: cryptoRandomId(),
    title: j.title,
    subject: syllabus.subject,
    yearGroup: input.yearGroup ?? syllabus.yearGroup,
    teacherIntent,
    syllabusId: syllabus.id,
    learningObjectives: j.learningObjectives,
    criticalConcepts: j.criticalConcepts,
    keyVocabulary: j.keyVocabulary ?? syllabus.keyVocabulary,
    sequence,
    tutorAddendum: j.tutorAddendum,
    scaffoldCeiling: clampInt(j.scaffoldCeiling, 1, 6) ?? 3,
    defaultMode: "coach",
    estimatedMinutes: clampInt(j.estimatedMinutes, 10, 120) ?? syllabus.suggestedMinutes,
    generatedAt: Date.now(),
    notesForTeacher: j.notesForTeacher,
    fallbackUsed: false,
  };
}

function cryptoRandomId() {
  return `lp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function clampInt(v: unknown, min: number, max: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined;
  return Math.max(min, Math.min(max, Math.round(v)));
}
