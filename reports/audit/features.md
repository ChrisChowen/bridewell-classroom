# High-Leverage Feature Opportunities — Bridewell Classroom
## Audit for 29 May 2026 Spring Challenge Demo

### 1. **Teacher Multi-Class Toggle (Current-Class Indicator)**
**Impact ÷ Effort: 8/2 = 4.0**

**Why it matters.** Polly Dalton's question: "Is it really about what's happening in the moment?" A teacher handling two concurrent classes (e.g. two lunch-time groups) needs to see *which class* they're currently watching without navigating away from the dashboard. The code already reads "liveSessions/{classId}" — just need to surface which class the teacher is looking at and allow quick switch. Unified Projects will ask about mixed-year workflows.

**Where it slots.** `src/components/teacher/ClassesPanel.tsx` (add a "Currently viewing:" badge + switch button) and `src/app/(teacher)/class/[id]/page.tsx` header. Minimal state lift.

**Effort.** 2 hours. Dead simple affordance — just UI polish on what's already wired.

**Type.** Missing detail on existing surface (cheap, high value).

---

### 2. **Live Dashboard Notification Chip for Safeguarding Flags**
**Impact ÷ Effort: 9/3 = 3.0**

**Why it matters.** The README shows that safeguarding flags land in the drill panel the moment they're raised. But a teacher is *looking at the pupil grid* when the flag fires, not inside a drill-down. Right now they only see it if they click the card. This is a teacher safety issue. A small crimson dot or badge on the PupilCard itself (matching the drill panel's chip) answers the parent/Unified Projects safeguarding question: "How does a teacher know *right now* if a pupil disclosed something concerning?"

**Where it slots.** `src/components/teacher/PupilCard.tsx` — add a 1-line safeguarding badge render near the state pill, conditional on `pupil.safeguarding?.severity !== 'none'`.

**Effort.** 1.5 hours. Minimal new logic; reuse existing `SafeguardingFlag` type and badge styling from `LivePupilPanel`.

**Type.** Missing detail (cheap, high value).

---

### 3. **"I'm Finished" Button for Pupils**
**Impact ÷ Effort: 7/3 = 2.33**

**Why it matters.** Currently pupils have three scaffolds + Reason card; when stuck they wait. A "Mark myself ready / done with this step" button (or similar self-report signal) gives the AI a real affordance: it can advance the lesson or pause for reflection without relying on the confidence heuristic. This also grounds the deferred **step progression** feature — confidence alone is fragile; pupil agency is more robust. Teachers also get a signal: "How many pupils are ready to move forward?" Pedagogically, it respects pupil autonomy.

**Where it slots.** `src/components/student/ChatSurface.tsx` — add a button below the scaffold controls that fires `/api/engagement/run` with a special signal flag. Update `LivePupilPanel` to show this status and let teachers see who's signalled readiness.

**Effort.** 3 hours. Requires: (a) new intervention type `ready_for_next`, (b) signal propagation to classifier, (c) UI in chat + drill panel, (d) optional logic to auto-advance step.

**Type.** New feature, but unlocks step progression (deferred).

---

### 4. **Per-Pupil Transcript Export (Inline Teacher Action)**
**Impact ÷ Effort: 6/4 = 1.5**

**Why it matters.** A teacher clicks a pupil card, wants to see everything that pupil said in one downloadable view (for SEND planning, parent meetings, or handover to a specialist). The conversation data already lives in Firestore; just need a button + CSV/JSON generator. JT (teacher adoption) question: "Can I take this data and act on it?" Also answers the Unified Projects handover question: "What does the teacher export when the lesson ends?"

**Where it slots.** `src/components/teacher/LivePupilPanel.tsx` — add a download button in the header. New route `/api/pupils/[id]/transcript` (auth gated) returns JSON of all messages for that pupil + engagement snapshots.

**Effort.** 4 hours. Includes auth gating, conversation aggregation query, JSON formatting, download trigger on the client side.

**Type.** New feature, moderate complexity.

---

### 5. **Classroom Display Mode Live Wiring + Glanceable Status**
**Impact ÷ Effort: 8/5 = 1.6**

**Why it matters.** The classroom display (`src/app/(display)/classroom/page.tsx`) is currently a static seeded layout. Wire it to the live RTDB and add a real-time state grid so the teacher can glance at a projector/large monitor and see "who is flowing, who is stuck" at a glance — zero identifying data, just silhouettes + state pills. This is the demo moment that lands with Polly: "You can see the whole class at once without looking at a laptop." Currently there's a design mockup; plugging in live data makes it real.

**Where it slots.** `src/app/(display)/classroom/page.tsx` — subscribe to `liveSessions/{classId}` and render real `LivePupil` data. Add a header showing when the class last updated.

**Effort.** 5 hours. Includes RTDB subscription, real-time re-renders, layout polish for dense grids, fallback states.

**Type.** Existing surface, needs wiring.

---

### 6. **Step Progress Indicator in Pupil Chat**
**Impact ÷ Effort: 6/2.5 = 2.4**

