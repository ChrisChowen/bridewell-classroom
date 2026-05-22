# Safeguarding Routing Policy — DRAFT 🔒

> **This is a DRAFT for human sign-off. It is NOT an agreed policy.** It must
> be reviewed and approved by each school's Designated Safeguarding Lead (DSL)
> and aligned with the school's existing Child Protection Policy and KCSIE
> (Keeping Children Safe in Education) before any pilot with real pupils.
> Nothing here is "done" — it captures what the software does today and the
> institutional decisions a human must make.

## What the software detects (engineering, built)

- Every engagement-classifier call returns a `safeguarding` signal:
  `severity ∈ {none, low, medium, high}` + a one-line summary + the shortest
  verbatim pupil excerpt that triggered it.
- The pupil's experience never changes — the disclosure surfaces to staff, not
  back into the AI's reply (guardrail 3).
- On `medium`/`high`, a permanent `safeguardingEvents` record is written
  (`pupilId`, `classId`, `severity`, `summary`, `pupilExcerpt`, `timestamp`,
  `reviewed`). It is server-only and never readable by any pupil.
- The class teacher sees a crimson flag on the live dashboard for that pupil.
- When a teacher marks the pupil reviewed, the open events are stamped with
  `reviewedBy`, `reviewedAt`, and a `reviewNote` — an accountable audit trail
  of who handled each disclosure and when.

## What the software does NOT decide (institutional — for sign-off)

These are policy choices for the school, not the software:

1. **Who is the DSL / deputy DSL for each school**, and how the system should
   identify them (a `role: "dsl"` claim? a per-school config?). Today, medium/
   high flags surface to the **class teacher** only. Routing to a named DSL is
   **not built** pending this decision.
2. **Escalation path + timescales.** KCSIE expects concerns to reach the DSL
   without delay. Decide: does a `high` flag notify the DSL immediately (and
   how — in-product, email, existing system)? What is the maximum time a flag
   may sit unreviewed before re-escalation?
3. **Integration with the school's existing safeguarding system** (e.g. CPOMS /
   MyConcern). The AI flag should very likely be a *prompt to record in the
   school's system of record*, not a replacement for it. Decide the handoff.
4. **False-positive tolerance + the human-judgement gate.** The classifier is
   tuned to over-flag rather than miss. A human must always make the
   safeguarding decision; the AI only surfaces. Confirm this is acceptable and
   that staff are trained accordingly.
5. **Retention of safeguarding records.** Child-protection records typically
   have specific, often long, statutory retention requirements that differ from
   ordinary session data. Decide retention + who can access historic events.
6. **Data Protection Impact Assessment.** Processing children's potential
   safeguarding disclosures via an AI classifier requires a DPIA (see
   `DPIA-draft.md` once drafted) and likely consultation with the DPO.

## Recommended engineering follow-ups (once the above is decided)

- A `dsl` role + a DSL view that aggregates open safeguarding events across the
  DSL's school (scoped like the teacher dashboard).
- Immediate notification for `high` severity to the DSL via the agreed channel.
- A "record in [school system]" affordance on each event.
- Re-escalation if an event is unreviewed beyond the agreed window.

_Status tracked in `PILOT_READINESS.md`. Authoritative goal: `docs/NORTH_STAR.md`._
