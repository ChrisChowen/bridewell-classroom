# Bridewell Classroom — working spec

**Status:** v5, updated 21 May 2026 after Chris's "teacher setup must be near-automatic" steer. Adds beyond v4: a curated **UK KS3 syllabus library** (Biology, English, Maths, History) under `src/lib/syllabi/`; an **AI-led class setup wizard** at `NewClassWizard.tsx` that takes (syllabus + teacher's natural-language brief) → drafts a structured `LessonPlan` via Gemini 2.5 Pro → asks the teacher to review/edit/approve → creates the class with the plan attached + a join code. The pupil session reads its class's lesson plan from Firestore (`/api/pupils/me`) and feeds the approved plan's tutor addendum, critical concepts, and opening prompt into the tutor system prompt. Auth, class create, pupil join all end-to-end against the live Firebase project; verified by `scripts/smoke-test-lesson-flow.mjs`. Keep this file concise; do not balloon it.

## What this project is

A greenfield prototype of the **Bridewell Classroom** tool — the integrated teacher-and-student AI tutor for use across the Bridewell Schools (King Edward's Witley, Barrow Hills, Longacre), built for the 29 May 2026 CDT Spring Challenge Final Presentation at the University of Surrey. Audience: Bridewell teachers, Unified Projects (the consultancy who built and will inherit the production Bridewell AI), and the academic panel (Polly Dalton, Andy Woods, Di Fu). The product must feel native to the Bridewell AI ecosystem already in production at the schools — not a third-party tool.

## What this build absolutely is not

- Not a game. No XP, levels, ranks, evolution, creature companions, narrative engine, codex, team roster, game modes, pen-pals, narrative quest engine. Anything that smells like Pokemon/Tuxemon is out.
- Not heritage pastiche. Not a print magazine wrapped around a dashboard. No parchment, no italic cursive in UI titles, no editorial display serifs at headline sizes, no decorative scrolls, no Latin mottos, no kerned LATIN. (`brief/09` is the failure mode this build avoids.)
- Not the previous `bridewell-app` (Bridewell Forge) and not Boss's HTML page. Both are reference artefacts only. Greenfield from zero.
- Not a fake. Any surface that implies LLM inference must call a real LLM, not a string lookup. The compression gap is the named failure mode (see `brief/09`).

## Brand hierarchy (load-bearing)

**Bridewell is the product. The school is configuration.** The Bridewell mark sits in the top-left of every surface. The product wordmark is "Bridewell Classroom". The teacher's school appears only in the user chip in the top-right, alongside the teacher name + initials. Boss's prototype inverted this; we do not. (`BRAND.md`, section *Brand hierarchy*.)

## Visual register (one-line rule)

Calm modern execution of a classical brand. Navy + gold + crest + classical book serif for display, humanist sans for everything else. Reference set: Linear and Anthropic for restraint, Notion for calm content surfaces, Apple HIG for system surfaces. Not pastiche. Not generic SaaS. Not a game. (`BRAND.md` is the source of truth; `lib/brand/` is its code-level expression.)

## Demo-day load-bearing question

The audience question that must not sink the demo on 29 May is **"show me how the dashboard knows a student is struggling"**. Two things together carry that question:

1. The **engagement classifier** (Sonnet 4.5, five named states from the productive-struggle literature, called every 5 messages or 60 seconds, persisted with a confidence score).
2. The **Reason confidence trajectory** per pupil, alongside the engagement trajectory, in the per-pupil drill-down.

If a feature does not serve that question, deprioritise it.

## What is in scope (A–O)

A. **Student AI tutor.** Single character, configurable by the teacher. Coach mode (asks rather than answers) by default; Expert mode the teacher can toggle. Real Claude API calls on Haiku 4.5. No avatar, no name, no friend-framing. The tool, not a buddy.

B. **Three scaffolding buttons** on the prior tutor turn: Hint, Rephrase, Simplify. Each a constrained model call with a template, not a string lookup.

C. **Reason interaction** per `brief/03`. Four named layers (trigger, prompt, evaluation, response) implemented as a module under `src/layers/`. Inline in the chat as a distinct visual moment with the gold-accent surface (`BRAND.md` *Reason surface*), not a fourth button. Trigger conditions: topic boundary, scaffolding ceiling, teacher trigger, lesson-design trigger.

D. **Engagement classifier.** Five states (flowing, productive_struggle, wheel_spinning, disengaged, off_task) from Kapur 2008 / Chen et al. 2024 / Zhang et al. Confidence score per call. Called every 5 messages or 60 seconds. Sonnet 4.5. Snapshots persisted to Firestore; latest state mirrored to RTDB for live dashboard.

E. **Teacher dashboard.** Today screen with multi-class overview, per-class engagement timeline heatmap, per-pupil drill-down, intervention panel. Pattern surfacing, not alerts (the 13 May Bridewell interviews are explicit on this — visual over notification, evidence over instance).

F. **Intervention panel.** Adjust system prompt, send teacher hint into student chat, switch Coach/Expert with rationale prompt, fire pair-up nudge, pause class, mark reviewed.

G. **Lesson configuration — AI-led, teacher-approved.** Teachers do not write system prompts. The setup wizard takes (a) a syllabus topic picked from `src/lib/syllabi/library.ts` and (b) a natural-language brief about what pupils should come away with, and asks Gemini 2.5 Pro to draft a structured `LessonPlan`: title, objectives, critical concepts (for Reason), a 2–5 step sequence each with an opening prompt and expected misconceptions, a tutor addendum that gets spliced into the coach-mode system prompt, scaffolding ceiling, estimated time. The teacher reviews each section, edits anything, and approves. On approval the class is created with the plan attached and a join code is shown. The pupil session reads the approved plan from Firestore via `/api/pupils/me` and feeds it to every tutor call. Teacher-CPD gap closed.

H. **Per-pupil chat history.** Persisted in Firestore. Teacher can read what each pupil wrote and what the AI replied.

I. **Longitudinal learner profile.** Per pupil across sessions: trajectory of engagement state, scaffolding-button reliance, Reason confidence, SEND adaptation effectiveness. Updated post-session by Sonnet (`/api/profile-update`).

J. **SEND adaptation.** Per-pupil profile feeds into prompt construction. Accessibility menu on the student side (font size, OpenDyslexic, reduced motion, voice). See `brief/07` section 10 for the SEND-need-to-AI-adaptation mapping; ignore the gamification framing around it.

K. **Voice I/O.** Web Speech API for input, ElevenLabs Flash v2.5 for output. One voice per mode, calm, British English. Per-student opt-in. Voice recordings never stored.

L. **Sign-in.** Teacher email/password (Firebase Auth). Student class join code plus display name plus optional 4-digit PIN. Documented migration path to Azure Entra ID via SAML/OIDC.

M. **Classroom display mode.** Second-screen route (`/(display)/classroom`) for the projector — quiet, glanceable, no student-identifying chat detail.

N. **Data export.** Anonymised CSV/JSON of session logs, engagement trajectories, scaffolding events, Reason interactions, intervention events. Pseudonymised participant IDs (P001…).

O. **Graceful degradation.** API failure falls back to rule-based replies; dashboard shows a fallback indicator on that pupil; session does not die. All fallback events logged.

## Demo scenarios (must work on 29 May)

These are the three live moves Chris will walk the audience through on stage. Everything else in the surface area supports them.

**A. Productive path.** Pupil asks a question; AI replies in coach mode; pupil writes a thoughtful response; Reason fires at a topic boundary with a paraphrase prompt; pupil paraphrases substantively; confidence high; dashboard stays in `flowing`.

**B. Cognitive surrender path.** Pupil presses Hint, Rephrase, Simplify in sequence; Reason fires at the scaffolding ceiling with a teach-back prompt; pupil produces empty or echo response; confidence low; dashboard surfaces the pupil with a `wheel_spinning` pattern flag; teacher fires an intervention from the same surface; the intervention arrives in the student's chat within 2 seconds.

**C. Productive struggle path.** Pupil takes a long time, types and deletes, asks a follow-up rather than reaching for scaffolding; Reason fires on a lesson-design trigger for a critical concept; pupil produces a partial response with a novel example; confidence medium; AI soft-challenges; pupil elaborates; confidence climbs; dashboard reads `productive_struggle` across the trajectory.

## Tech stack

- **Next.js 16** App Router, **React 19**, **TypeScript strict**.
- **Tailwind 4** (CSS-first config), **shadcn/ui** where it fits, Lucide for icons.
- **Firebase**: project ID `bridewell-classroom`. Firestore (persistent data), RTDB (live state, enable in console before Phase 1), Auth (teachers + anonymous students with join code), Cloud Functions if needed for protected API surfaces. Local emulator for development.
- **LLM tier**: **Google Gemini** via `@google/genai`. `gemini-2.5-flash` for tutor + scaffolding (with `thinkingBudget: 0` for fast turns); `gemini-2.5-pro` for the engagement classifier, Reason evaluation, and longitudinal profile updates. Server-side key only (`GEMINI_API_KEY` in `.env.local`).
- **ElevenLabs Flash v2.5** for TTS. **Web Speech API** for STT.
- **Zustand** only if state lifts beyond `useState`. No Redux.
- **Playwright** end-to-end tests for the three demo scenarios.
- **Deployment**: Vercel preview per push. API keys server-side only (Next.js Route Handlers).

## Folder structure (current, not aspirational)

```
src/
  app/
    page.tsx                 — landing
    layout.tsx
    globals.css
    (auth)/                  — login, join, onboarding
    (student)/               — home, session, accessibility
    (teacher)/               — dashboard, lesson, pupil, longitudinal, export
    (display)/               — classroom (second-screen projector route)
    api/                     — chat, scaffold, reason, engagement,
                                intervention, profile-update, export, fallback
  components/
    student/                 — chat, scaffold-bar, reason-prompt,
                                accessibility-menu, voice-input, voice-output
    teacher/                 — class-grid, engagement-heatmap, pupil-drill,
                                action-panel, lesson-config,
                                longitudinal-trajectory
    shared/                  — primitives, crest, fleur, state-pill,
                                wordmark, user-chip
  layers/
    trigger.ts               — Reason trigger logic
    prompts.ts               — Reason prompt library
    evaluator.ts             — Reason evaluation
    responder.ts             — Reason response branching
    scaffolding.ts           — Hint / Rephrase / Simplify generators
    classifier.ts            — Engagement state classifier
  lib/
    firebase/                — firestore, realtime, auth (client + admin)
    ai/                      — Claude client with prompt caching, model IDs
    voice/                   — tts, stt
    brand/                   — design tokens (colour, type, spacing,
                                state palette, reason surface treatment)
  state/
    session.ts, lesson.ts, dashboard.ts  — Zustand stores (only if needed)
  types/
    index.ts                 — domain types (lesson, pupil, conversation,
                                engagement snapshot, reason event,
                                intervention, learner profile)
```

## Build order (non-negotiable; stop at the end of each phase)

**Phase 0 — Scaffold + brand.** Next.js + TS strict + Tailwind 4 set up. `lib/brand/` design tokens. Landing surface shows the brand mark and wordmark, sized and laid out per `BRAND.md`. Empty teacher dashboard route. Empty student session route with a mocked tutor reply. Empty join + login surfaces. Firebase + Anthropic clients stubbed but not yet wired to real services. Vercel preview. **Check-in with Chris.**

**Phase 1 — Real tutor, scaffolding, classifier, dashboard.** Real Claude tutor on Haiku, three scaffolding buttons as constrained generators, engagement classifier on Sonnet wired into Firestore (snapshots) + RTDB (live state). Teacher dashboard shows real classroom state with the engagement timeline. **End-of-phase: Scenario A runs honestly.** Check-in.

**Phase 2 — Reason architecture in full.** Four layers as named modules under `src/layers/`. Reason interaction surfaces inline with the gold-accent visual. Reason confidence trajectory appears per pupil alongside engagement trajectory. **End-of-phase: Scenarios B and C run honestly.** Check-in.

**Phase 3 — Intervention loop and lesson management.** Intervention panel end to end (hint, mode switch with rationale, pair-up, pause). Lesson configuration surface. Per-pupil chat history view. **End-of-phase: teacher can run a full lesson without leaving the product.** Check-in.

**Phase 4 — SEND, voice, multi-device, longitudinal, export.** SEND profiles feed prompt construction. Accessibility menu on student side. Voice I/O. iPad responsive (1024×768 landscape minimum). Classroom display mode. Longitudinal learner profile view. Anonymised data export. **End-of-phase: brief's six focus areas substantively addressed.** Check-in.

**Phase 5 — Resilience and polish.** Graceful degradation when API fails. React error boundaries. Fallback indicators on the dashboard. Loading states + skeletons. Playwright tests for scenarios A, B, C. Demo data seeding. Deck-ready screenshots and a recorded walkthrough. **Final check-in.**

## Models strategy

- **Tutor — Coach** (default): `gemini-2.5-flash`, `thinkingBudget: 0`, coach-mode system prompt. Asks rather than answers. The lesson context + critical concepts are injected per call via `buildTutorSystemPrompt` in `src/lib/ai/prompts.ts`. Cheap, fast, no grounding.
- **Tutor — Expert**: same Flash model, `grounding: true` (Google Search tool). Returns citations + `searchQueries`; the UI surfaces them as a Verified affordance under the tutor turn. Use when the teacher wants a factual answer on the page.
- **Scaffolding generators** (Hint / Rephrase / Simplify): Flash, `thinkingBudget: 0`, constrained one-sentence templates in `SCAFFOLD_SYSTEM`. Take only the prior tutor turn as input.
- **Engagement classifier**: `gemini-2.5-pro` with `responseSchema` returning `{ state, confidence, rationale, cues }`. `thinkingBudget: 1024`, `maxOutputTokens: 2048`. Lives in `src/layers/classifier.ts`; exposed at `POST /api/engagement/run` (token-gated; persists the snapshot, mirrors live state to RTDB, maintains the names-stripped projector aggregate, and advances the lesson step).
- **Reason evaluator**: `gemini-2.5-pro` with `responseSchema` returning `{ confidence, branch, rationale, weakest_segment, follow_up }`. Same thinking + token budget. Lives in `src/layers/evaluator.ts`; exposed at `POST /api/reason/evaluate`. The responder branches on the `branch` field per Reason architecture v2.
- **Longitudinal profile updater**: `gemini-2.5-pro`, async post-session. Will rewrite the `LearnerProfile` document.

All LLM calls go through `src/lib/ai/llm.ts` — a single typed `callLLM` entry point with named model keys, deterministic fallback when the key is missing or the call errors, optional `responseSchema` for structured JSON, `grounding: boolean` for the Google Search tool with grounding metadata + citation extraction, and an explicit `thinkingBudget` knob for the 2.5 tier. Pro calls need `maxOutputTokens >= 2048` and a non-zero `thinkingBudget` when emitting JSON — the thinking step otherwise burns the budget before the JSON lands.

## Lesson context and (later) RAG

For Phase 1 the lesson context is a free-text block injected into the tutor system prompt by `buildTutorSystemPrompt`. The block includes the lesson title, subject, the teacher's marked critical concepts, and (optionally) a paragraph of teacher-curated content. Gemini's 1M-token context window means we can pass a chapter-sized extract per call without compression.

When syllabi grow beyond a comfortable inline injection: upload the document to Gemini's Files API, create an explicit context cache (`ai.caches.create`), and reference the cache by name per call. Cached reads are ~90% cheaper than uncached input. The brand-tokens / SDK abstraction is already in `llm.ts` so this swap is internal.

Grounding (Google Search) is the accuracy floor for Expert mode and a future `factCheck` mode on the Reason evaluator (compare pupil claims against ground truth on critical concepts). It is off by default for coach turns to avoid cost and to keep the coaching register tight.

## Visual rules at the code level

`lib/brand/` is the source of truth for colour, type, spacing, state palette, and the Reason surface treatment. Every UI component imports tokens from there. Components do not declare ad-hoc hex values; if a colour is needed that is not in the brand tokens, add it to `lib/brand/` first and justify it in a comment.

Tailwind 4's CSS-first config means brand tokens are exposed as `@theme` variables in `globals.css`. Component classes reference those variables via Tailwind utilities. shadcn/ui primitives are themed against the same variables.

**Default colour mode is light.** BRAND.md is explicit that dark mode is for teacher use in dim rooms, not the default register. The dark theme is opt-in via `<html data-theme="dark">`; the `ThemeToggle` component persists the choice to localStorage. There is no `prefers-color-scheme` auto-switch.

**The Bridewell crest** lives at `/public/crest.png`, ported from the prior `bridewell-app` build. Renders top-left of every product surface at 28–40px. Until a clean SVG is sourced, the PNG is the canonical mark; `next/image` keeps it crisp.

**Bespoke dashboard.** The teacher dashboard's centrepiece is the **Class Stream** (`src/components/teacher/ClassStream.tsx`): one horizon ribbon per pupil, oldest → newest, the head pulsing at "now", sorted attention-required first. Pair with `StateDistribution.tsx` (current snapshot, five tiles) and `PupilPanel.tsx` (drill-down with engagement state + Reason-confidence trajectory). The ribbon design scales to ~30 pupils on a 1280px screen without losing legibility.

## Pacing rule

After each phase in the build order above: stop. Show Chris what changed. Do not batch.

When in doubt, optimise for the demo on 29 May surviving the question "show me how the dashboard knows a student is struggling". The engagement classifier plus the Reason confidence trajectory together carry that question. If a feature does not serve it, deprioritise.
