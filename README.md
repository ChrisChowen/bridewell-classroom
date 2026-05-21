# Bridewell Classroom

> A teaching instrument for the Bridewell schools — an in-lesson AI tutor for pupils,
> with a live engagement dashboard and intervention surface for teachers.

**Live demo:** **[bridewell-classroom.web.app](https://bridewell-classroom.web.app)**

Pupils open `/j/ABC-123` (substituting their teacher's six-character class code) from
any phone or laptop to join a class with one tap. Teachers sign in to build a lesson
and run it.

<p align="center">
  <img src="docs/screenshots/01-landing.png" width="820" alt="Bridewell Classroom landing page">
</p>

Built for the 29 May 2026 CDT Spring Challenge Final Presentation at the University of
Surrey, alongside the production Bridewell AI work led by Unified Projects. Designed to
sit inside the Bridewell AI ecosystem already in production at
[King Edward's Witley](https://www.kesw.org/), [Barrow Hills](https://www.barrowhills.org/),
and Longacre. Audience: Bridewell teachers, Unified Projects, the CDT academic panel
(Polly Dalton, Andy Woods, Di Fu), and parents/stakeholders.

---

## Why this exists

The 2026 Bridewell challenge brief asks the team to build for "teachers in the loop"
not "AI in front of pupils". Three constraints from the 13 May Bridewell teacher
interviews shape every decision in this build:

- **Teachers are sceptical of classroom tech.** It must work, it must respect their
  time, and it must reduce uncertainty rather than add data to review.
- **Cognitive offloading is the worry.** Teachers can't see what's happening behind
  the screens. A pupil pressing "Hint, Hint, Hint" until the AI just gives the
  answer is the failure mode.
- **Pattern over alert.** Teachers want to glance at a dashboard and see *who is
  struggling and what they need*, not be pinged into a queue of notifications.

The pedagogical contribution is the **Reason** interaction — a probing moment that
produces evidence of understanding without surfacing a verdict to the pupil.

---

## In one screen

<p align="center">
  <img src="docs/screenshots/10-class-detail.png" width="900" alt="Class detail page — live pupil grid">
</p>

The teacher dashboard above shows a **simulated class of six pupil agents** (each
driven by an LLM persona — productive struggler, wheel-spinner, flowing, off-task,
disengaged, safeguarding-disclosure) running against the live system. Read the cards:

- **Tom Reeves** — `wheel_spinning` — pressed three scaffolds and gave terse echoes.
- **Sophie Renton** — `productive_struggle` plus a **safeguarding flag at high severity**
  with the verbatim pupil excerpt. A teacher would see this in seconds.
- **Marcus Holt** — `flowing` — answered confidently and elaborated unprompted.
- **Bertie Lawson** — terse correct answers; after a recent classifier prompt
  tightening, this surfaces as disengaged rather than productive_struggle.
- **Priya Adesina** — partial answers, willing to keep trying.
- **Jacob Pritchard** — `off_task` — answered "did you see the match yesterday?"

Each card shows a real engagement-state sparkline over the last 20 minutes, the
pupil's last message excerpt, time since activity, and a click-to-drill action.
The header carries class-wide controls (pause / wrap-up / end class) and the
six-character join code teachers display on the board.

---

## The pupil flow

The pupil joins with a six-character class code — no email needed, anonymous Firebase
Auth. The teacher can also share a one-tap link (`/j/ABC-123`) which pre-fills the code
and asks only for a name; pupils who join from the same browser later are rejoined to
their existing session automatically:

<p align="center">
  <img src="docs/screenshots/03-join.png" width="380" alt="Pupil join screen with URL-prefilled class code">
</p>

Pupils land in a **lobby** — chat locked until the teacher hits *Start class*. This
prevents the classic chaos where half the class types away before the teacher is ready,
and gives a calm sightline at the start of the lesson:

<p align="center">
  <img src="docs/screenshots/13b-pupil-lobby.png" width="640" alt="Pupil lobby — chat locked until teacher starts the class">
</p>

The tutor opens with the lesson plan's first step. The pupil chats in **coach mode** —
the tutor asks rather than answers, replies in one or two sentences, never gives the
answer in one go:

<p align="center">
  <img src="docs/screenshots/15-pupil-conversation.png" width="720" alt="Pupil mid-conversation with the tutor">
</p>

Three scaffolding buttons sit under the input — **"I need a hint"**, **"Say that
differently"**, **"Use simpler words"**. Each is a *measured budget* with a per-concept
counter — when they run out, the tutor pauses to check what's been understood. This
prevents the failure mode the brief calls out: pupils mashing Hint to extract the
answer.

<p align="center">
  <img src="docs/screenshots/16-pupil-conversation-deep.png" width="720" alt="Deeper conversation with the tutor">
</p>

After three scaffold uses on the same concept, **Reason** fires inline. A gold card
asks for a paraphrase, novel example, counterfactual, or teach-back:

<p align="center">
  <img src="docs/screenshots/18-pupil-after-reason.png" width="720" alt="Reason interaction inline in the pupil's chat">
</p>

The response goes to the evaluator (a real LLM call against a structured-output schema). It returns one
of three branches — accept and move on, soft-challenge with a follow-up targeting the
weakest segment, or quietly log a pattern flag for the teacher dashboard. **The pupil
never sees a confidence score** — the framing stays generative ("can you say more?"),
never evaluative.

When the teacher ends the class, the pupil sees a closing screen. The AI reads the full
conversation + engagement trajectory and writes a short close — what the pupil
showed, where they stretched, one thing for next time. Cites their actual phrasing.
No XP, no points, no leaderboards:

<p align="center">
  <img src="docs/screenshots/19-pupil-closing.png" width="640" alt="Pupil end-of-class closing screen">
</p>

---

## The teacher flow

### Sign in

A Bridewell admin allowlists teacher emails before any registration. The first teacher
to register is bootstrapped as admin; subsequent teachers must be allowlisted by an
existing admin — a pupil cannot upgrade themselves to a teacher account.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/02-login.png" alt="Sign-in tab"></td>
<td width="50%"><img src="docs/screenshots/02b-register.png" alt="Register tab"></td>
</tr>
</table>

### Set up a lesson — by describing it

The teacher does not write a system prompt. They pick a topic from the UK KS3
syllabus library — or a plan their colleague has saved to the school's shared
library — then write a sentence about what they want pupils to come away with:

<table>
<tr>
<td width="50%"><img src="docs/screenshots/06-wizard-pick.png" alt="Wizard step 1 — pick a topic"></td>
<td width="50%"><img src="docs/screenshots/07-wizard-describe.png" alt="Wizard step 2 — describe the lesson"></td>
</tr>
</table>

A reasoning-tier LLM call drafts a structured lesson plan with 2–5 steps, each running a
different **activity** drawn from a catalogue of nine (Socratic, retrieval quiz,
prediction, sort-or-match, worked example with gaps, role-play, teach-back, exam-style
practice, creative application). A real classroom lesson is not 45 minutes of pure
Socratic dialogue, so the planner is instructed to vary the activities. The teacher
reviews each section — every field is editable. Until they approve, nothing reaches
the pupil:

<p align="center">
  <img src="docs/screenshots/08-wizard-review.png" width="780" alt="Wizard step 3 — review the AI-drafted lesson plan">
</p>

On approval the class is created with the plan attached. The big bold join code is
ready for the projector:

<p align="center">
  <img src="docs/screenshots/09-wizard-done.png" width="540" alt="Wizard step 4 — class created, join code shown">
</p>

### Watch the class

The plan view is the dashboard's centre of gravity — each step shows the count of
pupils currently inside it, with a state-coloured dot per pupil. The extension brief
(above-syllabus stretch) sits below the main sequence for pupils who finish early:

<p align="center">
  <img src="docs/screenshots/11-class-detail-plan.png" width="900" alt="Class detail — plan view with per-step pupil tokens and extension brief">
</p>

Per-pupil cards live underneath, with sparklines, last-message excerpt, and state
pill. Class-wide controls in the header: **Start class** (until the teacher hits this,
the pupils sit in the lobby), **Pause**, **Wrap-up**, **End class**, **Whiteboard**
(opens the projector view in a new window), and **Copy join link**. When the teacher
pauses, a full overlay lands on the pupil's chat — they're prompted to look up, not to
keep typing into a frozen conversation:

<p align="center">
  <img src="docs/screenshots/16a-pupil-paused.png" width="640" alt="Pupil paused overlay">
  <img src="docs/screenshots/18b-pupil-wrap-up.png" width="640" alt="Pupil wrap-up overlay">
</p>

When a pupil has a safeguarding flag, it shows as a crimson chip on the card itself
and a banner in the drill panel — the teacher sees it the moment they look at the
dashboard:

<p align="center">
  <img src="docs/screenshots/12-drill-safeguarding.png" width="380" alt="Safeguarding flag on a pupil drill panel">
</p>

### Intervene

Click any card → drill panel opens to the right with the full trajectory, the AI's
own rationale + cues, the recent conversation, and **five intervention actions**:

<p align="center">
  <img src="docs/screenshots/13-drill-intervention.png" width="380" alt="Composing a teacher hint inline in the drill panel">
</p>

- **Send a teacher hint** — types a sentence; lands in the pupil's chat as a distinct
  teacher-coloured message within seconds via RTDB
- **Switch to Expert for one turn** — with a written rationale the pupil sees; the
  next tutor reply runs in grounded Expert mode (search-backed citations) before
  dropping back to coach
- **Pair with a flowing pupil** — gentle banner asking the pupil to compare with a
  named peer
- **Pause this pupil** — input disables
- **Mark reviewed** — clears the safeguarding chip

Every intervention writes to an audit trail in Firestore. The server verifies the
pupil is in the teacher's own class before any write — a teacher token alone is not
sufficient.

### After the lesson

The teacher ends the class. A reasoning-tier LLM reads the engagement outcomes + Reason events
+ a sample of pupil conversations and writes an **appraisal of the plan** — what
worked, what to adjust, a 1–5 rating. One click saves the plan + appraisal to the
school's shared library:

<p align="center">
  <img src="docs/screenshots/20-appraisal.png" width="820" alt="Post-class AI appraisal of the lesson plan">
</p>

Future class-creation flows offer high-rated library plans as starting points, so the
system gets better with use.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Pupil session                                │
│  ┌────────────┐   /api/chat (coach + expert grounded)                 │
│  │ ChatSurface├─→ /api/conversation/append                            │
│  └─────┬──────┘   /api/engagement/run     ← classifier fires          │
│        │          /api/reason/fire                                    │
│        ↓          /api/reason/evaluate                                │
│   Firebase Auth (anonymous)   ← class join code                       │
└────────┬─────────────────────────────────────────────────────────────┘
         ↓ writes
┌──────────────────────────────────────────────────────────────────────┐
│  Firestore                          RTDB (live state)                │
│  ├ conversations/{classId_pupilId}  ├ liveSessions/{classId}         │
│  ├ engagementSnapshots              │   ├ status                     │
│  ├ reasonEvents                     │   │   active|paused|wrap_up|ended │
│  ├ safeguardingEvents               │   ├ pupils/{id}: state, traj…  │
│  ├ classes                          │   ├ interventions/{pupilId}    │
│  ├ lessonLibrary                                                     │
│  └ allowedTeacherEmails                                              │
└────────┬─────────────────────────────────────────────────────────────┘
         ↑ subscribes
┌──────────────────────────────────────────────────────────────────────┐
│                       Teacher dashboard                              │
│  /class/[id]   ←  RTDB onValue listener  →  re-renders in real time  │
│      ├ PupilCard with sparkline + last message + safeguarding chip   │
│      ├ LivePupilPanel: trajectory, conversation, interventions       │
│      └ Class-wide controls: pause / wrap-up / end / appraisal        │
└──────────────────────────────────────────────────────────────────────┘
```

### LLM provider

The architecture is deliberately provider-agnostic. Every model call goes through
a single typed entry point in `src/lib/ai/llm.ts`, with named keys for each job
(`tutor`, `scaffold`, `classifierFlash`, `classifier`, `reasonEvaluator`,
`profileUpdater`). The current build maps those keys to a fast tier (tutor +
scaffolding + first-pass classifier) and a reasoning tier (classifier
tiebreaker, Reason evaluator, lesson planner, consolidation, appraisal). A
production deployment would point each key at whichever managed and guardrailed
model the schools have a contract with — for Bridewell that is the existing
Bridewell AI / Unified Projects stack. Swapping providers is a single-file
change; prompts, structured-output schemas, fallbacks, and grounding behaviour
are portable across them.

### Brand

`BRAND.md` is the source of truth; `src/lib/brand/tokens.ts` is the code-level
expression. Navy + gold + cream, classical book serif for display, humanist sans
for chrome. The heraldic motifs throughout the app are generated by
`scripts/generate-images.mjs` against a tightly-constrained brand prompt and
post-processed with `sharp` to make their backgrounds transparent — they integrate
as design elements, not framed AI illustrations.

---

## The Reason architecture

The pedagogical contribution. Adding "hint / rephrase / simplify" buttons gives
pupils more help on offer; none of them produce a signal that the pupil has
understood what the AI produced. **Reason** is the answer.

Four layers, each a named module under `src/layers/`:

- **trigger.ts** — pure function. Reason fires when (a) the pupil hits the scaffold
  ceiling on a concept, (b) the AI's segmentation closes a topic, (c) the teacher
  asks, or (d) the lesson plan marked this concept as critical and the tutor just
  explained it.
- **prompts.ts** — four templates (paraphrase, novel example, counterfactual,
  teach-back) with a subject-weighted selector that avoids back-to-back repeats.
- **evaluator.ts** — reasoning-tier LLM + responseSchema. Returns confidence, branch
  (accept / soft_challenge / pattern_flag), rationale, weakest segment, and a
  drafted soft-challenge follow-up.
- **responder.ts** — pure function. Picks the next tutor turn based on the branch.
  Accept → brief positive acknowledgement + move on. Soft challenge → ask the
  follow-up the evaluator drafted. Pattern flag → silently log; surface as a
  pattern on the teacher dashboard, never an alert to the pupil.

The pupil never sees a confidence score. Framing is always generative ("can you say
more?"), never evaluative ("you don't understand this"). Reason produces evidence,
not a verdict.

---

## Safeguarding

Every classifier call returns a `safeguarding` block (severity + summary + verbatim
pupil excerpt). When severity is medium or high:

- A `safeguardingEvents` Firestore doc is created (audit trail).
- The pupil's RTDB live mirror gets the flag block; the dashboard renders it
  immediately as a crimson card chip and a banner in the drill panel.
- The pupil sees nothing different. The disclosure surfaces to the teacher, not
  to the AI's reply.

Example raised by a sim run:

> **Safeguarding · HIGH** — *The pupil discloses that their mother was drunk,
> leading to them having to provide overnight care for a younger sibling.*

Marking "reviewed" clears the chip but keeps the audit-trail event.

---

## Self-improving library

After a class ends, the teacher asks the AI to **appraise the lesson plan** against
the actual engagement outcomes — and saves the plan + appraisal to the school's
shared library. Future class-creation flows offer high-rated library plans as
starting points.

The appraisal reads:

- The full engagement trajectory across all pupils
- Reason events fired and their accept-rate
- Safeguarding events raised
- A sample of pupil-tutor exchanges across the class

Returns a structured `{ rating, summary, whatWorked[], whatToAdjust[], metrics }`.
The rating is shown as stars on library entries; teachers see what previous
colleagues did that worked.

---

## Agent simulation harness

`scripts/simulate-class.mjs` is a real QA tool. Spawns N pupil agents driven by
the same fast-tier LLM as the tutor, each with a persona system prompt
(productive struggler, wheel-spinner, flowing, disengaged, off-task,
safeguarding-disclosure), and runs them through a real lesson against the live
API. The teacher can sign in and inspect the resulting class as though it were
a real session.

Most recent sim, 6 personas × 6 turns:

| Persona | Intended state | Classifier returned |
|---|---|---|
| Tom Reeves (wheel-spinner) | wheel_spinning | **wheel_spinning 90%** ✓ |
| Priya Adesina (productive-struggler) | productive_struggle | **productive_struggle 90%** ✓ |
| Sophie Renton (safeguarding-disclosure) | + medium/high | **productive_struggle 80% · safeguarding HIGH** ✓ |
| Jacob Pritchard (off-task) | off_task | **off_task 95%** ✓ |
| Marcus Holt (flowing) | flowing | **flowing 95%** ✓ |
| Bertie Lawson (disengaged) | disengaged | Initially mis-classified — fixed via a classifier prompt revision that distinguishes terse-correct from substantively-engaged. ✓ |

The sim drives real LLM calls, persists conversations to Firestore, raises real
safeguarding events, and produces a JSON report under `reports/`. It's the
regression test that the README screenshots are captured against.

---

## Classroom display

The classroom-display mode is the front-of-room projector view. The teacher's
own dashboard stays on their device; the projector shows a **collective**
surface for the room — a Harry-Potter-style points jar that fills with gems as
the class works through the lesson, a breathing "class aura" reflecting the
overall engagement mix, and a calm moments ticker ("the class is finding
limiting factors tricky"). **No individual pupil names** are ever surfaced
here. Open it from the class detail header — *Whiteboard*:

<p align="center">
  <img src="docs/screenshots/21-classroom-display.png" width="900" alt="Classroom display mode for the projector">
</p>

---

## Tech stack

- **Next.js 16** App Router · **React 19** · **TypeScript strict** · **Tailwind 4**
- **Firebase** — Firestore (persistent), Realtime Database (live state), Auth
  (teacher email/password with allowlist; pupil anonymous), Admin SDK for
  privileged writes
- **LLM provider** — abstracted behind `src/lib/ai/llm.ts`. A fast tier runs the
  tutor, scaffolding generators, and the first-pass classifier; a reasoning tier
  runs the classifier tiebreaker, Reason evaluator, lesson planner, appraiser, and
  consolidator (with `responseSchema` for structured JSON, and search grounding
  for Expert mode). Heraldic brand artwork is generated through the same
  abstraction
- **Lucide** icons · **next/font** for Source Serif 4 + Inter + JetBrains Mono ·
  brand tokens in `src/lib/brand/`
- **Playwright** for the screenshot capture pipeline · **sharp** for image
  post-processing

---

## Local dev

```bash
# Install
npm install

# Required env (.env.local — see .env.example for the full set)
GEMINI_API_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-admin.json

# One-time setup against your Firebase project
firebase deploy --only firestore:rules,database,firestore:indexes
node scripts/enable-auth-providers.mjs   # enable Email/Password + Anonymous

# Run
npm run dev
# http://localhost:3000

# Populate a class via the agent sim (good for screenshots + dashboard testing)
node scripts/simulate-class.mjs --personas 6 --turns 6 --keep

# Refresh brand illustrations (one-off)
node scripts/generate-images.mjs

# Capture README screenshots against a populated class
SIM_EMAIL=... SIM_PASSWORD=... SIM_CLASS_ID=... SIM_JOIN_CODE=... \
  node scripts/capture-screenshots.mjs
SIM_EMAIL=... SIM_PASSWORD=... SIM_CLASS_ID=... SIM_JOIN_CODE=... \
  node scripts/capture-end-states.mjs  # for the closing + appraisal + classroom display
```

---

## Deploy

The app is a Next.js project with server-side API routes. We deploy via
**Firebase Hosting** with the web-frameworks integration, which packages
the Next.js app onto Cloud Functions (2nd gen) automatically. The Firebase
project must be on the Blaze plan with the Cloud Functions, Cloud Build,
Artifact Registry, Cloud Run, Eventarc, and Pub/Sub APIs enabled (the
Firebase CLI prompts to enable these on first deploy).

```bash
# One-time, on a fresh machine
firebase login
firebase use bridewell-classroom
firebase experiments:enable webframeworks

# Push the current branch
firebase deploy --only hosting

# Or include rules + indexes
firebase deploy --only hosting,firestore:rules,firestore:indexes,database
```

The first deploy can take ~5 minutes (image build + function create + CDN
release). Subsequent deploys are ~2 minutes.

Before opening the URL publicly:

- Confirm the Firestore + RTDB security rules are deployed
  (`firebase deploy --only firestore:rules,database`).
- Confirm the teacher email allowlist (`allowedTeacherEmails` collection in
  Firestore) so registration is gated.
- Consider rotating the LLM API key after the demo period — public demos are
  rate-limit targets.

---

## Repo layout

```
src/
  app/
    page.tsx                — landing
    (auth)/                 — login + register, pupil join
    (student)/session/      — pupil chat surface, closing screen
    (teacher)/dashboard/    — teacher home
    (teacher)/class/[id]/   — focused class view
    (display)/classroom/    — second-screen projector view
    api/
      chat                  — coach / expert / scaffold paths
      auth/teacher          — register: claim + allowlist + doc write
      classes/create        — admin SDK creates class + joinCode
      classes/join          — pupil joins; cleans old RTDB on switch
      classes/[id]          — class read (own only)
      pupils/me             — pupil session reads its class
      engagement/classify   — classify a transcript (synchronous)
      engagement/run        — full live classifier loop (snapshot + RTDB)
      reason/fire           — open a Reason event
      reason/evaluate       — close one with the evaluator + RTDB trajectory
      conversation/append   — pupil + tutor turn persistence
      interventions         — teacher actions: hint, mode, pair, pause, wrap, end
      session/consolidate   — class-end pupil consolidation (Pro)
      lessons/generate      — AI-led lesson plan
      lessons/appraise      — post-class appraisal of the plan
      lessons/save-to-library
      lessons/library       — list library entries
      admin/allowlist       — allowlist admin (admin teachers only)
  components/
    shared/                 — Crest, Wordmark, Fleur, TopBar, ThemeToggle, StatePill
    student/                — ChatSurface, ClosingScreen
    teacher/                — ClassesPanel, PupilCard, LivePupilPanel,
                              NewClassWizard, AppraisalPanel, StateDistribution
  layers/
    trigger.ts              — Reason trigger logic
    prompts.ts              — Reason prompt library + selector
    evaluator.ts            — Reason evaluator (responseSchema)
    responder.ts            — branching logic
    classifier.ts           — engagement classifier with Flash → Pro tiebreaker
  lib/
    ai/
      llm.ts                — typed LLM client (grounding, structured JSON)
      models.ts             — provider-agnostic model-key map
      prompts.ts            — system-prompt builder for the tutor
      activities.ts         — activity catalogue + per-activity tutor instructions
      lessonPlanner.ts      — generate a structured plan from syllabus + intent
      appraiser.ts          — post-class plan appraisal
    brand/                  — design tokens (colour, type, state palette, Reason surface)
    firebase/               — client + admin SDK + auth context + live RTDB helpers
    syllabi/                — UK KS3 syllabus library (Biology, English, Maths, History)
    joinCode.ts             — 6-char human-friendly codes
  types/                    — domain types (one file)
scripts/
  simulate-class.mjs            — agent simulation harness (the QA tool)
  generate-images.mjs           — LLM-driven heraldic brand illustration generator
  capture-screenshots.mjs       — main Playwright capture for the README
  capture-end-states.mjs        — capture closing, appraisal, classroom display
  enable-auth-providers.mjs     — one-time Firebase Identity setup
  smoke-test-*.mjs              — assorted integration tests
```

---

## Status

**21 May 2026.** Live build, against a real Firebase project, against real LLM
calls. The agent simulation runs end-to-end. The flows in this README are
exercised by the screenshot pipeline, so this README is also a regression suite.

What landed during the build week:

- AI-led lesson setup, end-to-end (wizard + reasoning-tier plan generator + teacher
  review/edit/approve)
- Step progression — classifier confidence > 0.7 sustained over consecutive
  snapshots advances the pupil through the plan; surfaced on the pupil's chat
  header and on the teacher card as a gold progress strip; the timeline panel
  shows the whole class at once
- Flash → Pro tiebreaker on the classifier — the cheap first pass runs Flash;
  Pro escalates only when Flash is uncertain (<0.55) or flags safeguarding
- Optimistic dashboard signals — pupil-side bumps mean cards visibly move
  between classifier snapshots
- Activity types — nine of them — woven through the lesson plan so a 45-minute
  lesson isn't pure Socratic questioning
- Live engagement classifier with structured JSON output (+ safeguarding signal
  raised in the same call)
- Reason auto-firing inline on the scaffold ceiling, with the gold-accent card,
  real evaluator, real soft-challenge follow-ups, persisted reason events,
  trajectory on the dashboard
- Intervention loop end-to-end: hints, mode override for one turn, pair-up,
  pause, mark reviewed — all writing to RTDB and audited to Firestore, with
  per-pupil class-membership verification on every action
- Class-wide controls (pause / wrap-up / end) and pupil-facing closing screen
- Self-improving lesson library: post-class AI appraisal + save-to-library +
  use as starting point in the wizard
- Teacher email allowlist with bootstrap-as-admin
- Pupil class switching with proper RTDB cleanup
- Conversation persistence + drill-panel transcript replay
- A multi-agent QA pass surfaced 50+ findings across UX, UI, pedagogy, bugs, and
  feature opportunities (`reports/audit/*.md`); critical fixes for auth,
  classifier fallback, optimistic-rollback, and Reason eventId persistence have
  been merged
- README screenshots regenerated by Playwright against the live system

---

## Credits + licences

- UK National Curriculum syllabus extracts:
  [DfE programmes of study](https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study).
- Bridewell crest: Bridewell Royal Hospital arms (1553), reproduced from the
  prior Bridewell prototype.
- Heraldic motifs (`public/img/motif-*.png`) and the Bridewell Scholar mascot
  (`public/img/scholar-*.png`): generated through the project's image-generation
  abstraction against a tightly-constrained brand prompt with explicit hex
  codes, post-processed with `sharp` to chroma-key the cream background to
  transparent.
