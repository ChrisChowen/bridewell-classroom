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
1. Add `ANTHROPIC_API_KEY` to `.env.local`.
2. Run the bootstrap script (to be authored against the Anthropic SDK, three
   temperature/rubric variants for strict/permissive/mid-band).
3. Feed labels into the existing metrics module (`scripts/reason-eval-metrics.mjs`,
   already unit-tested) — it already computes per-state P/R/F1 + confusion;
   extend with κ / weighted-κ / Krippendorff-α / ECE.
4. Header the output `{"bootstrap":true,"researchValid":false}` and update
   `docs/reason-evidence.md` (LLM raters ≠ teachers; the human-labelled pass
   stays 🔒).

**Current state of C (Reason validation):** the ground-truth harness
(`scripts/reason-eval.mjs`) + metrics module exist and are unit-tested; a
34-window single-rater PoC is documented in `docs/reason-evidence.md` with
honest caveats. The multi-rater κ/α extension is the blocked piece.

---

## Playwright e2e gating CI (5 scenarios) — DEFERRED (infrastructure cost vs. risk)

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
