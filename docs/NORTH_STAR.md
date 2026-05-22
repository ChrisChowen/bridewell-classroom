# Bridewell Classroom — North-Star Goal

## Context

Bridewell Classroom is today a credible Phase 2–3 research prototype: real LLM
calls, a novel engagement-classifier + Reason architecture, exceptional brand
execution, and a teacher/pupil flow now verified working end-to-end on the live
Firebase deploy. It is **not** yet something a school can run with real pupils,
nor something Unified Projects can drop into their production Bridewell AI
without rebuilding parts of it.

This goal orients long-running autonomous work toward closing that gap. Chris's
direction (chosen explicitly):

- **Dominant axis:** a *deployed product* whose deeper purpose is a **clean
  handover** — "something fully ready to be plug-and-played into Unified
  Projects' infrastructure."
- **Autonomy boundary:** *engineering-complete*. Build everything to
  pilot-ready; draft the institutional/legal/safeguarding artifacts as
  proposals + checklists for Chris to action. **Never claim institutional work
  is done.**
- **Innovation bar:** *both* — rigorously validate the Reason claim AND extend
  capability (adaptive difficulty, longitudinal profiles, voice, SEND).
- **Quality bar:** *school-pilot-ready* — GDPR-defensible, tested,
  safeguarding-sound, resilient. One-school supervised pilot, not yet
  multi-school scale.

---

## THE GOAL (north star)

> Make Bridewell Classroom a **school-pilot-ready, handover-clean** AI tutoring
> product that **Unified Projects can plug into their existing Bridewell AI
> infrastructure** with documented, swappable seams — in which **Reason is
> empirically validated** as a genuine contribution (it distinguishes
> productive struggle from wheel-spinning on real evidence), the tool's
> capability is extended (adaptive difficulty, longitudinal mastery, British
> voice, SEND adaptation), and **every institutional gate (GDPR, safeguarding,
> consent, DPA) is drafted and teed up for human sign-off** — without ever
> faking inference, breaking the teacher-in-the-loop principle, or violating the
> Bridewell brand.

It is achieved when a Unified Projects engineer can read one handover document,
repoint the model + auth + data seams to their own infrastructure in under a
day, and a Bridewell DSL + IT lead can run a supervised pilot with one real Y8
class behind a green readiness checklist.

---

## What success looks like (tough, measurable criteria)

Success is **not** "looks good in a demo." Every criterion below must be
demonstrably true, with evidence committed to the repo.

### A. Handover-clean / plug-and-play (the headline)

- **One provider-agnostic model seam.** Every LLM call routes through
  `src/lib/ai/llm.ts` with named keys (`tutor`, `scaffold`, `classifier`,
  `reasonEvaluator`, …). Unified can repoint any key to a different
  managed model by config alone — **zero changes** in `src/layers/` or routes.
  Proven by a swap test (point a key at a stub/alternate and the app still runs).
- **One auth seam + one data seam.** Firebase Auth, Firestore, and RTDB sit
  behind documented interfaces so federation (Entra/SAML/OIDC) and an alternate
  datastore can be substituted. No raw `getFirestore()` / `getAuth()` scattered
  through feature code beyond the seam modules.
- **`HANDOVER.md`** — an integration contract an engineer can scope against:
  what Unified inherits, what they must provide (model endpoints, identity,
  data residency), every external dependency and its interface, and the exact
  files that constitute each seam. Target: a competent engineer integrates in
  **< 1 day**.
- **No prototype shortcuts leak across a seam.** In-memory rate limiter,
  hardcoded keys, demo fixtures, and `scripts/_*.mjs` throwaways are removed or
  clearly quarantined behind documented boundaries.

### B. School-pilot-ready production quality

- **GDPR-defensible.** Data retention + automatic purge after a configurable
  window; on-demand subject-access export (pseudonymised P001… scheme);
  full-pupil-record deletion; **no PII in any log line**. A `DPIA-draft.md`
  exists (marked "requires human sign-off").
- **Safeguarding, end-to-end.** Medium/high disclosures create an audit-trail
  doc, route to a named DSL role, and carry an intervention history; the pupil's
  experience never changes. There is an automated test that a seeded disclosure
  surfaces to the teacher and is logged. A `safeguarding-routing-policy.md`
  draft exists for sign-off.
- **Auth hardened.** Firestore/RTDB rules scoped so a teacher reads only their
  own classes/pupils; join-code enumeration is rate-limited; the rate limiter is
  durable (Firestore/RTDB-backed, survives cold starts) — the in-memory caveat
  in `src/lib/rate-limit.ts` is gone.
- **Tested.** Automated Playwright e2e covering demo scenarios A/B/C; unit
  coverage on the four Reason layers + the classifier (`src/layers/`); a CI
  workflow (`.github/workflows/`) that runs type-check + tests + build on every
  push and blocks merge on failure. The "no automated tests" gap is closed.
- **Resilient + observable.** Graceful degradation tested (LLM down → rule-based
  fallback, surfaced honestly to the teacher); error boundaries on every route;
  structured logging + error reporting; per-class/teacher cost tracking.
