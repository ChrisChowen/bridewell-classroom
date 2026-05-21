# Audit — Bridewell Classroom against *Reason v2*

Read against Chris Chowen's _Reason: an interaction architecture for probing
student understanding, v2_ (18 May 2026).

This document is honest, not generous. It calls out where the prototype lands
the architecture, where it merely gestures at it, and where it diverges. The
intent is something we can talk against, not a victory lap.

---

## TL;DR

The four-layer architecture **is present and load-bearing** in this build.
Triggers, prompts, evaluation and response all live in named modules under
`src/layers/`, the pupil sees Reason as an inline interaction (not a fourth
button), and the dashboard receives signal rather than alerts. The teacher
constraint ("evidence that aggregates, not alerts that fire") is honoured.

Where the build falls short of v2:
1. **Topic-boundary trigger is a stub.** The system fires on scaffold ceiling
   and lesson-design, which carry the demo, but proper chat segmentation
   ("the AI's segmentation closed a line of questioning") is not implemented.
2. **Reason confidence trajectory not yet surfaced on the dashboard.** Events
   are persisted; the drill panel reads them; a per-pupil confidence
   sparkline alongside the engagement sparkline is described in the spec but
   not built.
3. **Lexical-overlap signal is implicit, not explicit.** The evaluator is
   asked to consider echo behaviour in its prompt; there's no separate
   embedding-distance / lexical-overlap signal that combines with the LLM
   judgment.
4. **Pattern-flag aggregation is per-event, not per-concept across sessions.**
   A flag fires once and goes to the dashboard; it isn't yet promoted to a
   teacher pattern when it recurs on the same concept across multiple
   sessions.

Each of the above is a known seam, not a contradiction with the architecture.

---

## Layer-by-layer reading

### 1. Trigger layer

**v2 says:** four conditions, in order — topic boundary, scaffolding ceiling,
teacher trigger, lesson-design. System-driven cases default-on; teacher
trigger optional; lesson-design set once at lesson prep.

**Build has:** `src/layers/trigger.ts` exports `shouldFireReason(input)` with
all four cases as the named enum (`topic_boundary`, `scaffolding_ceiling`,
`teacher`, `lesson_design`).

**Reading:**

- ✅ **Scaffolding ceiling** is live. Wired in `ChatSurface.tsx` —
  `signalsRef.current.scaffoldUseCount >= lessonPlan.scaffoldCeiling` fires
  the card. The ceiling is per-lesson-plan (`scaffoldCeiling`, default 3),
  matching v2's "configurable threshold per concept".
- ✅ **Lesson-design trigger** is live. Concepts marked critical in the plan
  (`criticalConcepts[]`) carry through `buildTutorSystemPrompt` and fire
  Reason on the relevant turns.
- ✅ **Teacher trigger** is live as an intervention. The dashboard's drill
  panel has the affordance; a teacher token fires `/api/reason/fire` with
  `trigger: "teacher"`. Defaults off — teachers who want it opt in.
- ⚠️ **Topic-boundary trigger** is a placeholder. `topicBoundaryReached` is
  always false in the runtime path because we don't have chat-segmentation
  yet. v2 was explicit that segmentation already exists in the consulting
  company's stack ("hook into the existing chat-segmentation") — we don't
  re-implement it here. **For demo:** the scaffold-ceiling and lesson-design
  triggers carry both the productive and the cognitive-surrender scenarios.

The order v2 cares about (system before teacher) is preserved in the
client-side fire order.

### 2. Prompt layer

