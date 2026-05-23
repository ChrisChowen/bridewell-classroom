# Reason — research-contribution evidence

> **Status: methodology + harness complete; the accuracy claim is PENDING
> human-labelled ground truth.** This note is written so that filling in one
> table (after labelling) turns it into the citable evidence the academic
> panel (Dalton / Woods / Fu) and the PhD can stand behind. It deliberately
> does **not** state a met claim yet — doing so before labels exist would be
> a fake, the named failure mode of this project.

## The contribution, stated honestly

Bridewell Classroom couples two things the literature treats separately:

1. **A system-triggered metacognitive probe ("Reason").** At principled
   moments (topic boundary, scaffolding ceiling, teacher trigger, a
   lesson-design critical concept) the tutor pauses and asks the pupil to
   _do something with_ what they've learned — paraphrase, give a novel
   example, reason counterfactually, or teach it back. This is not a fourth
   scaffolding button; it is a deliberate, evidence-gathering interruption.

2. **A five-state engagement signal** grounded in the productive-struggle
   literature (Kapur 2008; Chen et al. 2024; Zhang et al.) that
   distinguishes _productive struggle_ from _wheel-spinning_ — the
   distinction a teacher most needs and most struggles to make at a glance
   across a class.

The claim we want to make — and validate — is narrow and falsifiable:

> **The classifier + Reason evaluation distinguish `productive_struggle`
> from `wheel_spinning` at ≥ _P_ precision / ≥ _R_ recall on _N_
> human-labelled transcript windows, with confidence that is calibrated
> (ECE ≤ _E_).**

We are NOT claiming the system "knows when a pupil is learning". We are
claiming a measured, reproducible signal on a specific, hard distinction.

## Method (reproducible)

- **Unit of analysis:** a transcript _window_ (the same span the live
  classifier sees), labelled with one gold engagement state.
