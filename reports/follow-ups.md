# Deferred follow-ups (medium / low audit items)

Per the goal-run B2 directive: **critical + high** audit findings are closed
in `reports/audit/*.md`; the **medium / low** items below are deferred here
with their source. None are pilot-blocking. Triage before a real pilot.

_Last updated: B2 closure pass (see reports/goal-run-*.md)._

---

## From `reports/audit/bugs.md`

| # | Sev | Item | Note |
|---|-----|------|------|
| 9 | Medium | Silent conversation-append failure (`ChatSurface`) — a turn can be lost from the drill panel with no signal | Best-effort by design; add a log + optional retry |
| 10 | Medium | Class deletion mid-session | **Closed** — `/api/engagement/run` 404s "Class no longer exists" before writing the live mirror |
| 11 | Medium | No de-duplication of concurrent interventions (duplicate `end` events) | Add an idempotency check on the last terminal event |
| 12 | Medium | Interventions have no client-side delivery acknowledgement | Verify the RTDB write/ack before returning OK |
| 13 | Low | Reason-fire failure silent on the client | Surface a small non-blocking banner |
| 14 | Low | No validation of client lesson metadata in `/api/engagement/run` | **Closed** — `clean()` NFKC-normalises + strips control chars + length-caps |
| 15 | Low | Content truncation without user notice (`/api/conversation/append`, 4000 chars) | Warn the user or store in chunks |

## From `reports/audit/pedagogy.md`

| # | Sev | Item | Note |
|---|-----|------|------|
| 3 | High→partial | Activity instructions could carry full exemplar dialogues | Core concern (all activities "just ask a question") is **closed** — each `tutorInstructions` now prescribes a distinct, concrete tutor behaviour. Adding verbatim exemplar exchanges is a marginal nicety and risks the tutor copying subject-specific exemplars across subjects; deferred. |
| 5 | Medium | Coach-mode "constraint" loophole + pre-emptive hand-back redirect | Tighten `prompts.ts` COACH wording |
| 6 | Medium | Consolidation prompt temperature 0.45 for a fact-grounded task | Lower to ~0.2 to reduce false-citation risk |

## From `reports/audit/ui-polish.md`

| # | Sev | Item | Note |
|---|-----|------|------|
| 1 | High | Hard-coded gold tints break token discipline | Folded into the **UI/UX polish pass** stream (`docs/ux-polish-pass.md`) |
| 9 | High | Dark-mode gold contrast insufficient | Folded into the **UI/UX polish pass** stream |
| 2,3,4,8 | Medium | Spacing rhythm / button padding / tutor type scale / focus+error gold | UI/UX polish pass |
| 5,6,7,10 | Low | Gold in interactive states / label tracking / crest sizing / radius | UI/UX polish pass |

## From `reports/audit/ux-flows.md`

| # | Sev | Item | Note |
|---|-----|------|------|
| 5 | High | No confirmation/undo for "End class" | **Closed** — routes through a focus-trapped `confirmEnd` modal |
| 7 | High | Class deletion not handled gracefully in `/session` | **Closed enough** — the live class-doc subscription guards `!snap.exists()` so it never crashes; an explicit "class removed" pupil state is a deferred nicety |
| 1,4,9,10 | Medium | New-class entry ambiguity / dormant-card copy / closing-screen error / class-switch warning | UX polish |
| 2,3,6,8,11,12 | Low | Plan-origin label / post-create feedback / wrap-up edit / join delay / authz redirect copy | UX polish |

## From `reports/audit/features.md`

All ten are *feature opportunities*, not defects — out of scope for B2.
Several are already built (safeguarding badge, step progress, transcript
export, admin allowlist UI). The rest are demo-enhancement ideas.
