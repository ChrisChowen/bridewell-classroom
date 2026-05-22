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

## Results — TO BE COMPLETED AFTER LABELLING

> Run `node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl`
> and paste the headline numbers here.

| Metric | Target | Measured (N = ____) |
|---|---|---|
| Overall accuracy | — | _pending_ |
| Macro F1 (5 states) | — | _pending_ |
| `productive_struggle` precision / recall | ≥ ___ / ≥ ___ | _pending_ |
| `wheel_spinning` precision / recall | ≥ ___ / ≥ ___ | _pending_ |
| Confidence calibration (ECE) | ≤ ___ | _pending_ |
| Inter-rater agreement (κ) | ≥ 0.6 | _pending_ |

Confusion matrix + per-bucket calibration: paste from the
`reports/reason-eval-*.json` the harness writes.

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

_Status tracked in `PILOT_READINESS.md`. Goal: `docs/NORTH_STAR.md`._
