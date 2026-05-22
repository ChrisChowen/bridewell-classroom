# Data Retention Policy — DRAFT 🔒

> **DRAFT for human sign-off.** Retention periods are an institutional/legal
> decision for the school's DPO, aligned with the school's records-retention
> schedule and statutory safeguarding requirements. The engineering to enforce
> whatever is decided is partly built (on-demand erasure) and partly pending
> (scheduled auto-purge).

## Proposed retention categories

| Data | Proposed default | Rationale | DECISION |
|---|---|---|---|
| Pupil chat messages (`conversations`) | Purge **N days** after the session ends (suggest 30) | Ephemeral teaching artefact; minimise children's free-text | set N |
| Engagement snapshots / Reason events | Keep as **anonymised aggregates** after N days; purge per-pupil rows | Supports the teacher's longitudinal view + research without retaining identifiable rows indefinitely | set N + confirm aggregation |
| Learner profile (`learnerProfiles`) | Retain for the pupil's time at the school; delete on leaving | Cross-session adaptation needs it; tied to enrolment | confirm |
| Safeguarding events | **Do NOT auto-purge.** Follow the school's child-protection retention schedule (often years) | Statutory; child-protection records outlive ordinary data | confirm schedule + access |
| Teacher accounts | Retain while employed; delete on leaving | — | confirm |

## Enforcement — what's built vs pending

- **On-demand erasure (built, tested 🟢):** `deletePupilData`
  (`src/lib/pupil-data.ts`) + `POST /api/pupils/{id}/delete` remove ALL of a
  pupil's data across Firestore + RTDB. Emulator-proven total + isolated.
- **Subject-access export (built, tested 🟢):** `gatherPupilData` +
  `GET /api/pupils/{id}/export`.
- **Scheduled auto-purge (PENDING 🔴):** a scheduled Cloud Function would run
  daily, purge `conversations` messages older than N days for ended sessions,
  and aggregate-then-purge old per-pupil analytics rows. **Must NOT touch
  safeguardingEvents.** It should run in **dry-run/report mode first** (log
  counts, delete nothing) until the schedule is signed off — deleting
  children's data on a timer is high-stakes and must be reviewed before
  activation.

## Implementation notes for the scheduled purge (when approved)

- Reuse the per-collection deletion patterns in `src/lib/pupil-data.ts`.
- Drive the window from a single config value so the DPO-approved N is the only
  knob.
- Exclude `safeguardingEvents` and `learnerProfiles` from time-based purge.
- Emit a purge-run audit record (counts only, no PII) for accountability.
- Add an emulator test mirroring `pupil-data.emulator.test.ts` proving the
  purge removes only over-age, non-exempt data.

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
