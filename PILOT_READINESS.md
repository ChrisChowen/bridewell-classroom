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
| Auth seam behind one interface | 🟢 | **All request verification flows through the seam — `verifyIdToken` no longer appears anywhere in `src/app/api`.** `AuthProvider` interface + Firebase adapter + registry + `verifyRequest(req,{role})` (header) and `verifyAuthToken(token,{role})` (raw/body token) (`src/lib/auth/`); `AUTH_PROVIDER` selects the backend, so Entra/OIDC is a config+adapter swap with zero route changes. Swap proven by `src/lib/auth/index.test.ts` (11 tests: both entry points, stub flow, role gate, 401/403/500). Every route migrated: the GDPR/profile/send routes (via `pupil-auth.ts`), the 5 pupil-session routes, and all teacher/admin routes (classes/*, lessons/*, interventions, admin/allowlist, auth/teacher, join). _Backend-specific identity **provisioning** (`auth/teacher` → `setCustomUserClaims`) intentionally stays on the admin SDK — a different identity backend replaces that one route wholesale; documented in HANDOVER._ |
| Data seam behind one interface | 🟡 | **Seam built + proven swappable.** `DataStore` interface + Firestore adapter + registry + `resolveDataStore()` (`src/lib/data/`), `DATA_PROVIDER`-selected, mirroring the model/auth seams. Covers the cross-route entity reads (class, pupil, learner profile); swap proven by `src/lib/data/index.test.ts` (3 tests). `GET /api/pupils/me` migrated to use **both** seams (auth + data) — a zero-direct-Firebase reference route. _Remaining: fold the analytics-collection writes + RTDB live mirror behind the interface and migrate the other routes._ |
| `HANDOVER.md` integration contract | 🟡 | Written: three seams (model/auth/data), env, build constraints, what-Unified-provides table, out-of-scope flags. Model seam fully clean; auth + data seams documented but not yet abstracted behind single interfaces. |
| Prototype shortcuts quarantined | 🟡 | In-memory rate limiter + bundled key still present; `scripts/_*.mjs` throwaways cleaned per-session. |

## B. School-pilot-ready production quality

| Item | Status | Notes |
|------|--------|-------|
| Test + CI foundation | 🟢 | Vitest suite (**93 tests**): pure logic (trigger/responder/joinCode/rate-limit/prompts/llm/learner-profile/send/voice-select/reason-eval-metrics) + **React component tests** (happy-dom + RTL) covering the teacher drill-down panels (AdaptivePitch, SendEditor — empty + populated states) and the pupil AccessibilityMenu, plus 6 emulator tests. GitHub Actions `ci.yml` gates typecheck + test + build on push/PR to main. |
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
| Join-code enumeration protected | 🟢 | `POST /api/classes/join` now rate-limited **by source IP** (`RATE_LIMITS.join`, 12/min) — anchored to network origin, not UID, since anonymous sign-in makes UID-based limiting trivially bypassable (mint a UID per guess). New `identifyByIp` + `enforceRateLimit(req, cfg, { byIp:true })`; durable RTDB backend with in-memory fallback. Unit-tested (`rate-limit.test.ts`: IP parsing incl. ignoring a bearer token, + preset bounds). |
| Graceful degradation tested | 🟡 | LLM fallback now covered by `llm.test.ts` (unavailable / throwing / unknown-provider all degrade); UI-level degradation indicators not yet asserted. |
| Error boundaries on routes | 🟢 | `(student)/session` + `(teacher)/class/[id]` boundaries present. |
| Structured logging / error reporting | 🔴 | None. |
| Per-class/teacher cost tracking | 🔴 | None. |
| Multi-teacher within a school (roster import, co-teacher) | 🟡 | **Registered-teacher roster now visible** in the admin surface (`GET /api/admin/teachers`, admin-only, with an admin column). Multiple teachers per school already work (each owns N classes). _Remaining: bulk roster import + co-teacher / substitute access to a shared class._ |
| Admin surface | 🟢 | **Built.** `/admin` page (teacher route group), gated by the `isAdmin` allowlist flag — the API is the boundary (page shows a clear "access required" state on 403). Manages the teacher allowlist: add email/domain-wildcard, grant/revoke admin (toggle), remove (DELETE, with a self-removal guard so you can't lock yourself out), plus the registered-teacher roster. Surfaced via an admin-only "Admin" item in the account menu (`UserMenu` probes the admin API once on open). Routes: `GET/POST/DELETE /api/admin/allowlist`, `GET /api/admin/teachers` (all admin-gated, on the auth seam). |
| Next pinned to 15.x (Turbopack/firebase-admin) | 🟢 | Pinned `next@^15.5.18`; documented. |

## C. Reason validated (research-grade)

| Item | Status | Notes |
|------|--------|-------|
| LLM-judge eval harness | 🟢 | Two harnesses: `scripts/pedagogy-judge.mjs` (tutor-turn quality, 4.30→5.17/6) and the new **ground-truth harness** `scripts/reason-eval.mjs` — grades the **real** classifier (via `POST /api/engagement/classify`, not a re-implementation) against human labels, emitting P/R/F1 per state, the productive_struggle-vs-wheel_spinning pairwise claim, confusion matrix + calibration. Metric maths in `scripts/reason-eval-metrics.mjs`, unit-tested (5 tests). |
| Human-labelled ground truth | 🟡🔒 | **PoC bootstrap done; teacher labels still required.** 34 windows authored + labelled by Claude (different model family from Gemini) across 5 states × 4 subjects → `docs/reason-eval/transcripts.jsonl`. Per Chris's go-ahead, this bootstraps C before real data. Still needs teacher-labelled real-pilot sessions (ideally 2 labellers + κ) for the research-grade claim. |
| Stated, met precision/recall claim | 🟡 | **PoC measured** (N=34): 100% accuracy / macro-F1; productive_struggle vs wheel_spinning P/R/F1 = 100%. Reported **honestly as a ceiling on clean archetypal windows, not a research claim** — easy distribution + no mid-band confidence (see evidence note). Research-grade met-claim on real teacher-labelled data remains open. |
| Confidence calibration (middle band) | 🟡 | **Measured on PoC**: ECE 8.2%, but **all 34 predictions fell in [0.8–1.0)** — zero mid-band, so the bimodal-clustering risk is neither confirmed nor refuted. Real ambiguous transcripts needed to populate the middle of the curve. Harness computes per-bucket accuracy + ECE. |
| `docs/reason-evidence.md` | 🟢 | **Written + populated** with the PoC run, reproducible method, and threats-to-validity; deliberately states the narrow validated claim (harness works; rubric applied without error on clean windows) and keeps the research-grade claim open. |

## D. Capability extended

| Item | Status | Notes |
|------|--------|-------|
| Adaptive per-pupil difficulty | 🟢 | Per-pupil `challengeLevel` **drifts on evidence** (Reason confidence + dominant engagement state + scaffold reliance) via the pure engine `src/lib/learner-profile.ts` — gentle (≤1 step/session, moves only when ≥2 of 3 signals agree, holds on thin sessions). Fed to the tutor through `/api/pupils/me`→`effectiveChallengeLevel`→`ChatSurface`→`lesson.challengeLevel`. **Teacher-visible + overridable** in the drill-down (`LivePupilPanel` "Pitch · across sessions": current level, AI-vs-you provenance, override buttons), never labelled to the pupil. Override route `POST /api/pupils/{id}/profile` (teacher-scoped, accountable). Engine unit-tested (17) + store emulator-tested (drift up/down + no-op). |
| Longitudinal learner profile (`/api/session/consolidate`) | 🟢 | **No longer stubbed.** `consolidateLearnerProfile` (`src/lib/learner-profile-store.ts`) folds each session's evidence into `learnerProfiles/{uid}` (capped trajectory + rolling metrics), reading only activity since the last consolidation (idempotent — a re-tapped "end lesson" is a no-op). Wired into `/api/session/consolidate`; the across-sessions level trajectory shows in the teacher drill-down via `GET /api/pupils/{id}/profile`. Emulator-proven. _Follow-up: optional LLM-written teacher narrative._ |
| British voice I/O | 🟢 | Built, **British-only enforced**. `pickBritishVoice` (`src/lib/voice/select.ts`, 6 unit tests) selects an `en-GB` voice and returns null rather than ever admitting `en-US` — callers speak in British or stay silent. Output: browser Web Speech (`speakBritish`), opt-in via the accessibility menu ("Read answers aloud"), auto-reads tutor turns. Input: `en-GB` dictation (mic button in the composer, `webkitSpeechRecognition`). Recordings never stored. Production path **live + verified**: `ELEVENLABS_API_KEY` in `.env.local` (gitignored); `POST /api/tts` returns real MP3 audio from ElevenLabs Flash v2.5 (British voice "George"), confirmed `200`. Quota/auth failures map to `503` so the client cleanly falls back to the browser en-GB voice. _Deploy: set `ELEVENLABS_API_KEY` in the Cloud Function/runtime env too. Human check: listen to the accent on a real device._ |
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

## F. Accounts, identity & admin (expanded scope — Chris, this session)

> Chris added these goals on top of the original spec: SEND profiles imply
> **student accounts**, which imply an **account-management system** that
> plugs into **Microsoft (Entra) school SSO** — with **email/password** as a
> toggleable option for now/testing — plus a **full production-ready
> superadmin** for account creation/deletion, profile management, and
> permissions. This is the next major build (work-streams A auth-seam + B
> admin), sequenced after the current seam work.

| Item | Status | Notes |
|------|--------|-------|
| Auth seam behind one interface (Entra/SAML/OIDC swappable) | 🟡 | **Foundation landed** (`src/lib/auth/`): `AuthProvider` interface + Firebase adapter + registry + `verifyRequest` helper, swap-tested (8 tests). `pupil-auth.ts` migrated. School SSO (Entra) is now an adapter + `AUTH_PROVIDER` env away. _Remaining: migrate the rest of the routes off direct `verifyIdToken`, then add the Entra adapter._ |
| Student accounts (not just join-code) | 🔴 | Today pupils are anonymous + join-code. SEND/longitudinal identity wants real per-pupil accounts; needs a roster/identity model + migration from anonymous UIDs. |
| Microsoft Entra SSO + email/password toggle | 🔴 | School-standard login; email/password kept as a toggleable fallback for testing. Depends on the auth seam. |
| Superadmin / admin surface (account CRUD, profiles, permissions, roles) | 🔴 | Production-ready admin: create/delete accounts, manage profiles + SEND, assign roles/permissions (teacher/co-teacher/DSL/admin), multi-teacher within a school. Currently only the allowlist API exists. |
| Final UI/UX polish pass (responsive desktop/tablet/mobile) | 🔴 | Dedicated end-phase: every page responsive across mobile/tablet/desktop; no z-index/stacking issues, clipping menus, broken scrolling, or elements blocking interaction/scaling. Audit + fix sweep with live device checks. |

---

## Verification gates (the goal's definition of done)

- [ ] `PILOT_READINESS.md` green on every **engineering** gate; all 🔒 items clearly amber/red with the human action named.
- [x] CI runs typecheck + unit tests + build on every push to main. _(green this commit)_
- [ ] Playwright A/B/C pass in CI.
- [x] Model-swap test passes (repoint the backend via `LLM_PROVIDER`, app still runs). _(src/lib/ai/llm.test.ts)_
- [ ] `docs/reason-evidence.md` states a met, reproducible accuracy claim.
- [ ] Clean Chrome end-to-end walkthrough: teacher register → lesson → run class; pupil (separate profile) join → chat → Reason → live dashboard — no operator workarounds.
- [ ] `HANDOVER.md` exists and survives a "could Unified integrate in a day?" read-through.
