# UX Flows Audit – Bridewell Classroom
**Audit Date:** 21 May 2026 | **Demo:** 29 May 2026 (8 days)

> **B2 closure status:** both **High** items CLOSED. #5 (End-class no
> confirm/undo) → routes through a focus-trapped `confirmEnd` modal. #7
> (`/session` class deletion) → the live class-doc subscription guards
> `!snap.exists()` so deletion never crashes the pupil session; an explicit
> "class removed" state is a deferred nicety. Mediums/lows →
> `reports/follow-ups.md` (folded into the UI/UX polish pass).

## Flow 1: First-time Teacher (/ → /login → register → /dashboard → /class)

### Finding 1: Ambiguous "New class" entry point on empty dashboard
**Severity:** Medium | **Location:** `src/app/(teacher)/dashboard/page.tsx:145–197` (FirstStepsCard)
**Problem:** Two CTAs for "New class" exist on the empty state—one in the header button and one in the welcome card. The welcome card says "Click **New class** above" but the physical button is in the TopBar, creating spatial dissonance for first-time users.
**Suggested Fix:** Consolidate to one clear CTA. Either move the button into the card (as the primary action) or hide it from the header when the dashboard is empty. Make the affordance unmissable.

### Finding 2: Lesson plan review screen doesn't show AI-generated vs. library-sourced origin
**Severity:** Low | **Location:** `src/components/teacher/NewClassWizard.tsx:197–210` (describe step)
**Problem:** When a teacher picks a plan from the library (pre-saved by a colleague), there's no visual indication that it came from the library vs. being freshly generated. A teacher seeing a polished plan might not realise it's a template, reducing buy-in.
**Suggested Fix:** Add a small label in the review step ("Library plan from [teacher name]") and emphasise that they can still edit it before approving.

### Finding 3: No feedback loop after class creation until first pupil joins
**Severity:** Low | **Location:** `src/components/teacher/NewClassWizard.tsx:130–138` (done step)
**Problem:** After approving the plan and getting the join code, there's no next-step guidance. Teachers see the code but don't know what happens after they write it on the board or what they'll see when pupils join.
**Suggested Fix:** Add a one-line note in the "done" step: "Share this code with your class. Pupils type it in at [link to /join]. You'll see them appear here in real-time."

---

## Flow 2: Returning Teacher (login → /dashboard → /class → interactions → wrap-up → appraise)

### Finding 4: "Dormant pupil" card is silent about what it means
**Severity:** Medium | **Location:** `src/app/(teacher)/class/[id]/page.tsx:440–462` (DormantPupilCard)
**Problem:** A pupil who "joined but not yet active" is shown as a faded card with no call-to-action. A teacher has no way to know: Have they not started typing yet? Are they idle? Are they frozen? Is the chat broken?
**Suggested Fix:** Add a time-based micro-label: "Joined 3 min ago" or "No activity yet". If intentional, add a small icon or hint suggesting the teacher check back.

### Finding 5: No confirmation or undo for "End class" once executed
**Severity:** High | **Location:** `src/app/(teacher)/class/[id]/page.tsx:198–211` (End class button)
**Problem:** The "End class" button shows a browser `confirm()` dialog, but once confirmed, it's irreversible and pupils immediately see the closing screen. A teacher who hit it by mistake cannot undo.
**Suggested Fix:** On the dashboard, replace the `confirm()` with a modal that explains what "End class" does: pupils see their closing screen and cannot reply further. Offer a "Cancel" button. Once confirmed, show an inline success banner before clearing the dialog.

### Finding 6: Wrapping up is one-shot; no way to recall or edit the wrap-up message
**Severity:** Low | **Location:** `src/app/(teacher)/class/[id]/page.tsx:189–197` (Wrap-up button)
**Problem:** The wrap-up message is hardcoded ("Five minutes left — round off what you have."). A teacher cannot customise it or see what pupils were told. It lands silently in the tutor's instructions.
**Suggested Fix:** Optional: allow teachers to type a custom wrap-up message in the button click, or at least show a banner saying "Wrap-up called: [message] — pupils have been nudged to summarise."

