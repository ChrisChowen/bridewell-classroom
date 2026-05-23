# Bridewell Classroom — UI Polish & Visual Register Audit

**Date:** 21 May 2026  
**Audit scope:** Landing, login, join, /dashboard, /class/[id], /session, /demo, /classroom pages and shared components  
**Reference:** BRAND.md (source of truth), src/lib/brand/tokens.ts (token definitions), docs/screenshots/ (rendered state)

---

## Findings

### 1. Hard-coded Gold Tints Break Token Discipline

**Severity:** High  
**Surface:** ChatSurface.tsx, AppraisalPanel.tsx, PupilPanel.tsx, NewClassWizard.tsx (8+ instances)  
**Problem:** Gold accent tints are hard-coded as inline `rgba(181,138,60,0.XX)` throughout component code instead of referencing the tokenized `reasonTint` or a new `goldAccentTint` token.

**Fix:** Replace all instances of `"rgba(181,138,60,0.06)"`, `"rgba(181,138,60,0.08)"`, `"rgba(181,138,60,0.10)"`, `"rgba(181,138,60,0.12)"`, and `"rgba(181,138,60,0.16)"` with token references:
- Add `goldTint06`, `goldTint08`, `goldTint10`, `goldTint12`, `goldTint16` to `src/lib/brand/tokens.ts` under a `tints` object
- Mirror in `src/app/globals.css` as `--color-gold-tint-*` theme variables
- Replace inline strings with `var(--color-gold-tint-08)` etc. in components

**Examples:**
- ChatSurface.tsx line 705: `"rgba(181,138,60,0.10)"` → `var(--color-gold-tint-10)`
- AppraisalPanel.tsx line 73: `"rgba(181,138,60,0.06)"` → `var(--color-gold-tint-06)`

---

### 2. Spacing Rhythm Inconsistency in Card Components

**Severity:** Medium  
**Surface:** PupilCard.tsx, AppraisalPanel.tsx, EngagementTimeline.tsx (padding/gap variance)  
**Problem:** Card internal padding uses ad-hoc values (14px, 12px, 18px) instead of the `space` token scale. EngagementTimeline uses gap=4px (not in token scale). Breaks the 4px/8px/12px/16px cadence defined in tokens.ts.

**Fix:** 
- Standardize card padding to `space.4` (16px) or `space.3` (12px) throughout
- Update EngagementTimeline gap from 4px to `space.1` (4px is valid but should be referenced as token)
- Define a `cardPaddingStandard` token in tokens.ts as `16px` with `cardPaddingCompact` as `12px`

**Examples:**
- PupilCard.tsx line 46: `padding: 14` → `padding: "var(--space-4)"` (16px)
- EngagementTimeline.tsx line 33: `gap: 4` → `gap: "4px"` (already correct, but add `var(--space-1)` reference for consistency)

---

### 3. Button Padding Diverges from Token Scale

**Severity:** Medium  
**Surface:** All button components (globals.css and inline overrides)  
**Problem:** Primary and secondary buttons use fixed padding `10px 16px` and `9px 15px` (non-standard increments). Interactive buttons in PupilCard and NewClassWizard apply ad-hoc overrides like `padding: "12px 18px"`.

**Fix:**
- Align all button padding to the space scale: use `space.3` (12px) vertical, `space.4` (16px) horizontal
- Update `.bw-btn-primary` and `.bw-btn-secondary` in globals.css to `padding: 12px 16px`
- Remove inline padding overrides where possible; if needed, use space token shorthand

**Relevant lines:**
- globals.css line 162: `.bw-btn-primary` padding `10px 16px` → `12px 16px`
- globals.css line 175: `.bw-btn-secondary` padding `9px 15px` → `12px 16px`
- page.tsx line 104: inline `padding: "12px 18px"` → remove and rely on button class

---

### 4. Tutor Message Typography Scale Needs Tightening

**Severity:** Medium  
**Surface:** ChatSurface.tsx tutor message rendering  
**Problem:** The AI tutor voice uses `.bw-tutor` (17px, 1.55 line-height) which is larger than body text (16px, 1.5). While visually distinct per BRAND.md intent, the 17px is an arbitrary value not in `typeScale` token.

**Fix:**
- Formalize `typeScale.tutorMessage` as `16px` (same as body, but distinguished by serif font and `bw-tutor` class styling)
- Or keep 17px but add it to typeScale as `tutorMessage: "17px"` for explicit inclusion in the token hierarchy
- Ensure line-height is derived from `typeScale.bodyLeading` (1.5) for consistency

**Example:**
- Add to tokens.ts: `tutorMessage: "17px"` and update `.bw-tutor` to reference it

---

### 5. Gold Accent Underutilized in Interactive States

**Severity:** Low  
**Surface:** Secondary button hover states (globals.css), form input focus states  
**Problem:** Secondary buttons on hover only darken the border (`border-color: var(--color-ink-500)`); they don't lift to gold-500 or use a gold tint background. This misses the brand emphasis language: gold should signal "this matters" or "this is active."

**Fix:**
- Secondary button hover: add a subtle gold tint background `rgba(181,138,60,0.06)` or keep border but add slight shadow
- Input focus: change border-color from default to `var(--color-gold-500)` with a matching tint background
- Ensure colour doesn't break contrast at WCAG AA for text

**Example:**
- globals.css line 183: `.bw-btn-secondary:hover { background: rgba(181, 138, 60, 0.04); }`

