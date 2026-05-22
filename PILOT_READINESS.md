# Pilot Readiness Ledger

The single honest source of truth for "can the Bridewell schools run a
supervised pilot with one real Y8 class?" Updated continuously as work lands.

**Legend:** 🟢 done & verified · 🟡 in progress / partial · 🔴 not started ·
🔒 **requires human sign-off** (engineering may be complete, but a person must
action it — Claude never marks these 🟢).

_Last updated: this commit. North-star spec:
`~/.claude/plans/i-want-to-use-inherited-blossom.md` (and committed copy below
once added)._

---

## A. Handover-clean / plug-and-play

| Item | Status | Notes |
|------|--------|-------|
| Single provider-agnostic model seam (`src/lib/ai/llm.ts`, named keys) | 🟢 | `LLMProvider` interface (`src/lib/ai/providers/`); Gemini is one adapter; backend selected by `LLM_PROVIDER`. Swap proven by `src/lib/ai/llm.test.ts` (stub provider flows through callLLM unchanged + graceful fallback). |
| Auth seam behind one interface | 🔴 | `getFirebase()` / `getAdmin()` used directly in feature code; not yet abstracted for Entra/SAML/OIDC substitution. |
| Data seam behind one interface | 🔴 | Firestore/RTDB calls scattered; not yet behind a documented datastore interface. |
| `HANDOVER.md` integration contract | 🟡 | Written: three seams (model/auth/data), env, build constraints, what-Unified-provides table, out-of-scope flags. Model seam fully clean; auth + data seams documented but not yet abstracted behind single interfaces. |
| Prototype shortcuts quarantined | 🟡 | In-memory rate limiter + bundled key still present; `scripts/_*.mjs` throwaways cleaned per-session. |

## B. School-pilot-ready production quality