- **Multi-teacher within a school.** Roster import, co-teacher / substitute
  access, an admin surface for class + user management. (Multi-*school* scale is
  explicitly out of this goal's bar.)
- **Pinned + reproducible.** Next.js stays on 15.x (Next 16 + Turbopack breaks
  firebase-admin in the deployed function — documented in CLAUDE.md). Clean
  `npm ci` + build + deploy, documented.

### C. Reason validated (research-grade evidence)

- **Instrumented + reproducible eval.** Extend `scripts/pedagogy-judge.mjs` into
  a harness that scores tutor turns AND Reason branching against
  **human-labelled ground truth**, not just LLM self-judgement.
- **A stated, met claim.** e.g. "The classifier + Reason distinguish
  `productive_struggle` from `wheel_spinning` at ≥ X precision / ≥ Y recall on N
  labelled transcripts." Numbers committed, reproducible.
- **Calibrated confidence.** The Reason evaluator's confidence has a genuine
  middle band (the bimodal-clustering risk flagged in audit is measured and
  addressed); the four prompt types each have a fit-for-purpose rubric.
- **`docs/reason-evidence.md`** — a short research-contribution note the
  academic panel (Dalton/Woods/Fu) and Chris's PhD can stand behind, framed
  honestly (system-triggered metacognitive probing + a measured signal, not
  overclaimed).

### D. Capability extended (the "both" answer)

- **Adaptive per-pupil difficulty.** `challengeLevel` drifts on evidence
  (Reason confidence, scaffold reliance) over 1–2 sessions, gently; visible to
  the teacher, never labelled to the pupil; teacher can override.
- **Longitudinal learner profile.** `/api/session/consolidate` (currently
  stubbed) actually rewrites `LearnerProfile` per pupil across sessions; the
  drill-down shows an across-sessions trajectory.
- **British voice I/O.** Web Speech in, ElevenLabs out, **British English only**
  (American is unacceptable — see memory), opt-in, recordings never stored.
- **SEND adaptation.** Accessibility menu (font size, OpenDyslexic, reduced
  motion, voice) wired; SEND profile feeds prompt construction via the existing
  `pupilProfile` seam in `buildTutorSystemPrompt`.
- **Cross-subject robustness.** The tutor + Reason proven on Maths, English
  close-reading, and History interpretation — not just Biology — via the eval
  harness.

### E. Honest engineering-complete boundary

- **`PILOT_READINESS.md`** — a single checklist with green/amber/red on every
  gate (engineering, GDPR, safeguarding, consent, DPA, institutional buy-in).
  Anything that needs a human is **amber/red with the human action named** —
  never silently green.
- Institutional artifacts (DPA, DPIA, safeguarding routing, parent/pupil consent
  copy, pilot runbook) exist as **clearly-labelled drafts for Chris's approval**.

---

## Guardrails (non-negotiable — autonomous work must never violate these)

1. **No fakes.** Every surface implying inference calls a real LLM. No string
   lookups dressed as AI. The compression gap is the named failure mode.
2. **Teacher-in-the-loop.** The AI never makes an instructional move without
   teacher context. Surface **patterns, not alerts**. Never add to teacher
   review workload — teacher-time is the binding constraint.
3. **Safeguarding surfaces to the teacher, never to the pupil.** Disclosures
   never change the AI's reply or the pupil's experience.
4. **Brand hierarchy.** Bridewell is the product; the school is configuration.
   Calm classical register (navy/gold/crest/book-serif). **Never** a game
   (no XP/levels/badges), never heritage pastiche, never generic SaaS.
   `BRAND.md` is authoritative.
5. **Never claim institutional work is done.** Legal, safeguarding sign-off,
   consent, real-pupil data, DPAs — drafted and teed up, never marked complete.
6. **Never break `main` or the live deploy.** Keep the demo runnable at every
   step. Land reviewable, well-described commits — do not batch huge opaque
   changes. Type-check + tests must pass before each deploy.
7. **Respect the data of minors at all times.** Default to the
   most-privacy-preserving option; if a step would put real children's data at
   risk without a human gate, stop and flag it.

---

## Major work streams (where to drive, grounded in the gap audit)

1. **Seam-ification & handover** — extract model/auth/data seams; write
   `HANDOVER.md`; prove the model-swap test.
2. **Compliance & safeguarding hardening** — retention/deletion, export,
   scoped rules, durable rate limiting, safeguarding routing + audit trail,
   institutional drafts.
3. **Test + CI foundation** — Playwright A/B/C, unit tests on layers, GitHub
   Actions gating.
4. **Reason validation** — labelled-ground-truth eval harness, calibration,
   `reason-evidence.md`.
5. **Capability** — adaptive difficulty, longitudinal consolidation, British
   voice, SEND, cross-subject proof.
6. **Admin + multi-teacher** — roster import, co-teacher access, admin surface.
7. **Readiness ledger** — keep `PILOT_READINESS.md` honest and current as the
   single source of truth for "are we there yet."

Sequencing intuition: **3 (tests/CI) first** so everything after is safe to
change autonomously; then **1 (seams)** and **2 (compliance)** in parallel as
the production backbone; then **4 (validation)** and **5 (capability)**; **6
(admin)** last. The readiness ledger (7) is updated continuously.

---

## Verification — how to know the goal is achieved

- `PILOT_READINESS.md` shows **green on every engineering gate**, with all
  human-gated items clearly amber/red and named.
- CI is green: type-check + unit + Playwright A/B/C all pass on `main`.
- The **model-swap test** passes (repoint a model key, app still runs) —
  proving the handover seam.
- `docs/reason-evidence.md` states a met, reproducible accuracy claim with
  numbers.
- A clean deploy where a fresh teacher can register → build a lesson →
  run a class, and a pupil (separate device/profile) can join → chat → hit
  Reason → and the teacher dashboard reflects engagement state live — all
  verified via the Claude-in-Chrome walkthrough, end to end, no operator
  workarounds.
- `HANDOVER.md` exists and a dry-run "could Unified integrate this in a day?"
  read-through holds up.
