# Cross-subject robustness — evidence note

**Claim under test:** the engagement classifier holds up across subjects, not
just Biology — per-subject accuracy ≥ 0.85 on labelled windows spanning
Biology, English, Maths, and History.

**Status:** ✅ met on the bootstrap set (with the honest caveats below).
Research-grade confirmation on real, teacher-labelled, multi-subject data
remains 🔒.

## Method (reproducible)

The real production classifier (`src/layers/classifier.ts`, Gemini Flash→Pro
escalation) is graded against the human-authored labelled windows in
`docs/reason-eval/transcripts.jsonl` via the eval harness:

```
npm run dev   # dev server (the classify endpoint is dev-only)
node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl --base http://localhost:3000
```

The harness calls `POST /api/engagement/classify` (an unauthenticated,
no-persistence, **dev-only** seam that runs the exact production classifier —
no re-implementation drift) and computes per-subject accuracy + macro-F1. The
maths is in `scripts/reason-eval-metrics.mjs` (unit-tested).

## Result (run 2026-05-23, N = 34)

| Subject | n | Accuracy | Macro-F1 | ≥ 0.85? |
|---------|---|----------|----------|---------|
| Biology | 10 | 100.0% | 100.0% | ✅ |
| English | 7 | 100.0% | 100.0% | ✅ |
| History | 7 | 100.0% | 100.0% | ✅ |
| Maths | 10 | 100.0% | 100.0% | ✅ |
| **Overall** | **34** | **100.0%** | **100.0%** | ✅ |

Calibration: ECE 8.5%, but **all 34 predictions fell in the [0.8–1.0)
confidence band** (mean 91.5%) — zero mid-band, so calibration across the
middle of the curve is not exercised here.

## Threats to validity (read this before citing the table)

- **Easy distribution.** These are clean, archetypal windows authored to
  exemplify each state. 100% per-subject accuracy is a **ceiling on
  unambiguous cases**, not a claim about messy real-classroom transcripts. The
  honest reading: the classifier applies its rubric without subject-specific
  failure on clear windows in all four subjects.
- **Small per-subject N** (7–10). Enough to refute "Biology-only", not enough
  for a tight confidence interval.
- **No mid-band confidence.** The bimodal-clustering risk is neither confirmed
  nor refuted — real ambiguous windows are needed to populate the middle.
- **LLM-authored, single-rater labels.** The labels are bootstrap labels (a
  different model family from the system-under-test), not teacher labels. See
  `docs/reason-evidence.md`; the human-labelled, multi-rater pass is 🔒.

## What would make this research-grade

Real pilot transcripts per subject, labelled by ≥2 teachers, with κ/α agreement
reported (the agreement maths is now in `scripts/reason-eval-metrics.mjs`;
the multi-rater bootstrap path is `scripts/bootstrap-rater-labels.mjs`). Then
re-run this harness per subject and report accuracy with CIs.