- **Labels:** human, blind to the model, using the rubric in
  `src/layers/classifier.ts`. For a publishable claim: two labellers,
  inter-rater agreement reported (Cohen's κ), disagreements adjudicated.
- **System under test:** the **real** classifier, exercised through
  `POST /api/engagement/classify` (not a re-implementation) by
  `scripts/reason-eval.mjs`.
- **Metrics:** per-state precision / recall / F1, macro averages, a
  confusion matrix, the productive_struggle-vs-wheel_spinning pairwise
  claim, and confidence calibration (Expected Calibration Error). Metric
  maths are in `scripts/reason-eval-metrics.mjs` and unit-tested
  (`scripts/reason-eval-metrics.test.ts`).
- **Data:** real pilot sessions once the institutional gates are signed
  off; realistic simulated sessions (`scripts/simulate-class.mjs`) in the
  interim — clearly labelled as such.

See `docs/reason-eval/README.md` for the labelling schema + how to run it.

## Results — PoC run (bootstrap labels), pending teacher ground truth

> **What this is.** A first run on **N = 34** windows that were *authored
> and labelled by Claude* (a different model family from the Gemini
> classifier under test), spanning all five states and four subjects
> (Biology, Maths, English, History). This bootstraps the pipeline before
> teacher-labelled real-pilot data exists. **It is not the final claim** —
> see the caveats, which matter more than the headline number.

Command: `node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl`
(real classifier via `POST /api/engagement/classify`). Report:
`reports/reason-eval-1779417770303.json`.

| Metric | PoC result (N = 34) | Status |
|---|---|---|
| Overall accuracy | **100.0%** | ceiling — see caveat |
| Macro F1 (5 states) | **100.0%** | ceiling — see caveat |
| `productive_struggle` precision / recall | **100% / 100%** (n=9) | ceiling |
| `wheel_spinning` precision / recall | **100% / 100%** (n=6) | ceiling |
| Confidence calibration (ECE) | **8.2%** | mildly overconfident |
| Inter-rater agreement (κ) | n/a (single labeller) | **pending** (needs 2 humans) |

**The honest reading.** The classifier separated these windows perfectly,
including the hard `productive_struggle` vs `wheel_spinning` boundary the
contribution rests on. That is encouraging but **must not be reported as
"~100% accurate"** — it is a ceiling result on *clean, archetypal* windows
written to instantiate the rubric. Two things make it a sanity check, not
proof:

1. **Easy distribution.** Windows authored to match the rubric are far more
   separable than real Year-8 chat, where states blur. The 100% tells us the
   rubric is internally consistent and the classifier applies it faithfully
   — not that it will hit 100% (or anywhere near) on messy real data.
2. **No mid-band evidence.** *Every* prediction landed in the 0.8–1.0
   confidence bucket (mean 91.8%). So we have **zero** evidence about the
   evaluator's behaviour in the middle confidence band — which is exactly
   the bimodal-clustering risk the audit flagged. The PoC neither confirms
   nor refutes it; real ambiguous transcripts are required to populate the
   middle of the calibration curve.

So the validated claim today is narrow and true: *the harness runs against
the real classifier, the metrics are reproducible, and on archetypal windows
the five-state rubric (incl. the productive_struggle/wheel_spinning split) is
applied without error.* The **research-grade** claim — a met precision/recall
on **human-labelled real transcripts with κ ≥ 0.6 and a populated mid-band**
— remains open and is the teacher-labelling task in `docs/reason-eval/`.

Confusion matrix: diagonal (every state predicted == gold); see the JSON
report. Calibration: single bucket [0.8–1.0), n=34, acc=100%, meanConf=91.8%.

## Threats to validity (to address as data arrives)

- **Bimodal confidence.** The audit flagged a risk that the evaluator
  clusters confidence near 0/1 with an empty middle band. The calibration
  table above measures this directly; if the middle band is empty, the
  evaluator rubric needs a genuine "partial" branch, not a recalibration.
- **Label leakage.** Labelling must be blind to the model's output.
- **Distribution.** Simulated transcripts may be easier than real Year-8
  chat; the claim should be re-run on real pilot data before it is final.
- **Cross-subject.** Validated first on Biology; Maths / English / History
  windows must be in the labelled set before claiming subject-generality
  (tracked as "cross-subject robustness" in `PILOT_READINESS.md`).

## Update — cross-subject + multi-rater machinery (this run)

**Cross-subject (done).** The real classifier was graded per subject through a
dev-only `/api/engagement/classify` seam: Biology / English / History / Maths
all 100% accuracy on the labelled windows (n = 34 total), all ≥ 0.85. Full
table + caveats in `docs/cross-subject-evidence.md` — the headline caveat is
unchanged: a **ceiling on clean archetypal windows**, not a research claim;
all confidence still fell in [0.8–1.0) (no mid-band).

**Multi-rater bootstrap (RUN — via Claude agents, not the Gemini classifier).**
The window set was expanded to **N=124** (incl. 30 deliberately ambiguous
borderline windows to populate the mid-confidence band), then labelled by
**three independent Claude AGENT raters** with distinct rubrics
(strict / permissive / mid-band). Agents are a **non-Gemini model family**, so
this is not circular with the Gemini classifier under test (and it sidesteps
needing an `ANTHROPIC_API_KEY`). The agreement maths
(`scripts/reason-eval-metrics.mjs`, unit-tested) is applied by
`scripts/compute-rater-metrics.mjs` over the three label files.

Results (`reports/bootstrap-rater-*.json`, `"bootstrap":true,"researchValid":false`):

| Metric | Value |
|--------|-------|
| Fleiss κ (3 raters) | **0.95** |
| Krippendorff α (nominal) | **0.95** |
| Cohen κ (pairwise) | 0.94–0.97 (linear-weighted 0.97–0.98) |
| Rater majority-vote vs authored gold | 97.6% acc, macro-F1 98.1% |
| Per-state F1 (majority vs gold) | flowing 0.95 · productive_struggle 0.96 · wheel_spinning 1.00 · disengaged 1.00 · off_task 1.00 — **all ≥ 0.75** |
| productive_struggle vs wheel_spinning | F1 0.96 / 1.00 |
| Mid-band rater ECE | 17.0% — **mid band now populated**: [0.4–0.6) n=13, acc 84.6% @ meanConf 53.6% |

Interpretation: three independent raters agree near-perfectly (κ/α ≈ 0.95) on
this set, and recover the authored intent at all-states-F1 ≥ 0.75. The mid-band
rater's mid-confidence calls (the formerly-empty [0.4–0.6) band) land ~85%
correct — slightly under-confident there, which is the honest, non-degenerate
calibration signal the earlier 34-window PoC couldn't show.

**Hard caveat (unchanged): agents are NOT human teachers.** This is a bootstrap
signal that the rubric is consistently applicable and the states are
separable; it is not the research-grade claim. The Anthropic-API path
(`scripts/bootstrap-rater-labels.mjs`) and the human-labelled, teacher-rated
pass both remain available / required; the research claim stays **🔒**.

**Standing caveat (unchanged):** LLM raters — Anthropic or otherwise — are
**not a substitute for human teacher labels.** The research-grade claim
requires real pilot transcripts labelled by ≥2 teachers with κ/α reported.
That pass remains **🔒 (human sign-off)**.

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
