# Bug + edge-case audit

> **B2 closure status:** all **Critical (1–5)** and **High (6–8)** items are
> CLOSED in code (verified this pass). #1 intervention ownership →
> `interventions/route.ts` verifies `pupil.classId === classId`; #2 classifier
> fallback → returns `productive_struggle`/0.1 + `fallbackUsed`, no PII; #3
> trajectory race → `liveRef.transaction(...)`; #4 Reason eventId on refresh →
> sessionStorage rehydrate in `ChatSurface`; #5 plan size → 256KB cap in
> `classes/create`; #6 optimistic rollback → `send()` catch restores input; #7
> Reason re-entry → `fireReason` guards on `reasonCard` + sessionStorage; #8
> evaluator JSON validation → required-field check in `evaluator.ts`. Medium/low
> deferred to `reports/follow-ups.md`.

Captured from the bugs agent's findings (15 items, severity-sorted).

## Critical

**1. Per-pupil intervention missing ownership verification**
- `src/app/api/interventions/route.ts:80–114`
- The teacher's class ownership is verified, but the pupil's class membership isn't. A teacher with a valid token could send interventions to pupils outside their classes.
- Fix: before line 108, look up the pupil and verify `pupil.classId === body.classId`; 403 otherwise.

**2. Classifier fallback silent failure — indistinguishable from real data**
- `src/layers/classifier.ts:175–185`
- On LLM failure or malformed JSON, defaults to `state: flowing, confidence: 0`. Renders as "doing well" on the dashboard.
- Fix: return `off_task` (or a sentinel) and log the fallback so the teacher sees a degraded indicator.

**3. Race condition: concurrent classifier calls overwrite trajectory**
- `src/app/api/engagement/run/route.ts:91–98`
- Two near-simultaneous classifier calls both read `existing.trajectory`, append, and write back. Second write wins; one snapshot dropped.
- Fix: use `liveRef.transaction(...)` for the trajectory append.

**4. Reason eventId lost on page refresh**
- `src/components/student/ChatSurface.tsx:164–169, 539–541`
- If the pupil refreshes after a Reason card fires but before submitting, the `eventId` is lost. The follow-up evaluator call creates a new doc instead of updating the existing one.
- Fix: persist `eventId` to `sessionStorage` on fire, recover on mount.

**5. Lesson plan upload size unbounded**
- `src/app/api/classes/create/route.ts:47–52`
- Plans aren't size-validated; over the Firestore 1MB doc limit the batch silently fails.
- Fix: reject plans over 256KB with a clear error.

## High

**6. Optimistic message addition with silent failure**
- `src/components/student/ChatSurface.tsx:330–363`
- Pupil message is added optimistically; on `/api/chat` failure it sits in the UI without a tutor reply and is never persisted to Firestore.
- Fix: roll back the optimistic message on catch, or mark it failed-to-send with a retry affordance.

**7. Concurrent Reason fires on scaffold ceiling**
- `src/components/student/ChatSurface.tsx:413–419`
- Hitting the scaffold ceiling can trigger two Reason fires in quick succession (classifier + scaffold-ceiling paths). Two gold cards or one overwrites the other.
- Fix: guard `fireReason` against re-entry while a card is already pending.

**8. Evaluator fallback JSON null access**
- `src/layers/evaluator.ts:107–121`
- If the response JSON parses but is missing required fields, the responder falls back silently to a generic follow-up. Teacher loses the evaluator-failure signal.
- Fix: validate the parsed JSON against the schema fields before returning.

## Medium

**9. Silent conversation append failure** — `ChatSurface.tsx:187–203`; turn lost from drill panel, no signal. Fix: log + (optional) retry.

**10. Class deletion mid-session** — `/api/engagement/run`; the call still succeeds even if the class doc has been deleted. Fix: check class still exists before writing live mirror.

**11. No de-duplication of concurrent interventions** — duplicate `end` events. Fix: idempotency check on the last terminal event.

**12. Interventions have no client-side delivery acknowledgement** — 200 OK doesn't mean the pupil received it. Fix: verify the RTDB write before returning OK.

## Low

**13. Reason fire failure silent on the client** — `ChatSurface.tsx:171–174`; no UI signal. Fix: surface a small banner.

**14. No validation of client-supplied lesson metadata in `/api/engagement/run`** — possible prompt-injection via `lessonTitle`. Fix: length + character whitelist.

**15. Content truncation without user notice** — `/api/conversation/append` truncates over 4000 chars silently. Fix: warn the user (or store in chunks).
