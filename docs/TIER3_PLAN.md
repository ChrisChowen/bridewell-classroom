# Tier 3 plan — post-T1/T2, pre/post 29 May

Things the audit flagged as not-blocking-the-demo but worth doing. Each
item has an effort estimate, what "done" looks like, and the demo-day
risk if we ship without it. Status as of 21 May 2026.

## 1. Voice I/O (British accent only)

**State:** scaffolding in place, never tested end-to-end on the live
deploy. Skipped on 29 May per the audit's recommendation.

**Done means:**
- Web Speech API STT input on pupil side (push-to-talk button next to
  the chat input; releasing sends the transcript as a normal message).
- ElevenLabs Flash v2.5 TTS output, **British English voice only**.
  Auto-play optional, off by default; one tap per tutor turn.
- Per-pupil opt-in (the accessibility menu controls this).
- Recordings never persisted — only the resulting transcript text.
- "British" is enforced at config time: the chosen ElevenLabs voice ID
  is validated as British English, and the voice list shown to teachers
  filters out everything else.

**Effort:** ~1 day. STT is already trivial via `webkitSpeechRecognition`;
TTS needs an ElevenLabs key, an API route that proxies the call (so the
key never reaches the client), and a small audio queue on the pupil
side so turns don't overlap.

**British-voice candidates (ElevenLabs library, verify before use):**
- "Charlotte" — calm, female, RP-leaning. Good default for coaching.
- "Daniel" — male, BBC-news register. Useful for a teacher-leaning
  voice (Expert mode?).
- Avoid any voice tagged American (en-US) — the voice ID dropdown filter
  guarantees this.

**Demo-day risk without:** none. Voice is opt-in; default is text.

## 2. SEND adaptation feeding the live tutor

**State:** accessibility menu stubbed; SEND profile schema exists; the
profile is **not** spliced into the system prompt on the live deploy.

**Done means:**
- `LearnerProfile.sendAdaptation` (typed in `src/types/index.ts`)
  populated from the accessibility menu on the pupil's first run, OR
  injected by the teacher when adding a pupil to the class.
- `buildTutorSystemPrompt` already accepts `pupilProfile`. Wire the
  session page to fetch it from `/api/pupils/me` and pass it through.
- Adaptation block uses the format from CLAUDE.md §J — short, prose,
  one paragraph that the model can act on without seeing the underlying
  SEND label.
- Verify the prompt-injection delimiters (added in T1) wrap the
  `<pupil_profile>` block correctly — already in place.

**Effort:** ~3 hours. The wiring is the work; the prompt path is ready.

**Demo-day risk without:** mild. A pupil with SEND who joins the demo
won't get adapted output, but the demo focuses on engagement classifier
+ Reason trajectory, not SEND. Frame this as Phase 4 in the talk.

## 3. Longitudinal profile consolidation

**State:** `/api/session/consolidate` route exists but the actual
rewrite of `LearnerProfile` Firestore document is stubbed.

**Done means:**
- After a session ends (status → `ended`), a Cloud Function or the
  consolidation route reads:
  - Engagement snapshots for this pupil this session
  - Reason events (count, confidence trajectory, branch distribution)
  - Scaffold usage
  - Safeguarding flags
- Asks Gemini Pro to rewrite the `LearnerProfile` document — updating
  trajectory, recurring strengths/struggles, recommended adaptations
  — and writes the new version.
- Teacher dashboard pupil-drilldown surfaces "Across sessions: …" with
  the consolidated narrative.

**Effort:** ~half a day. Mostly: define the structured output schema,
write the system prompt, wire the writer.

**Demo-day risk without:** mild. The dashboard drill-down currently
shows live trajectory only. If we ship without this, ensure the
drill-down does not show a misleading "Profile" tab.

## 4. Playwright tests for scenarios A, B, C

**State:** smoke scripts exist (`scripts/simulate-class.mjs`, the
smoke-test-* scripts) but none assert UI behaviour end-to-end through
the actual Next.js routes.

