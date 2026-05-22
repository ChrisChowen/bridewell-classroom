# Reason / classifier ground-truth evaluation

This is the one part of the goal that **needs a human**: the engagement
classifier and Reason branching can only be _validated_ against transcripts
a person has labelled. The harness, metrics, and the report are built and
tested; what's missing is **labelled data**.

## What to produce

A JSONL file (default path `docs/reason-eval/transcripts.jsonl`) where each
line is one transcript **window** — the same shape the classifier sees live
— plus your **gold label**.

```json
{
  "id": "t001",
  "goldState": "productive_struggle",
  "turns": [
    { "role": "tutor", "content": "What pulls the water up the stem?" },
    { "role": "pupil", "content": "maybe the roots push it? no wait… is it the leaves pulling?" }
  ],
  "signals": { "windowSec": 60, "scaffoldUseCount": 1, "avgMessageLength": 60 },
  "lessonTitle": "Photosynthesis",
  "lessonSubject": "Biology",
  "criticalConcepts": ["transpiration"]
}
```

- `goldState` — required. One of: `flowing`, `productive_struggle`,
  `wheel_spinning`, `disengaged`, `off_task`.
- `turns` — the window, oldest first.
- `signals` — at minimum `windowSec`; add what you have.
- The lesson fields are optional but improve realism.

## How to label well (so the claim is credible)

- **Label blind to the model.** Decide the state from the transcript using
  the definitions in `src/layers/classifier.ts` (the SYSTEM prompt is the
  rubric). Don't peek at what the classifier said.
- **Two labellers + adjudicate.** For a publishable claim, have two people
  label independently and record inter-rater agreement (Cohen's κ); resolve
  disagreements by discussion. Even one careful labeller beats LLM-vs-LLM.
- **Cover the hard boundary.** The contribution stands or falls on
  `productive_struggle` vs `wheel_spinning` and `flowing` vs
  `productive_struggle`. Over-sample those.
- **Aim for N ≥ ~60**, balanced across states, drawn from real (or
  realistic simulated) sessions — `scripts/simulate-class.mjs` can generate
  transcripts to label if real pilot data isn't available yet.

## Where transcripts come from

- Real pilot sessions (preferred — after consent + the institutional gates).
- `scripts/simulate-class.mjs` runs produce conversations in Firestore you
  can pull windows from.
- `transcripts.example.jsonl` here is a **format example only** — three
  illustrative rows. **It is not ground truth** and must not be cited as
  evidence. Replace it with real labels.

## Running it

```bash
# 1. start the app so the real classifier endpoint is reachable
npm run dev            # serves /api/engagement/classify on :3000

# 2. grade your labels against the real classifier
node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl
# or against the live deploy:
node scripts/reason-eval.mjs --file docs/reason-eval/transcripts.jsonl --base https://<live-host>
```

It prints precision / recall / F1 per state, the
productive_struggle-vs-wheel_spinning pairwise claim, a confusion matrix,
and confidence calibration (ECE), and writes a JSON report to `reports/`.
Fold the headline numbers into `docs/reason-evidence.md`.

The metric maths live in `scripts/reason-eval-metrics.mjs` and are
unit-tested (`scripts/reason-eval-metrics.test.ts`), so the numbers are
reproducible.
