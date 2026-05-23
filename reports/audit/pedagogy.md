# Bridewell Classroom — Pedagogical Audit
**21 May 2026. For the 29 May CDT Spring Challenge presentation.**

> **B2 closure status:** Critical + High addressed. #1 (CRITICAL classifier
> over-weights correctness) → CLOSED; the classifier prompt now states
> "Correctness is NOT engagement", routes terse-correct → `disengaged` and
> hedging → `productive_struggle`. #2 (HIGH soft-challenge re-question) →
> CLOSED; the evaluator now quotes the weakest segment back in the follow-up.
> #4 (HIGH adjacent-activity repeats not enforced) → CLOSED;
> `varyAdjacentActivities` enforces variety post-generation (unit-tested). #3
> (HIGH activity discrimination) → core concern closed (each activity now
> prescribes distinct concrete tutor behaviour); exemplar-dialogue nicety
> deferred to `reports/follow-ups.md`, along with mediums #5/#6.

---

## Summary

The prototype is pedagogically coherent across its six major subsystems. The tutor system prompts enforce coach-mode questioning; the activity instructions provide meaningful discrimination; the Reason evaluator operationalises productive struggle; safeguarding is properly gated. Six targeted findings below, graded Critical to Low, with specific prompt edits for each.

**Key strength:** The Reason architecture genuinely probes without judging, consistent with the productive-struggle framing in CLAUDE.md.

**Key risk:** The classifier prompt rewards *correctness* and *explanation length* as signals of engagement, creating a collision with the "disengaged but terse correct answers" persona (Bertie Lawson) that was misclassified in the sim run.

---

## Findings

### 1. **CRITICAL: Classifier prompt over-weights correctness as signal of engagement**

**Severity:** CRITICAL  
**File + line:** `src/layers/classifier.ts`, lines 79–86  
**Problem:** The classifier's state definitions anchor "productive_struggle" to "partial answers" and "attempting their own examples," but the heuristic for "flowing" includes "brief hesitations only" — creating an ambiguity where a pupil who gives correct answers tersely (no hesitation, no elaboration) reads as flowing even if their engagement is actually disengaged. The README's own simulation report confirms this: Bertie Lawson (intended disengaged) was misclassified as productive_struggle 60% because his answers were correct.

**Suggested edit** (lines 80–86):
```
  - flowing: on-topic, moving forward, asking follow-up questions or 
      elaborating unprompted, visible effort in reasoning.
  - productive_struggle: slower, partial answers, willing to keep trying,
      asking follow-ups, attempting their own examples, or showing effort
      even when answers are imperfect.
```
*Rationale:* Adding "asking follow-up questions or elaborating unprompted" to flowing makes the distinction active—it penalises terse correctness as passive, not productive. The safeguard is that correctness alone no longer triggers flowing.

---

### 2. **HIGH: Soft-challenge follow-up in evaluator is a re-question, not a probe**

**Severity:** HIGH  
**File + line:** `src/layers/evaluator.ts`, lines 54–58  
**Problem:** The prompt instructs the evaluator to produce a "generative question targeting that segment" when confidence is 0.4–0.65, but the example in responder.ts (line 51) is "Can you say a bit more about that?" — a generic re-prompt rather than a *targeted* probe. If the evaluator follows the instruction to be specific but the fallback is generic, weak follow-ups loop instead of deepening reasoning. The pedagogical claim is that the soft challenge "asks the pupil to reason further on the weakest segment," but a vague prompt wastes the evaluator's confidence signal.

**Suggested edit** (lines 54–58):
```
When confidence is between 0.4 and 0.65, also produce:
  - weakest_segment: the shortest slice of the pupil response that is
    weakest (a phrase, not a sentence).
  - follow_up: one short, generative question targeting that segment,
    naming the segment explicitly (e.g. "You said X—what would that 
    look like in practice?"). No more than 22 words. British English.
```
*Rationale:* "naming the segment explicitly" ensures the follow-up is specific, reducing loop risk. The evaluator must quote the weakness back to the pupil to make the challenge stick.

---

### 3. **HIGH: Activity instructions lack discriminating detail for tutor behaviour**

**Severity:** HIGH  
**File + line:** `src/lib/ai/activities.ts`, lines 41–107 (all nine activity definitions)  
**Problem:** A Year-8 pupil (the intended reader at test time) cannot distinguish between "Socratic dialogue" (line 45: "ask one question at a time") and "prediction" (line 60: "ask the pupil to predict and to say WHY") in what the tutor will actually send back. Both instructions say "ask a question"; the difference is in the *context*, not the tutor's register. The pedagogical intent is that activities produce different cognitive loads, but the prompt language is abstract enough that the tutor could run any activity as generic socratic probing.