**Done means:**
- `e2e/scenario-a-productive.spec.ts`: pupil sends a substantive
  message; tutor replies; Reason fires at topic boundary; pupil
  responds; classifier returns `flowing`; teacher dashboard reflects
  it within 2s.
- `e2e/scenario-b-cognitive-surrender.spec.ts`: pupil hits all three
  scaffolds; Reason fires at scaffold ceiling; pupil produces empty
  response; classifier returns `wheel_spinning`; teacher fires hint;
  pupil sees it within 2s.
- `e2e/scenario-c-productive-struggle.spec.ts`: pupil takes long
  pauses, asks follow-ups; Reason fires on critical concept;
  classifier returns `productive_struggle`.
- All three runnable in CI against a local Next.js + Firebase emulator
  stack.
- Each scenario also produces a video artefact (Playwright supports
  this natively) — these become the **backup demo** if anything on
  stage fails.

**Effort:** ~1 day. Playwright wiring + Firebase emulator setup take
the bulk of it; the scenarios themselves are short.

**Demo-day risk without:** high if anything else breaks. Mitigation
for 29 May: record a manual walkthrough video as a backup. The
existing `scripts/capture-screenshots.mjs` infra is the starting
point — extend it into a recorded walkthrough by replacing
`page.screenshot` with `page.video` recording.

## 5. Cost controls beyond rate limiting

**State:** in-memory rate limiter shipped in T1. Single-instance Cloud
Function memory; survives the demo, not production.

**Done means:**
- Move the rate-limit state to Firestore (a `/rateLimits/{bucket}/{id}`
  doc with TTL).
- Add a daily token-spend cap per teacher account.
- Hook into the existing `llm.ts` to track token usage per request and
  log to Firestore for spend visibility.
- Optional: cap the lesson plan generation to N per day per teacher
  account, beyond the per-hour limit.

**Effort:** ~half a day.

**Demo-day risk without:** mild. The in-memory limiter and the
manual key rotation between demo runs are enough for 29 May.

## 6. Firestore rules tightening

**State:** `firestore.rules` allows teachers to read all teacher
records and all classes. Flagged by the security audit.

**Done means:**
- Tighten reads: a teacher can read only their own profile and the
  classes they own. Listing other teachers / other classes returns
  permission-denied.
- Tighten pupil writes: a pupil can write only to their own document
  under their classId.
- Add tests via `@firebase/rules-unit-testing`.

**Effort:** ~3 hours.

**Demo-day risk without:** low — the demo is single-teacher. This is
a pre-production blocker, not a demo-day blocker.

## 7. Session-end + data retention path

**State:** chat messages and pupil names accumulate in Firestore with
no explicit retention. Safeguarding-flagged for minors' data.

**Done means:**
- Cron job (or Cloud Function trigger on class status → `ended` + 30
  days) deletes ephemeral session data (chat content); keeps
  engagement snapshots + Reason events as anonymised aggregates only.
- Pupil deletion: a teacher can wipe a pupil's session data with one
  click; gets a confirmation modal naming what will be deleted.
- Privacy notice on the pupil-join screen explaining retention.

**Effort:** ~half a day for the Cloud Function + UI; longer if the
privacy notice needs review by the schools.

**Demo-day risk without:** none. The data accumulates harmlessly;
no real pupils on 29 May.

---

## Sequencing

Suggested order if all of Tier 3 lands post-demo:

1. **Voice I/O** — most visible payoff for next round of school visits,
   and self-contained.
2. **Firestore rules tightening** — must do before any external use.
3. **Session-end retention** — must do before any minor's data lands.
4. **SEND wiring** — natural extension of voice work (both touch the
   accessibility surface).
5. **Longitudinal consolidation** — needs real session data first;
   build after a couple of weeks of usage.
6. **Playwright e2e** — least urgent, highest insurance.
7. **Cost controls v2** — only when usage warrants it.
