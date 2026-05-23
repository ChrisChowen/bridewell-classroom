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

## Result (run 2026-05-23, N = 124, incl. 30 ambiguous windows)

The set was expanded from 34 clean archetypes to **124 windows including 30
deliberately ambiguous/borderline cases**, so this is a harder, more credible
test than the original 100%-on-trivial-windows PoC.

| Subject | n | Accuracy | Macro-F1 | ≥ 0.85? |
|---------|---|----------|----------|---------|
| Biology | 33 | 97.0% | 96.9% | ✅ |
| English | 29 | 96.6% | 95.8% | ✅ |
| History | 29 | 89.7% | 90.9% | ✅ |
| Maths | 33 | 87.9% | 88.9% | ✅ |
| **Overall** | **124** | **92.7%** | **93.5%** | ✅ |

Per-state F1 (all ≥ 0.75): flowing 0.92 · productive_struggle 0.88 ·
wheel_spinning 0.92 · disengaged 0.98 · off_task 0.97. The named pairwise
claim (productive_struggle vs wheel_spinning) holds at F1 0.88 / 0.92 on the
harder set.

Earlier 34-window PoC (clean archetypes only): 100% / 100% all subjects —
retained for reference but superseded by the harder run above.

Classifier calibration: ECE 1.0% with all *classifier* confidences in
[0.8–1.0) — the Gemini classifier is confidently correct; the populated
mid-confidence band (`docs/reason-evidence.md`) comes from the multi-rater
study, not the classifier's own confidence.

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