---

## Flow 3: First-time Pupil (/join → code + name → /session → chat → Reason → closing)

### Finding 7: Class deletion is not handled gracefully in /session
**Severity:** High | **Location:** `src/app/(student)/session/page.tsx:70–78`
**Problem:** If a teacher deletes a class (or it expires) while a pupil is mid-session, the pupil sees a loading screen indefinitely or a generic "Failed to load" error. They don't know the class is gone, not that their connection is broken.
**Suggested Fix:** In the error handler, check the 404 response from `/api/pupils/me`. If the class no longer exists, show a specific message: "This lesson has been cancelled. Your teacher may have ended or deleted the class."

### Finding 8: "You are in" screen on /join has a 700ms delay before redirecting
**Severity:** Low | **Location:** `src/app/(auth)/join/page.tsx:85–89`
**Problem:** After joining, pupils see "You are in. Opening the session…" for 700ms, then redirect. The delay is intentional (for visual feedback) but may feel stuck on slow connections, and there's no explicit "loading" indicator.
**Suggested Fix:** Add a brief spinner or progress indicator during the 700ms delay, or reduce the delay to 300ms and add a light transition so it feels snappy.

### Finding 9: ClosingScreen silently fails with generic error message
**Severity:** Medium | **Location:** `src/components/student/ClosingScreen.tsx:108–117`
**Problem:** If consolidation API fails, pupils see "Lesson ended. [error message]" without context. The error could be a network timeout, missing data, or API failure—all indistinguishable to a pupil.
**Suggested Fix:** Offer a fallback "Your tutor is noting what you covered today" message with no error, or a single retry button. Keep errors opaque to pupils; log them for the teacher.

---

## Flow 4: Switching Pupil (in /join with class A → enter code for class B → /session)

### Finding 10: No warning or confirmation before switching classes
**Severity:** Medium | **Location:** `src/app/(auth)/join/page.tsx:38–67` (CurrentClass banner)
**Problem:** A pupil in Class A can switch to Class B by entering a new code. They see a banner showing their current class, but there's no confirmation step. If they mistype a code or accidentally join the wrong class, they lose access to Class A's conversation history.
**Suggested Fix:** Add a soft warning: "You are about to leave [Class A]. Enter a new code to switch." Or require an explicit "Switch" button on the banner rather than auto-accepting a new join.

---

## Flow 5: Authorisation Edge Cases

### Finding 11: Teacher A accessing Teacher B's class URL shows generic error, then redirects after 2.4 seconds
**Severity:** Low | **Location:** `src/app/(teacher)/class/[id]/page.tsx:63–77`
**Problem:** A 403 error is handled correctly (bounces to /dashboard with a message), but the delay is silent. In the 2.4 seconds before redirect, the page shows "Loading…" with no indication something went wrong. Users may assume it's slow, not blocked.
**Suggested Fix:** Show the error message inline (not deferred) and let the user click a button to return, rather than auto-redirecting after a delay.

### Finding 12: Pupil trying to access /dashboard or /class/[id] is silently redirected to /session
**Severity:** Low | **Location:** `src/app/(teacher)/dashboard/page.tsx:28–31` and `src/app/(teacher)/class/[id]/page.tsx:47–49`
**Problem:** No feedback is given. A pupil who lands on a teacher URL is bumped silently. They don't know they hit a restricted area or why they're on /session.
**Suggested Fix:** Log the attempt (for debugging), or briefly show a toast: "That area is for teachers only."

---

## Summary

**Critical issues (blocks the demo):** 1  
- Finding 5: No undo for "End class"

**High issues (stakeholders will notice):** 2
- Finding 4: Dormant pupils are unclear
- Finding 7: Class deletion mid-session has no graceful error

**Medium issues (polish, UX refinement):** 5
- Findings 1, 6, 9, 10, 11

**Low issues (nice-to-have):** 4
- Findings 2, 3, 8, 12

**Priority for next 8 days:** Fix 5 (critical), then 4 and 7 (high). 1 and 6 are low-hanging polish.
