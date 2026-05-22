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
| GDPR: retention + auto-purge | 🟡🔒 | Retention policy DRAFTED (`docs/data-retention-policy.md`); on-demand erasure built + tested. Scheduled auto-purge (dry-run-first) pending the DPO-approved window + a Cloud Function. |
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
| LLM-judge eval harness | 🟢 | Two harnesses: `scripts/pedagogy-judge.mjs` (tutor-turn quality, 4.30→5.17/6) and the new **ground-truth harness** `scripts/reason-eval.mjs` — grades the **real** classifier (via `POST /api/engagement/classify`, not a re-implementation) against human labels, emitting P/R/F1 per state, the productive_struggle-vs-wheel_spinning pairwise claim, confusion matrix + calibration. Metric maths in `scripts/reason-eval-metrics.mjs`, unit-tested (5 tests). |
| Human-labelled ground truth | 🔴🔒 | **Human action named.** Labelling schema, instructions, and a format-example file are ready (`docs/reason-eval/README.md` + `transcripts.example.jsonl`). Needs a person (ideally two, with κ) to label ≥~60 real/realistic windows blind to the model — the one genuinely human-blocked item. |
| Stated, met precision/recall claim | 🔴🔒 | Blocked only on the labels above. The moment `transcripts.jsonl` exists, `node scripts/reason-eval.mjs` produces the numbers; `docs/reason-evidence.md` has the claim template + results table waiting to be filled. |
| Confidence calibration (middle band) | 🟡 | **Now measurable** — the harness computes per-bucket accuracy + Expected Calibration Error, directly testing the bimodal-clustering risk. Not yet measured (needs labels). |
| `docs/reason-evidence.md` | 🟡 | **Written** — contribution stated honestly, reproducible method, threats-to-validity, and a results table marked _pending ground truth_ (deliberately no met claim before labels exist). Becomes 🟢 when the table is filled from a harness run. |

## D. Capability extended

| Item | Status | Notes |
|------|--------|-------|
| Adaptive per-pupil difficulty | 🟢 | Per-pupil `challengeLevel` **drifts on evidence** (Reason confidence + dominant engagement state + scaffold reliance) via the pure engine `src/lib/learner-profile.ts` — gentle (≤1 step/session, moves only when ≥2 of 3 signals agree, holds on thin sessions). Fed to the tutor through `/api/pupils/me`→`effectiveChallengeLevel`→`ChatSurface`→`lesson.challengeLevel`. **Teacher-visible + overridable** in the drill-down (`LivePupilPanel` "Pitch · across sessions": current level, AI-vs-you provenance, override buttons), never labelled to the pupil. Override route `POST /api/pupils/{id}/profile` (teacher-scoped, accountable). Engine unit-tested (17) + store emulator-tested (drift up/down + no-op). |
| Longitudinal learner profile (`/api/session/consolidate`) | 🟢 | **No longer stubbed.** `consolidateLearnerProfile` (`src/lib/learner-profile-store.ts`) folds each session's evidence into `learnerProfiles/{uid}` (capped trajectory + rolling metrics), reading only activity since the last consolidation (idempotent — a re-tapped "end lesson" is a no-op). Wired into `/api/session/consolidate`; the across-sessions level trajectory shows in the teacher drill-down via `GET /api/pupils/{id}/profile`. Emulator-proven. _Follow-up: optional LLM-written teacher narrative._ |
| British voice I/O | 🟢 | Built, **British-only enforced**. `pickBritishVoice` (`src/lib/voice/select.ts`, 6 unit tests) selects an `en-GB` voice and returns null rather than ever admitting `en-US` — callers speak in British or stay silent. Output: browser Web Speech (`speakBritish`), opt-in via the accessibility menu ("Read answers aloud"), auto-reads tutor turns. Input: `en-GB` dictation (mic button in the composer, `webkitSpeechRecognition`). Recordings never stored. Production upgrade reserved: dormant `POST /api/tts` (ElevenLabs Flash v2.5, British voice id) returns 503 until `ELEVENLABS_API_KEY` is set, and the client falls back to the browser British voice. _Human check: confirm an en-GB voice is present on the pilot devices + listen to the output accent (engineering enforces the lang tag; the audio itself wants ears)._ |
| SEND adaptation + accessibility menu | 🟢 | **SEND→prompt seam built + wired.** `buildSendAdaptationBlock` (`src/lib/send.ts`, 6 unit tests) turns a pupil's structured SEND profile (output style / scaffolding level 1–5 / teacher note) into the tutor's `pupilProfile` block — adapts HOW it communicates, never what counts as understanding, never shown to the pupil. Teacher sets it in the drill-down (`LivePupilPanel` "SEND adaptation"); route `GET/POST /api/pupils/{id}/send` (teacher-scoped). Flows `/api/pupils/me`→`ChatSurface`→`/api/chat`. **Pupil-side accessibility menu** (`AccessibilityMenu`, in the session header): text size (zoom-based, scales the px-heavy UI), dyslexia-friendly spacing, reduce-motion — persisted per-device, presentation-only. _Voice is tracked separately (British voice I/O row); a bundled OpenDyslexic face is a small follow-up to the spacing implementation._ |
| Cross-subject robustness proven | 🟡 | Works on Biology in sims; Maths/English/History not evaluated. |

## E. Honest engineering-complete boundary 🔒

| Item | Status | Notes |
|------|--------|-------|
| `PILOT_READINESS.md` (this file) | 🟢 | Established this commit. |
| DPA draft | 🟡🔒 | DRAFTED (`docs/DPA-draft.md`) — parties, processing schedule, processor obligations mapped to the build, sub-processor list, decisions for counsel, signature block. Requires legal review + execution. |
| DPIA draft | 🟡🔒 | DRAFTED (`docs/DPIA-draft.md`) — processing description, data inventory, children's-data considerations, risk/mitigation table (the security work maps to mitigations), outstanding DPO/DSL decisions, sign-off block. Requires DPO sign-off. |
| Data retention policy draft | 🟡🔒 | DRAFTED (`docs/data-retention-policy.md`) — proposed retention per data category, what's built (erasure/export) vs pending (scheduled purge, dry-run-first). Requires DPO sign-off + window decision. |
| Safeguarding routing policy draft | 🟡🔒 | DRAFTED (`docs/safeguarding-routing-policy.md`) — what the software does + the institutional decisions for the DSL. Requires DSL sign-off. |
| Parent/pupil consent copy | 🟡🔒 | DRAFTED (`docs/consent-and-privacy-copy-draft.md`) — age-appropriate pupil notice, parent notice, opt-in/objection form. Requires DPO + school approval + bracket-fill. |
| Pilot runbook | 🟢 | `docs/pilot-runbook.md` — pre-conditions (gates), teacher setup, running a lesson, data-subject requests, failure handling, post-pilot. |
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