**Suggested edit** (add concrete exemplars to each activity's `tutorInstructions`):
```
Example for socratic:
"Pupil says: 'Plants need water.' Tutor: 'Right, and what does the water do?'"

Example for prediction:
"Tutor: 'If we covered the leaf with foil, what would happen to the plant?' 
Pupil: 'It would die.' Tutor: 'Why do you think that?'"
```
*Rationale:* Exemplars anchor the tutor's actual turn phrasing to the activity shape. Without them, all activities risk collapsing into generic questioning.

---

### 4. **HIGH: Lesson planner's "vary activities" rule is advisory, not enforced**

**Severity:** HIGH  
**File + line:** `src/lib/ai/lessonPlanner.ts`, lines 51–58 (system prompt)  
**Problem:** The hard rule states "Do not repeat the same activity in adjacent steps," but there is no schema-level validation or penalty in the LLM output. If the model ignores the constraint, the fallback sequence (lines 165–173) is a single Socratic step, so a teacher who gets a weak plan and approves it will run monotone questioning across the whole lesson — directly undermining productive struggle. The pedagogical claim is that activity variety sustains engagement; the implementation does not defend it.

**Suggested edit** (add schema validation after JSON parse, around line 212):
```typescript
// Validate activity sequence: no adjacent repeats
for (let i = 1; i < sequence.length; i++) {
  if (sequence[i].activityType === sequence[i - 1].activityType) {
    // Log and auto-swap to a different activity for step i
    sequence[i].activityType = getAlternateActivity(sequence[i - 1].activityType, subject);
  }
}
```
*Rationale:* Defensive programming. The rule is stated but the model can fail; enforce it client-side after generation. The teacher still reviews and can override, but the default is defensible.

---

### 5. **MEDIUM: Coach-mode system prompt allows a loophole for scaffolding answers**

**Severity:** MEDIUM  
**File + line:** `src/lib/ai/prompts.ts`, lines 55–60  
**Problem:** The COACH mode says "You nudge the pupil toward [the answer] with a single, well-aimed question, a small observation, or a constraint that asks them to think." The word "constraint" is vague — "Constraint" could mean "You must use a verb starting with /s/" or "List only animals" (which are legitimate), or it could be interpreted as a leading constraint that narrows the answer space so much it becomes a hint: "List only animals that eat plants and have four legs" is almost giving the answer away. The safeguarding clause about redirecting hand-backs ("just tell me") is good, but it comes *after* the pupil hand-back, not before.

**Suggested edit** (lines 59–60):
```
You may acknowledge what the pupil has said before asking the next thing.
Your constraint (if you use one) should narrow the thinking path without
revealing the destination — never use a constraint to guide towards a
single answer. If a pupil's tone suggests they want you to simply tell them,
redirect before they hand the work back: "I know it's tempting to ask me,
but the value is in your thinking—let me ask you this instead."
```
*Rationale:* Pre-emptive redirection catches hand-offs before they happen. Clarifying "constraint" removes the loophole that could let the tutor mimic scaffolding button behaviour.

---

### 6. **MEDIUM: Consolidation prompt uses temperature 0.45 for a fact-finding task**

**Severity:** MEDIUM  
**File + line:** `src/app/api/session/consolidate/route.ts`, line 123  
**Problem:** The closing-screen consolidation prompt (lines 21–33) asks the model to cite "specific phrases the pupil used" and "name what they actually did," which is a retrieval + transcription task, not a creative one. Temperature 0.45 is elevated for this; it increases hallucination risk in the specific-attribution claim. The spec in CLAUDE.md §I says the close should cite pupil phrasing; if the model invents an attribution ("You said 'gravity is the reason' ") that wasn't in the transcript, the pupil will notice the fabrication, breaking trust. Pedagogically, the close must be credible.

**Suggested edit** (line 123):
```typescript
temperature: 0.2,  // fact-grounded task; lower temp for accuracy
```
*Rationale:* Lower temperature reduces hallucination in retrieval tasks. The closing is already thoughtful (thinkingBudget: 512); cooler sampling prevents false citations.

---

## Deferred items (not critical for 29 May)

1. **Learner profile longitudinal update** (`src/lib/ai/appraiser.ts`): The profile-update system prompt is absent from the codebase (referenced in CLAUDE.md §I but not yet implemented). This is Phase 4 scope; the audit recommends that when it lands, it should emphasize engagement *trajectory* (productive_struggle → flowing) over raw confidence scores, to align with Chen et al. 2024's framing.

2. **Voice-tutor register** (CLAUDE.md §K): When voice I/O lands, ensure the tutor's verbal cadence matches the text-based coaching register — pauses and pacing should reinforce the "one question at a time" rhythm, not rush or over-explain.

---

## Cross-cutting strengths

- **Safeguarding gates are properly severe.** The classifier's severity thresholds (lines 95–104) are defensible; the summary + excerpt design respects teacher time.
- **Reason avoids verdict language.** The responder's accept-lines (lines 31–35) never score the pupil; framing stays "you have it," not "you scored 0.75."
- **Activity catalogue is coherent.** The nine types cover different cognitive routes (retrieval, prediction, sorting, application, teach-back); the tutor instructions per activity are pedagogically sound.

---

## Recommendation for 29 May

Implement findings 1–3 before the demo day. Finding 1 (classifier) is the highest priority because the audience's first question will be "show me how you know Bertie is disengaged, not just quiet" — the current classifier prompt does not separate the two reliably. Findings 2 and 3 are second-tier but will strengthen the Reason and activity-based pacing story. Findings 4–6 are implementation details that can follow the demo if time is tight.

**Final framing for Polly Dalton and Andy Woods:** The prototype is not claiming to solve cognitive offloading through tech alone. Instead, it makes the pupil's engagement *visible* to the teacher (via the classifier + Reason trajectory), and it constrains the AI to *ask, not answer* (coach mode + activity variety). The teacher stays in the loop. The Reason interaction is the pedagogical hook — it produces evidence of understanding without surfacing a verdict to the pupil, which is the novel contribution.

---

*Audit completed 21 May 2026. Reviewed against CLAUDE.md v5, README.md, and live prompt files.*
