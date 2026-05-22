import { NextResponse } from "next/server";
import { callLLM } from "@/lib/ai/llm";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/auth";
import { findSyllabus } from "@/lib/syllabi/library";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// POST /api/lessons/intent-suggestions
//
// Given a syllabus topic, returns 3–4 short teacher-voice phrases for
// "what do you want pupils to learn this lesson?" — designed so a busy
// teacher can click a starting point and tweak rather than stare at a
// blank textarea.
//
// Suggestions are cached in Firestore under
//   /syllabusSuggestions/{syllabusId}/yearGroups/{yearGroup}
// so we pay the generation cost once per topic+year. Cache is
// permanent until the syllabus library content changes (the syllabus
// entry hash is stored on the cache doc so we can invalidate if needed).
//
// Body: { syllabusId, yearGroup?, force? }

interface Body {
  syllabusId: string;
  yearGroup?: number;
  force?: boolean;
}

interface CacheDoc {
  suggestions: string[];
  generatedAt: number;
  syllabusHash: string;
}

function syllabusHash(topic: string, subject: string, learningOutcomes: string[]) {
  // Lightweight content hash so we can invalidate if the syllabus entry
  // is meaningfully edited later. Not cryptographic — order-dependent,
  // good enough.
  return [topic, subject, ...learningOutcomes].join("|").length.toString(36) +
    "-" +
    [topic, subject, ...learningOutcomes].join("|").slice(0, 32).replace(/[^a-z0-9]/gi, "");
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.lessonsAppraise);
  if (limited) return limited;

  const a = getAdmin();
  if (!a.ready) {
    return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  }

  // Teacher auth required — pupils shouldn't be hitting this endpoint.
  const authed = await verifyRequest(req, { role: "teacher" });
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.syllabusId) {
    return NextResponse.json({ error: "syllabusId required" }, { status: 400 });
  }

  const entry = findSyllabus(body.syllabusId);
  if (!entry) {
    return NextResponse.json({ error: "syllabus topic not found" }, { status: 404 });
  }

  const yearGroup = body.yearGroup ?? entry.yearGroup;
  const hash = syllabusHash(entry.topic, entry.subject, entry.learningOutcomes);
  const cacheRef = a.db
    .collection("syllabusSuggestions")
    .doc(entry.id)
    .collection("yearGroups")
    .doc(String(yearGroup));

  // Read-through cache. If the stored hash matches, return cached
  // suggestions. force=true skips this and regenerates.
  if (!body.force) {
    try {
      const snap = await cacheRef.get();
      const data = snap.data() as CacheDoc | undefined;
      if (data?.suggestions?.length && data.syllabusHash === hash) {
        return NextResponse.json({
          suggestions: data.suggestions,
          cached: true,
          generatedAt: data.generatedAt,
        });
      }
    } catch {
      // Cache miss path; fall through to generation.
    }
  }

  // Generate. Pro is overkill; Flash with thinking off is plenty for
  // short phrase generation.
  const prompt = buildPrompt(entry, yearGroup);
  const result = await callLLM({
    use: "scaffold", // small + fast Flash bucket
    system: SUGGEST_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxOutputTokens: 320,
    temperature: 0.85,
    thinkingBudget: 0,
    responseSchema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: { type: "string", maxLength: 200 },
          minItems: 3,
          maxItems: 4,
        },
      },
      required: ["suggestions"],
    },
  });

  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(result.text);
    if (Array.isArray(parsed?.suggestions)) {
      suggestions = parsed.suggestions
        .map((s: unknown) => String(s).trim())
        .filter((s: string) => s.length > 10 && s.length < 240)
        .slice(0, 4);
    }
  } catch {
    /* fall through to fallback */
  }

  // Deterministic fallback so the UI never sees an empty list. Two
  // teacher-voice phrases drawn from the syllabus's own learning
  // outcomes; not as varied as the LLM output but always available.
  if (suggestions.length === 0) {
    suggestions = entry.learningOutcomes.slice(0, 3).map(
      (o) => `Get pupils to ${o.charAt(0).toLowerCase()}${o.slice(1)}.`
    );
  }

  // Persist. Best-effort — a write failure shouldn't block the
  // response.
  try {
    await cacheRef.set({
      suggestions,
      generatedAt: Date.now(),
      syllabusHash: hash,
    } satisfies CacheDoc);
  } catch {
    /* noop */
  }

  return NextResponse.json({ suggestions, cached: false });
}

const SUGGEST_SYSTEM = `You write short, natural-voice lesson briefs for UK secondary
teachers. The teacher will use one of your suggestions as a starting
point for a longer system prompt that drives an AI tutor in a single
lesson.

Each suggestion must:
- Be a single sentence in the first person, written as a teacher would
  say it out loud ("I want them to…", "By the end I want pupils to…",
  "Help them realise that…").
- Name a concrete cognitive move (predict, explain in own words, apply
  to a new case, distinguish from a misconception) — not a generic
  curriculum verb like "understand".
- Stay within the topic and year-group; do not invent unrelated content.
- Be 15–35 words. No more.
- Use British English. No emoji.

Return exactly 3–4 distinct suggestions covering different emphases
(retrieval / reasoning / application / misconception). Do not number
them, do not add a preamble.`;

function buildPrompt(
  entry: ReturnType<typeof findSyllabus> & object,
  yearGroup: number,
): string {
  return [
    `Topic: ${entry.topic}`,
    `Subject: ${entry.subject}`,
    `Year group: ${yearGroup}`,
    ``,
    `Programme of study:`,
    entry.programmeOfStudy,
    ``,
    `Learning outcomes from the curriculum:`,
    ...entry.learningOutcomes.map((o) => `- ${o}`),
    ``,
    `Critical concepts:`,
    ...entry.criticalConcepts.map((c) => `- ${c}`),
    ``,
    `Write 3–4 teacher-voice suggestions for "what do you want pupils to learn this lesson?".`,
  ].join("\n");
}