| Item | Status | Notes |
|------|--------|-------|
| Test + CI foundation | 🟢 | Vitest unit suite (42 tests) on trigger/responder/joinCode/rate-limit/prompts; GitHub Actions `ci.yml` gates typecheck + test + build on push/PR to main. |
| Playwright e2e for scenarios A/B/C | 🔴 | Not yet; unit gate landed first. |
| GDPR: retention + auto-purge | 🔴 | No retention policy or purge job. |
| GDPR: subject-access export (Art. 15) | 🟢 | `gatherPupilData` (`src/lib/pupil-data.ts`) + teacher-scoped `GET /api/pupils/{id}/export`. Emulator-tested (`npm run test:emulator`). _Teacher-facing download button: small follow-up._ |
| GDPR: full pupil-record deletion (Art. 17) | 🟢 | `deletePupilData` + teacher-scoped `POST /api/pupils/{id}/delete` (requires confirmPupilId echo). Emulator-proven **total + isolated** (target → 0 docs, other pupil untouched). Ownership enforced server-side (`pupil-auth.ts`). _Teacher-facing confirm-modal button: small follow-up._ |
| No PII in logs | 🟢 | Audited all server-side `console.*` (api + layers + lib). Two sites scrubbed: classifier fallback no longer logs/stores model text (echoes pupil turns on fallback); consolidate logs `err.message` only. Only operational metadata (flags/tier/codes) now reaches Cloud Logging. _Client-side console (runs in the user's own browser, not aggregated) out of scope._ |
| Safeguarding: audit-trail doc on medium/high | 🟢 | medium/high writes a permanent `safeguardingEvents` record; marking reviewed now stamps `reviewedBy` + `reviewedAt` + `reviewNote` (was: cleared the flag with no accountable trail). Logic in `src/lib/safeguarding.ts`. |
| Safeguarding: automated test | 🟢 | `safeguarding.emulator.test.ts` — review stamps who/when/note, scoped to the pupil, idempotent. |
| Safeguarding: route to a named DSL | 🟡🔒 | Today flags surface to the class teacher + audit trail. DSL identity + escalation path + timescales + CPOMS integration are institutional decisions — drafted in `docs/safeguarding-routing-policy.md` for DSL sign-off; engineering follow-ups listed there. |
| Auth rules scoped (teacher reads only own classes) | 🟢 | `firestore.rules` v3: teacher reads only owned classes/pupils/conversations; teacher-email PII leak closed; server-only collections (snapshots/reason/safeguarding/profiles/interventions) denied to all clients. Emulator-tested (`npm run test:rules`, 18 assertions incl. live query shapes); deployed + verified live. |
| **RTDB live-mirror read scoping** | 🟢 | `database.rules.json` v2: `liveSessions/{id}/pupils` readable only by the owning teacher (via denormalised `meta/teacherId`); each pupil reads only their own entry + own interventions; `status` + name-free `aggregate` stay authed-readable. Closes the cross-class names/engagement/**safeguarding** leak. Emulator-tested (`npm run test:rtdb`, 11 assertions); `meta/teacherId` written at class-create + self-healed in engagement/run + backfilled for existing classes. _Follow-up: a no-login projector needs the `aggregate` node populated (reserved); today the projector inherits the teacher session via the dashboard Whiteboard button._ |
| Durable rate limiter (survives cold starts) | 🟢 | RTDB-transaction backend (`/rateLimits/{bucket}/{id}`) via admin SDK; survives cold starts + spans instances. In-memory fallback on RTDB error (graceful). Pure window/increment logic unit-tested (`rate-limit.test.ts`, 10 tests). _Future: a TTL sweep of stale counter docs._ |
| Join-code enumeration protected | 🟡 | Rate-limit helper exists; not wired to the join path. |
| Graceful degradation tested | 🟡 | LLM fallback now covered by `llm.test.ts` (unavailable / throwing / unknown-provider all degrade); UI-level degradation indicators not yet asserted. |
| Error boundaries on routes | 🟢 | `(student)/session` + `(teacher)/class/[id]` boundaries present. |
| Structured logging / error reporting | 🔴 | None. |
| Per-class/teacher cost tracking | 🔴 | None. |
| Multi-teacher within a school (roster import, co-teacher) | 🔴 | Single teacher : N classes only. |
| Admin surface | 🔴 | None beyond the allowlist API. |
| Next pinned to 15.x (Turbopack/firebase-admin) | 🟢 | Pinned `next@^15.5.18`; documented. |

## C. Reason validated (research-grade)

| Item | Status | Notes |
|------|--------|-------|
| LLM-judge eval harness | 🟡 | `scripts/pedagogy-judge.mjs` scores tutor turns; baseline→after measured (4.30→5.17/6). |
| Human-labelled ground truth | 🔴 | No labelled transcript set yet; current judge is LLM-vs-LLM. |
| Stated, met precision/recall claim | 🔴 | Not yet (needs ground truth). |
| Confidence calibration (middle band) | 🔴 | Bimodal-clustering risk flagged in audit, not measured. |
| `docs/reason-evidence.md` | 🔴 | Not written. |

## D. Capability extended

| Item | Status | Notes |
|------|--------|-------|
| Adaptive per-pupil difficulty | 🔴 | `challengeLevel` is lesson-wide, not per-pupil drift. |
| Longitudinal learner profile (`/api/session/consolidate`) | 🔴 | Stubbed; does not rewrite `LearnerProfile`. |
| British voice I/O | 🔴 | Not built (British-only constraint recorded in memory). |
| SEND adaptation + accessibility menu | 🔴 | `pupilProfile` seam exists in prompt builder; UI + profile construction not built. |
| Cross-subject robustness proven | 🟡 | Works on Biology in sims; Maths/English/History not evaluated. |

## E. Honest engineering-complete boundary 🔒

| Item | Status | Notes |
|------|--------|-------|
| `PILOT_READINESS.md` (this file) | 🟢 | Established this commit. |
| DPA draft | 🔴🔒 | Requires human/legal sign-off. |
| DPIA draft | 🔴🔒 | Requires human sign-off. |
| Safeguarding routing policy draft | 🟡🔒 | DRAFTED (`docs/safeguarding-routing-policy.md`) — what the software does + the institutional decisions for the DSL. Requires DSL sign-off. |
| Parent/pupil consent copy | 🔴🔒 | Requires human + school approval. |
| Pilot runbook | 🔴 | Not written. |
| Institutional buy-in (school + Unified) | 🔴🔒 | Human-only. |

---

## Verification gates (the goal's definition of done)

- [ ] `PILOT_READINESS.md` green on every **engineering** gate; all 🔒 items clearly amber/red with the human action named.
- [x] CI runs typecheck + unit tests + build on every push to main. _(green this commit)_
- [ ] Playwright A/B/C pass in CI.
- [x] Model-swap test passes (repoint the backend via `LLM_PROVIDER`, app still runs). _(src/lib/ai/llm.test.ts)_
- [ ] `docs/reason-evidence.md` states a met, reproducible accuracy claim.
- [ ] Clean Chrome end-to-end walkthrough: teacher register → lesson → run class; pupil (separate profile) join → chat → Reason → live dashboard — no operator workarounds.
- [ ] `HANDOVER.md` exists and survives a "could Unified integrate in a day?" read-through.
