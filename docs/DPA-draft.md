# Data Processing Agreement — DRAFT 🔒

> **DRAFT for legal review — NOT an executed agreement.** A DPA between the
> school (controller) and the operator of Bridewell Classroom (processor), and
> back-to-back terms with each sub-processor, must be drawn up and signed by
> legal counsel before any pilot with real pupils. This draft lists the
> schedule items the parties must complete; it is not legal advice.

## Parties (to complete)
- **Controller:** the school(s) — King Edward's Witley / Barrow Hills /
  Longacre. _DECISION: one DPA per school or a multi-school agreement._
- **Processor:** the operator of Bridewell Classroom (Unified Projects on
  handover, or the named operating entity for the pilot).
- **Sub-processors:** Google (Firebase Auth, Firestore, Realtime Database,
  Cloud Functions/Run hosting — `europe-west1`) and the LLM provider
  (currently Google Gemini; swappable per `HANDOVER.md`).

## Schedule of processing (mostly determinable from the build)
- **Subject matter / duration:** AI tutoring during lessons, for the pilot
  term. _DECISION: dates._
- **Nature & purpose:** deliver an in-lesson AI tutor; classify engagement;
  surface safeguarding concerns to staff; give teachers a live dashboard.
- **Types of personal data:** pupil first name + anonymous UID; pupil chat
  free-text; derived engagement/Reason classifications; safeguarding flags
  (severity + summary + verbatim excerpt); teacher account details. _Possible
  incidental special-category data in free text._
- **Categories of data subject:** pupils (children, 11–13); teachers.

## Processor obligations (map to the build — for verification)
- Process only on documented instructions of the controller.
- Confidentiality of personnel.
- Security measures (Art. 32): access scoped by Firestore + RTDB rules
  (teacher-owns / pupil-own); no PII in server logs; durable rate limiting;
  data in transit over TLS. _See `PILOT_READINESS.md` for verified status._
- Sub-processor flow-down + the controller's right to object.
- Assist with data-subject rights: **subject access** + **erasure** are built
  + tested (`/api/pupils/{id}/export`, `/api/pupils/{id}/delete`).
- Assist with breach notification, DPIAs (`DPIA-draft.md`), and audits.
- Return/delete data at the end of processing (erasure engine exists; see
  `data-retention-policy.md`).

## Decisions for legal counsel
1. Controller/processor scope + signatories.
2. Sub-processor list approval + the LLM provider's training-exclusion +
   retention + region terms (or select an approved provider via the seam).
3. International-transfer mechanism if any processing leaves the UK/EEA.
4. Liability, term, termination, audit rights.

## Signatures (to be completed by humans)
- For the controller (school): __________________  date: ______
- For the processor: __________________  date: ______

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