**v2 says:** small library of four prompt types — paraphrase, novel example,
counterfactual, teach-back. Selector is random within constraints, weighted
by subject. The library should be small on purpose ("expanding it makes the
interaction feel more like a test").

**Build has:** `src/layers/prompts.ts` — exactly those four types, two
templates each, a `selectReasonPrompt({ concept, subject, lastType, seed })`
function with no-back-to-back and subject-weighting.

**Reading:**

- ✅ **Type set is verbatim from v2.** No drift. `ReasonPromptType` in
  `src/types/index.ts` is `"paraphrase" | "novel_example" | "counterfactual"
  | "teach_back"`.
- ✅ **Library is small.** Two templates per type. Single file. Easy for
  Unified Projects to edit without touching code.
- ✅ **Subject weighting** weights counterfactuals into maths/science and
  paraphrase / teach-back across English/History, per v2's reasoning.
- ✅ **Repeats avoided.** The `lastType` argument excludes the most recent
  type from the eligible pool.

One small note: v2 talks about prompts that "the consulting company can edit
in markdown". The templates are currently inline strings. Lifting them to a
markdown file is a one-line `import { readFile } from "fs"` change at build
time — not done, but the seam is obvious. If you want this called out as a
handover affordance I'd be happy to add it.

### 3. Evaluation layer

**v2 says:** three signals combine into a confidence score:
length-and-substance, lexical overlap with the AI's prior output,
embedding-distance from a known good answer. Reuses the existing analytics
pipeline; no new infrastructure.

**Build has:** `src/layers/evaluator.ts` calls a reasoning-tier LLM with a
strict `responseSchema` returning `{ confidence, branch, rationale,
weakestSegment, followUp }`.

**Reading — this is the largest divergence from v2:**

- ✅ **The output shape is what v2 asked for.** Confidence in [0,1], a
  branch in {accept, soft_challenge, pattern_flag}, a rationale never shown
  to the pupil, the weakest segment + a drafted follow-up.
- ✅ **The evaluator considers length, substance, and lexical echo,** but
  by **prompting the LLM to do so** (the SYSTEM block instructs it: "high
  lexical overlap with the prior tutor turn is suspicious"). Not as three
  separately-computable signals that combine.
- ⚠️ **No embedding-distance pipeline.** v2 was specific that the existing
  analytics pipeline already does prompt-complexity and repetition; the
  evaluator should be the same machinery applied to the response slot. We
  don't have that pipeline in this prototype — the LLM substitutes for it.
- ⚠️ **No subject-anchored "known good response".** v2 hinted that
  concepts marked in the system prompt could carry an expected-answer
  embedding for similarity scoring. We carry the critical concepts forward;
  we don't carry expected answers.
- ✅ **Generosity beats severity** is in the prompt verbatim. The system
  is instructed to err on the side of `productive_struggle` over
  `wheel_spinning` to avoid interrupting a learning pupil.

This is the layer where the prototype most needs the consulting company's
existing pipeline to land production-equivalent. The LLM-only approach
demos honestly and produces real soft-challenge follow-ups, but it doesn't
reuse Parmida's NLP work, which was v2's explicit cost-saving claim.

### 4. Response layer

**v2 says:** three branches. Accept → acknowledge briefly + resume. Soft
challenge → one follow-up targeting weakest segment. Pattern flag → log,
aggregate to the dashboard, **never an alert**, never told to the pupil.

**Build has:** `src/layers/responder.ts` — pure function `shapeResponse`
that branches on `evaluation.branch` and returns
`{ branch, tutorTurn?, emitPatternFlag }`.

**Reading:**

- ✅ **Branches are exactly v2's.**
- ✅ **Soft challenge uses the evaluator-drafted follow-up.** Falls back to
  a generic "can you say a bit more?" if the evaluator didn't draft one.
- ✅ **Pattern flag is silent to the pupil.** No tutor turn emitted; the
  flag goes to Firestore via `reasonEvents` and the dashboard reads it.
- ✅ **Framing stays generative.** No "you don't understand"; no
  evaluative language. v2's Fray-deskilling mitigation honoured.
- ⚠️ **Pattern aggregation is event-level, not concept-level-across-
  sessions.** v2 specified _"low-confidence responses across multiple Reason
  interactions in a session, or across multiple sessions on the same
  concept."_ The build raises the flag the first time it fires. The teacher
  dashboard does not yet promote it to a pattern when the same concept
  recurs. This is the most concrete piece of v2 that is sketched rather
  than fully built.

---

## v2's four pushbacks — how the build addresses them

### Pushback 1: "Adding a fourth button is the obvious move and might not be the right one"

**Build:** Reason is **not a fourth button**. It surfaces as an **inline
gold-accent card** in the chat thread when a trigger fires — visually
distinct from the three scaffold buttons, contextually different from a
"more help on offer" affordance. The card is dismissable but pupils can't
summon it; they only see it when the system decides.

**v2 quote:** _"It may be inline in the chat flow. It may be a modal at a
topic boundary. It may be invisible to the student until it fires."_

We took the first option. Defensible against the pushback.

### Pushback 2: "Teacher time is the binding constraint"

**Build:**

- The drill panel surfaces a **safeguarding chip + last message preview +
  state pill + sparkline** on each pupil card. Teachers see patterns at a
  glance.
- Reason interactions aggregate as a **trajectory in the drill panel**, not
  as an alert.
- The post-class **appraisal panel** is the one explicit moment a teacher
  is asked to read something — and even then, it's optional ("save to
  library" is the only follow-up).
- Class-wide controls (pause / wrap-up / end) work _without_ touching any
  individual pupil.

**v2 quote:** _"They want patterns surfaced. They want visual over
notification. They want evidence over instance."_

This is the strongest place the build lands the v2 brief. There is no
notification UX anywhere — every signal lives on the dashboard waiting to
be glanced at.

### Pushback 3: "The consulting company is the final architect, not us"

**Build:**

- Every LLM call goes through `src/lib/ai/llm.ts` — a single typed seam.
- Models are named by job in `src/lib/ai/models.ts`, not hardcoded.
- The Reason templates are inline but trivially liftable to markdown.
- The trigger function is pure and reads from a typed input object — a
  drop-in replacement for whichever segmentation logic Unified already has.
- RTDB shape is documented in `src/lib/firebase/live.ts` types.
- The README has a "Handover" section that calls each layer's integration
  burden.

**v2 quote:** _"every component should map to something Unified Projects
can implement against the Bridewell AI as it actually exists"_.

The seams are visible. There's still work — the evaluator divergence
(LLM-only vs the three-signal aggregation v2 described) is the one place
Unified would need to either keep our shape or substitute their pipeline.

### Pushback 4: "Fray's deskilling concern deserves a direct answer"

**Build:**

- The pupil **never sees a confidence score**. The closing screen reads
  the conversation and summarises what the pupil _showed_, in their own
  phrasing.
- Reason produces **evidence**, not a **verdict**. The branch determines
  the next tutor move, not a label on the pupil.
- The dashboard surfaces Reason signals **alongside** scaffolding-use
  counts and the engagement sparkline — never instead of them.
- Pattern-flag does not raise an alert or show the pupil that something
  is "wrong" — the system continues the conversation as if nothing
  happened.

**v2 quote:** _"the system does not tell the student 'you understand this'
or 'you do not understand this'; it generates a signal that the teacher
(and the analytics pipeline) can use as one input among several"_.

Honoured throughout. Worth saying that the safeguarding signal lives in
the same call as the engagement classifier and follows the same
"surface-to-teacher-only" rule, which extends v2's principle to a
neighbouring risk surface (disclosure of distress).

---

## Things the build adds that v2 doesn't specify

Worth flagging since they live alongside the Reason machinery:

- **Five-state engagement classifier** with safeguarding signal in the
  same call. v2 mentioned "the productive struggle vs wheel spinning
  distinction" once; the build commits to a five-state taxonomy from the
  literature (Kapur 2008; Chen et al. 2024; Zhang et al.) and a confidence
  score, persisted to Firestore + mirrored to RTDB.
- **Step progression** that advances the pupil through the lesson plan
  when classifier confidence sustains > 0.7. This is implicit in v2's
  "evidence aggregates" framing but not specified.
- **Flash → Pro classifier tiebreaker**, addressing v2's concern about
  cost at scale ("we do not yet know what this costs at full class scale").
- **Step timeline** on the teacher view — bird's-eye class progress
  across the lesson plan, no individual targeting, complements rather
  than replacing the per-pupil cards.

---

## Open questions for discussion

1. **Pattern-flag aggregation.** Want me to wire the across-sessions-per-
   concept aggregation? It's a Firestore composite index + a small
   per-concept rollup. ~2 hours.
2. **Three-signal evaluator (lexical overlap + length + embedding
   distance).** Want me to add the explicit signal computation alongside
   the LLM judgment, even if the embedding pipeline is mocked? Would let
   us claim the v2 evaluator shape more honestly. ~3-4 hours.
3. **Reason confidence sparkline on the dashboard** — would slot next to
   the engagement sparkline on each pupil card. ~1 hour.
4. **Topic-boundary trigger** — stays a known gap or gets a placeholder
   implementation (e.g. "fire after every Nth tutor turn") for the demo?
5. **Templates as markdown for Unified.** Want me to lift the four
   template families out of `src/layers/prompts.ts` into
   `content/reason-templates.md` so the consulting company can edit them
   without a code deploy? ~30 minutes.

These are all small relative to the surface area already built.