**Why it matters.** A pupil sees "Step 3 of 5" above the chat to understand lesson shape and reduce anxiety ("Am I doing this wrong or just not done yet?"). Currently only the teacher sees the lesson plan; pupils fly blind. This is a low-cost affordance that improves pupil experience and is load-bearing for the deferred step-progression feature (when confidence sustains >0.7, advance to step 4; pupil sees the tick). Shows Polly the system respects pupil autonomy and transparency.

**Where it slots.** `src/components/student/ChatSurface.tsx` — render step counter above the message list, reading from `lessonPlan.sequence` and a new RTDB field `currentStepIndex` (written by the tutor or step-progression logic).

**Effort.** 2.5 hours. Mostly UI; requires one new RTDB write in the chat flow to track current step.

**Type.** Missing detail.

---

### 7. **Lesson Library Ratings + Star Filter on Dashboard**
**Impact ÷ Effort: 7/4 = 1.75**

**Why it matters.** The library already collects appraisals with a rating. Surface the star rating as a small chip on library entries in the wizard so teachers see "this plan worked well in Year 8 Maths (4.2★, 23 uses)". This is the self-improving-system pitch: colleagues' successful plans are visible and filterable. Right now the library loads entries but doesn't surface quality signal. Unified Projects sees a mechanism for knowledge transfer across schools.

**Where it slots.** `src/components/teacher/NewClassWizard.tsx` library-entry display + `/api/lessons/library` response. Add `rating`, `useCount` to the response type.

**Effort.** 4 hours. Includes: (a) Firestore schema update to track rating + use count, (b) star-render component, (c) filter + sort UI in the wizard, (d) aggregation logic when a plan is saved.

**Type.** New feature, lightweight.

---

### 8. **Teacher Hint Response Visibility in Drill Panel**
**Impact ÷ Effort: 5/2 = 2.5**

**Why it matters.** When a teacher sends a hint ("Think about the difference between…"), they can't see whether the pupil read it, understood it, or just kept asking scaffolds. The hint lands in chat but there's no feedback loop. Add a "Pupil responded" or "3 messages after hint" annotation in the drill panel so the teacher knows their hint worked or if they need to try something else. This is the "teachers in the loop" question — did my intervention land?

**Where it slots.** `src/components/teacher/LivePupilPanel.tsx` conversation view — when rendering a teacher hint message, add a small note if there's a pupil message within 2–3 turns following it, with a forward-arrow to that response.

**Effort.** 2 hours. Requires matching teacher hint ID to subsequent pupil turns in the transcript; mostly UI annotation.

**Type.** Missing detail.

---

### 9. **Admin Teacher Allowlist Toggle UI**
**Impact ÷ Effort: 4/2 = 2.0**

**Why it matters.** Currently the allowlist is API-only (`/api/admin/allowlist`); there's no UI for admin teachers to add colleagues. For the 29 May demo, an admin needs to onboard 1–2 more teachers without using curl. A small settings panel on the dashboard (visible only to the first admin) lets them paste an email and approve. Low effort, high demo-day utility.

**Where it slots.** `src/app/(teacher)/dashboard/page.tsx` — add a hidden `/admin` link in the footer (visible only to admin role). New route `/dashboard/admin` with a simple form that POST's to `/api/admin/allowlist`.

**Effort.** 2 hours. Mostly form + auth check.

**Type.** Missing detail.

---

### 10. **Engagement Trend Sparkline on Class Cards (Dashboard)**
**Impact ÷ Effort: 5/3 = 1.67**

**Why it matters.** The ClassesPanel shows class name + join code, but not a glance-summary of "how is the class doing right now?" A tiny multi-pupil engagement sparkline (rolling average of pupil states over 20 minutes) on each class card tells a teacher "this Year 8 group is mostly flowing; that Year 9 group has 3 wheel-spinners" before they open it. This is the "pattern over alert" philosophy from the brief. Current code already computes engagement sparklines per pupil in PupilCard; just aggregate up one level.

**Where it slots.** `src/components/teacher/ClassesPanel.tsx` — compute an aggregate engagement curve (e.g. average Y-value across all pupils' trajectories) and render a miniature sparkline on each class list item.

**Effort.** 3 hours. Mostly aggregation + reusing the sparkline path-builder logic from PupilCard.

**Type.** New feature, lightweight.

---

## Summary

All ten opportunities assume the core infrastructure (RTDB live subscriptions, Firestore, intervention API, classifier) is solid. They are sorted by **Impact ÷ Effort** (highest first). Collectively they address:

- **Pedagogy (Polly):** step progression readiness (#3), pupil autonomy (#3, #6), transparency (#6), teacher reflection (#8).
- **Teacher adoption (JT):** data export (#4), quick class-level glance (#5, #10), feedback loops (#8), colleague library (#7), multi-class workflows (#1).
- **Safeguarding (parents):** real-time flag visibility (#2).
- **Handover (Unified Projects):** data export (#4), library + ratings (#7), admin onboarding (#9).

The cheapest wins (highest ratio) are **#1, #2, #6, #8, #9**. The highest-impact are **#2, #1, #3, #5, #6**. A focused 29 May build would target **#1, #2, #3, #5** (span: 13 hours) and optionally add **#8** (total 15 hours, leaves buffer).

