# Data Protection Impact Assessment — DRAFT 🔒

> **DRAFT for human sign-off — NOT an approved DPIA.** Processing children's
> personal data through an AI tutor + engagement classifier + safeguarding
> detector is high-risk processing under UK GDPR and almost certainly requires
> a completed DPIA and DPO consultation before any pilot with real pupils.
> This draft is prepared by the engineering team to give the schools' DPO and
> DSL a concrete starting point. Every "DECISION:" line is a human call.

## 1. The processing

**What the system does.** Pupils (ages 11–13) chat with an AI tutor in a
lesson. Each turn is sent to an LLM. Every few turns an engagement classifier
labels the pupil's state (flowing / productive struggle / wheel-spinning /
disengaged / off-task) and screens for safeguarding disclosures. Teachers see a
live dashboard of patterns and can intervene. Lesson plans are AI-drafted and
teacher-approved.

**Personal data processed**
- Pupil display name (first name + optional initial) and an anonymous auth UID.
- Pupil chat messages (free text the child writes — may contain anything).
- Derived engagement classifications + confidence + rationale.
- Reason-interaction responses + confidence.
- Safeguarding flags: severity, a one-line summary, and the verbatim pupil
  excerpt that triggered the flag.
- Teacher account: name, email, school, role.

**Special category / sensitive data.** Chat is free text, so it *may*
incidentally contain special-category data (health, religion, etc.) and
safeguarding disclosures (which are highly sensitive). The system does not
*seek* special-category data but cannot prevent a child typing it.

**Children's data.** All pupils are children. This raises the bar: clearer
information, stronger minimisation, and the child's best interests as a primary
consideration (ICO Age Appropriate Design Code).

## 2. Necessity & proportionality

- **DECISION (lawful basis):** likely **public task** (education) for the core
  tutoring, with the school as controller. The DPO must confirm the basis and
  whether any processing relies on consent.
- **Data minimisation (built):** only a first name is collected; voice (if
  enabled) is never stored; server logs carry no pupil content
  (`PILOT_READINESS.md` → "No PII in logs"); analytics collections are
  server-only and unreadable by any client.
- **Third-country / sub-processor:** the LLM provider (currently Google Gemini)
  and Firebase (Google Cloud, `europe-west1`). **DECISION:** confirm the
  model-provider contract, data-processing terms, training-use exclusion, and
  region against the school's requirements. NB the architecture lets the
  provider be swapped (see `HANDOVER.md`) if a different processor is required.

## 3. Risks to data subjects + mitigations

| Risk | Likelihood/impact | Mitigation (status) |
|---|---|---|
| A child's chat/PII exposed to another child or staff member | was HIGH | Firestore + RTDB rules scoped to the owning teacher + the pupil themselves; two cross-class leaks found + closed, emulator-tested + verified live (🟢) |
| Safeguarding disclosure mishandled / lost | HIGH | Permanent audit record on medium/high, with reviewer + timestamp + note; surfaces to staff, never back to the pupil; routing policy drafted for DSL (`safeguarding-routing-policy.md`) (🟡🔒) |
| Pupil content sent to / retained by the LLM provider | MED/HIGH | **DECISION:** confirm provider terms exclude training use + define retention; swappable provider seam exists |
| Excessive retention of children's data | MED | Erasure engine built + tested (Art. 17); auto-purge + retention window **not yet set** — see `data-retention-policy.md` (🔴/🔒) |
| Inability to fulfil a subject-access request | MED | Export engine built + tested (Art. 15) (🟢) |
| Over-reliance on AI judgement (mis-classification, false reassurance) | MED | Classifier never acts alone; teacher-in-the-loop; fallback labels are explicitly marked "not a real signal"; **DECISION:** staff training |
| Cognitive offloading harming learning (the "compression gap") | MED | The Reason interaction is designed to surface this; pedagogical, not a data risk per se, but noted |
| Account/abuse (enumeration, budget burn) | LOW/MED | Teacher allowlist; durable rate limiting; anonymous pupil auth scoped to a class code |

## 4. Outstanding decisions (for DPO + DSL)

1. Confirm controller/processor roles + lawful basis.
2. Confirm the LLM provider's data-processing terms (training exclusion,
   retention, region) — or select an approved provider via the seam.
3. Set retention windows (`data-retention-policy.md`) + enable auto-purge.
4. Approve the safeguarding routing policy + DSL escalation.
5. Decide the privacy information given to pupils + parents and how
   consent/objection is handled (Age Appropriate Design Code).
6. Sign off residual risk.

## 5. Sign-off (to be completed by humans)

- DPO: ____________________  date: __________
- DSL: ____________________  date: __________
- Headteacher / SLT: ____________________  date: __________

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