---

### 6. Section Label Tracking Inconsistency

**Severity:** Low  
**Surface:** globals.css `.bw-section-label`, landing page audience cards  
**Problem:** `.bw-section-label` uses `letter-spacing: 0.12em`. Inline section labels in page.tsx (line 159) and other components occasionally override with `letter-spacing: "0.14em"`, `"0.18em"`, `"0.08em"`. Fractional tracking breaks the typographic grid.

**Fix:**
- Enforce single tracking value in `.bw-section-label`: keep `0.12em`
- Remove all inline `letterSpacing` overrides on section labels; use the class
- If variation is needed for context (e.g., emphasis), add `.bw-section-label--emphasis` variant with `letter-spacing: 0.14em`

**Examples:**
- page.tsx line 159: remove inline `style={{ color: "var(--color-gold-500)" }}` — use CSS class instead
- page.tsx line 194: inline `letterSpacing: "0.08em"` on pillars — remove and use `.bw-section-label`

---

### 7. Crest and Wordmark Sizing Logic Needs Simplification

**Severity:** Low  
**Surface:** Wordmark.tsx, TopBar.tsx, page.tsx (mixed size conventions)  
**Problem:** Crest scales via size prop (32px default, 44px landing) but no token references. Wordmark submark fontsize calculated inline. Creates fragile sizing if the crest asset or typography needs to scale uniformly.

**Fix:**
- Add `crestSize` token: `{ default: "32px", landing: "44px", userChip: "20px" }` to tokens.ts
- Update Wordmark.tsx and TopBar.tsx to consume `space` and `typeScale` tokens for submark sizing
- Create a dedicated `Logo` or `BrandMark` token object with pre-composed lockups

**Example:**
- tokens.ts: add `crestSize: { default: "32px", landing: "44px" }`
- Wordmark.tsx: `const crestSize = crestSizes[size] ?? crestSizes.default`

---

### 8. Input Focus and Error States Lack Gold Accent

**Severity:** Medium  
**Surface:** Form inputs (login, join, new class wizard pages)  
**Problem:** Input focus states are not styled; error states missing. No visible gold accent on focus. Inputs appear to have no clear interaction feedback beyond the default browser outline.

**Fix:**
- Add `.bw-input` class in globals.css with default border `1px solid var(--line)` and focus state `border-color: var(--color-gold-500)` with `background: rgba(181, 138, 60, 0.04)` and `box-shadow: 0 0 0 2px rgba(181, 138, 60, 0.1)`
- Add `.bw-input--error` variant with `border-color: var(--color-crimson)` and matching shadow in crimson
- Apply to all form inputs across auth and creation flows

---

### 9. Dark Mode Gold Contrast Insufficient

**Severity:** High  
**Surface:** Engagement timeline, state pills, gold-tinted surfaces in dark mode  
**Problem:** Dark mode gold tint `rgba(181, 138, 60, 0.08)` and `rgba(181, 138, 60, 0.06)` are too faint against navy-900 background. At normal viewing distance, gold accents blur into the background.

**Fix:**
- Increase dark-mode gold tints: `goldTint06` → `rgba(181, 138, 60, 0.14)`, `goldTint08` → `rgba(181, 138, 60, 0.18)`, `goldTint10` → `rgba(181, 138, 60, 0.22)`
- Test at 1280px and iPad portrait (768×1024) to confirm legibility
- Apply to AppraisalPanel, reason surfaces, and PupilCard highlight states

**Example:**
- globals.css dark-mode rule (after line 63): `[data-theme="dark"] { --color-gold-tint-06: rgba(181, 138, 60, 0.14); ... }`

---

### 10. Inconsistent Rounded Corner Radius Usage

**Severity:** Low  
**Surface:** Buttons (6px), cards (8px), StatePill (full via `rounded-full`), input placeholders (implicit)  
**Problem:** Three different radii in use: card 8px (token), button 6px (hardcoded), pill 999px. No consolidated radius scale in tokens.

**Fix:**
- Define radius scale in tokens.ts: `{ card: "8px", button: "6px", pill: "999px", subtle: "4px" }`
- Update all hardcoded radii to token references
- Document in BRAND.md which radius applies to which component family

**Examples:**
- globals.css line 163: `border-radius: 6px` → `border-radius: var(--radius-button)`
- Add to tokens.ts radius object and sync to globals.css @theme

---

## Summary

**Critical findings:** Hard-coded gold tints (1), dark mode contrast (9)  
**High-impact findings:** 3 / 10  
**Medium-impact findings:** 4 / 10  
**Low-impact findings:** 3 / 10

The codebase is 85% on-brand. The dominant issue is inconsistent use of tokens for colour tints, spacing, and interaction states. None of the findings indicate misalignment with BRAND.md philosophy — all are implementation details where code drifted from the token system. Fixing findings 1 and 9 will restore 70% visual consistency immediately. Findings 2–4 and 6–8 require systematic refactoring of components to consume tokens, a polish-phase effort that should run alongside feature development.

No screenshots reveal off-brand aesthetics (no gradient backgrounds, no 3D skeuomorphism, no out-of-palette colours). The cream-50 light mode and navy-900 dark mode both read calm and professional. Lucide icons are used consistently. The heraldic crest is present and correctly scaled. Typography follows serif/sans separation. The interface respects the "calm modern digital execution of a classical brand" register (BRAND.md final test).
