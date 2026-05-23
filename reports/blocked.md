# Blocked / deferred streams (autonomous goal-run)

Honest log of streams that could not be completed this run, with the reason
and the path forward. Per the goal's no-fakes guardrail, nothing here was
faked or marked green.

---

## Reason bootstrap multi-rater (Anthropic) — BLOCKED (missing credential)

**Asked:** `scripts/bootstrap-rater-labels.mjs` → ≥120 windows × 3 LLM raters
(strict / permissive / mid-band) **via Anthropic (≠ Gemini)**; compute κ,
weighted κ, Krippendorff α, ECE, per-state P/R/F1, confusion; iterate the
classifier to per-state F1 ≥ 0.75.

**Blocker:** No `ANTHROPIC_API_KEY` is available in `.env.local` or the shell
environment. The spec explicitly requires the raters to be a **different
model family from Gemini** (Anthropic), and the no-fakes guardrail forbids
substituting Gemini or a string-lookup stand-in. Real multi-rater labels
cannot be produced without the credential.

**Not done (and why it can't be safely faked):** producing the κ/α/ECE
numbers requires real, independent rater judgements. Generating them with
Gemini (the system under test) would be circular; inventing them would be a
fabricated research claim. Either violates the guardrails.

**Path forward (1 human step, then ~automated):**
**NOW BUILT — blocked only on the credential (+ window authoring):**
1. `scripts/bootstrap-rater-labels.mjs` is **written** — three rater rubrics
   (strict / permissive / mid-band) against the Anthropic Messages API,
   majority vote, emits `{"bootstrap":true,"researchValid":false}`. Checks for
   `ANTHROPIC_API_KEY` and exits cleanly with a BLOCKED message when absent
   (verified).
2. The agreement maths is **implemented + unit-tested** in
   `scripts/reason-eval-metrics.mjs`: Cohen κ (incl. linear/quadratic
   **weighted κ**), **Fleiss κ** (≥3 raters), **Krippendorff α** (nominal,
   missing-data tolerant) — plus the existing per-state P/R/F1 + confusion +
   ECE. 9 new unit tests (Cohen κ=0.4 textbook case; Fleiss/α boundaries).
3. **Remaining human steps:** add `ANTHROPIC_API_KEY`; expand
   `docs/reason-eval/transcripts.jsonl` from 34 → ≥120 windows; run the script;
   fold κ/α/ECE/F1 into `docs/reason-evidence.md`.

**Current state of C (Reason validation):** the ground-truth harness
(`scripts/reason-eval.mjs`, now with a per-subject breakdown + a dev-only
`/api/engagement/classify` seam) + metrics module (incl. κ/α) exist and are
unit-tested. A 34-window single-rater PoC is documented in
`docs/reason-evidence.md`; cross-subject results in `docs/cross-subject-evidence.md`.
The only blocked piece is the credentialed Anthropic multi-rater run (LLM
raters ≠ teachers; the human-labelled pass stays 🔒).

---

## Playwright e2e — HARNESS LANDED; one positive-flow assertion pending (3-strike halt)

**Built this run:** a real emulator-backed e2e harness — `@playwright/test`,
`playwright.emulator.config.ts`, `e2e/global-setup.ts` (seeds a class +
join code into the Firestore emulator via admin), `npm run test:e2e`
(`firebase emulators:exec … playwright test`), and **emulator-aware Firebase
wiring** added to both `src/lib/firebase/client.ts`
(`NEXT_PUBLIC_FIREBASE_EMULATOR=1` → `connect*Emulator`) and
`src/lib/firebase/admin.ts` (inits with projectId only when `*_EMULATOR_HOST`
is set). Both are strictly env-gated — dormant in prod, no live-data risk.

**Working:** `e2e/pupil-join.emulator.spec.ts` "an unknown code is rejected"
**passes** end-to-end against the emulator — proving anonymous sign-in (Auth
emulator) + `POST /api/classes/join` + the data seam all work with no live
backend.

**Pending (`test.fixme`, 3-strike halt):** "pupil joins a seeded class with a
valid code" reads the seeded join code as *Unknown class code* from the dev
server, even though a standalone admin read-back of the **same** emulator
finds it (verified), and the project ids match. Three distinct fixes were
tried on this surface — kill stale server + `reuseExistingServer:false`;
`env:{...process.env}`; inline `NEXT_PUBLIC_FIREBASE_EMULATOR=1` in the
webServer command — none resolved it. Root-causing is blocked because the
Playwright-managed Next dev server's **stdout (and a temporary JOIN_DIAG log)
is not captured through `emulators:exec`**, so the server's runtime view of
the emulator host env can't be observed here. Per the goal's "3 failed
root-causes on one surface → halt, log, next stream" rule, halted. Path
forward: run the dev server in emulator mode *standalone* (observable stdout)
and confirm `FIRESTORE_EMULATOR_HOST` reaches it + the join lookup; then drop
`.fixme`. The harness + seeding are committed so this is a one-bug finish.

## Remaining demo-flow specs (5 scenarios) — DEFERRED on the same harness

**Asked:** Playwright e2e for productive-struggle (B1), wheel-spinning,
safeguarding, teacher-flow, pupil-join, gating CI.

**Why deferred this run:** a faithful end-to-end run drives the real Next app
against **Firebase Auth + Firestore + RTDB**. The pupil/teacher flows depend
on the Firebase client SDK (anonymous sign-in, RTDB websockets) which
`page.route` network interception cannot stub — so a deterministic e2e needs
the **emulator suite seeded** with a teacher account, a class + join code, and
a pupil, plus the dev server wired to the emulators. That is a real
infrastructure build, and standing up a flaky full-stack job risks
destabilising the currently-green CI (and tripping the goal's "3 failed
root-causes on one surface → revert" rule).

**Mitigation in place:** the **B1 regression is already gated** by a
deterministic component test (`ChatSurface.reason-resume.test.tsx`) that
fails before the fix and passes after — satisfying the spec's "fails before,
passes after" intent at the unit level, in the fast CI. Smoke coverage of the
full live flow is the `scripts/smoke-test-*.mjs` set run at deploy time.

**Path forward:** add a `playwright/` project with a global setup that boots
`firebase emulators:exec`, seeds a class+pupil via the admin SDK, runs the
dev server against the emulators, then drives the five flows. Gate it in a
separate CI job (so emulator flakiness can't block the unit gate).
