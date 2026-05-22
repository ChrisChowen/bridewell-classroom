# Pilot Runbook — DRAFT

> Operational checklist for running the first supervised pilot with one Year 8
> class. Pre-conditions marked 🔒 are human sign-offs that must be complete
> first (tracked in `PILOT_READINESS.md`).

## Before the pilot (gates)
- 🔒 DPIA signed off (`DPIA-draft.md`).
- 🔒 DPA executed with the operator + sub-processors (`DPA-draft.md`).
- 🔒 Safeguarding routing agreed with the DSL (`safeguarding-routing-policy.md`)
  — including who is notified for `high` flags and how to record in the
  school's system (e.g. CPOMS).
- 🔒 Retention window set + scheduled purge enabled in dry-run first
  (`data-retention-policy.md`).
- 🔒 Privacy notice distributed; consent/objection handled
  (`consent-and-privacy-copy-draft.md`).
- ✅ LLM provider + key configured (`LLM_PROVIDER`, key); confirm budget/limits.
- ✅ Teacher accounts on the allowlist; teachers can register + sign in.

## Setup (teacher, ~15 min)
1. Sign in → **New class** → pick a topic → write the intent (or use a
   suggested starting point) → review the AI-drafted plan → approve.
2. Note the six-character join code.
3. Open the **Whiteboard** view from the dashboard (it inherits your session)
   for the classroom screen.

## Running a lesson
1. Pupils open `/j/<CODE>` (or type the code at `/join`) + their first name.
2. They sit in the lobby until you press **Start class**.
3. Watch the dashboard: per-pupil engagement + Reason confidence. Patterns,
   not alerts.
4. Intervene as needed (hint / mode switch / pair-up / pause).
5. A **crimson safeguarding flag** means follow the agreed DSL routing — handle
   as you would any disclosure; mark reviewed once actioned (this records who
   reviewed it + when).
6. Wrap-up → End class.

## Data-subject requests during/after the pilot
- **Access:** `GET /api/pupils/{pupilId}/export` (teacher, own class) → JSON.
- **Erasure:** `POST /api/pupils/{pupilId}/delete` with `{confirmPupilId}`
  (teacher, own class). Irreversible.
  _(Teacher-facing buttons for these are a pending UI follow-up; until then an
  admin runs the call.)_

## If something goes wrong
- LLM down: the tutor degrades to a labelled fallback; the dashboard marks the
  pupil's read as "not a real signal." The lesson continues.
- A pupil can't join: confirm the code + that you pressed Start class.
- Suspected data issue: stop the session, contact the operator + DPO.

## After the pilot
- Review engagement + Reason evidence (see `docs/reason-evidence.md` once the
  validation harness has run).
- Confirm retention purge ran as expected.
- Capture teacher + pupil feedback for the next iteration.

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
