# UI/UX polish pass

Working notes for the visual-quality pass (goal P0). Within `BRAND.md` —
calm classical register, navy/gold/crest/book-serif. Crest + motifs stay.

## Done this pass

### Gold-tint token discipline (closes ui-polish audit High #1 + #9)

**Finding (audit ui-polish #1):** ~50 components hard-coded
`rgba(181,138,60,0.0x)` gold tints instead of using brand tokens — and
**(audit #9)** those literals don't change in dark mode, so gold surfaces
were under-contrast on the dark teacher theme.

**Fix:** `globals.css` already defines dark-mode-aware tint tokens
(`--color-gold-tint-1/2/3`), so the soft-tint hard-codes were routed through
them. Verified live in the preview:

| token | light (was hard-coded) | dark (now correct) |
|-------|------------------------|--------------------|
| `--color-gold-tint-1` | `rgba(181,138,60,0.06)` | `rgba(181,138,60,0.14)` |
| `--color-gold-tint-2` | `rgba(181,138,60,0.10)` | `rgba(181,138,60,0.20)` |
| `--color-gold-tint-3` | `rgba(181,138,60,0.14)` | `rgba(181,138,60,0.28)` |

Light mode is **byte-identical** (the token resolves to the same value it
replaced) so there is zero light-mode visual risk; dark mode gains the
intended contrast. Confirmed by reading the computed values in both themes
and a dark-mode render of `/login`.

**Caught + fixed in the same pass:** starting the dev server surfaced a real
routing conflict — the new research-export route had been created under
`api/classes/[classId]` while the existing routes use `api/classes/[id]`
(Next refuses two slug names at one path level). `next build` did NOT flag
it, but `next dev` did. Moved to `[id]/research-export`. (Lesson: a green
`next build` is not sufficient for route-segment validation — boot the dev
server.)

### Accessibility sweep — axe-core gate (done, gating CI)

Added `@playwright/test` + `@axe-core/playwright` and `e2e/a11y.spec.ts`,
scanning the auth-free pages (landing / login / join) in **light + dark** and
failing on any serious/critical violation. Wired into a dedicated CI job
(`a11y` in `ci.yml`). The sweep caught **3 real WCAG AA contrast failures**,
all now fixed and verified (6/6 axe checks green):

1. **Footer fine-print** — `opacity:0.75` composited the muted text below AA on
   the page surface; removed it and used the theme-aware `--text-muted`.
2. **Small gold text** (section labels, "You"/"Tutor" tags) — brand gold
   `#b58a3c` is only 2.9:1 on cream. New `--color-gold-text` token: a deeper
   gold clearing 4.5:1 on cream/white **and** the gold-tint surfaces
   (dark theme → gold-300 on navy). 34 text usages routed through it; the
   brand mark / fills / icons keep `--color-gold-500` (BRAND untouched).
3. **Gold text on gold-tint bubbles** — deepened `--color-gold-text` from
   `#8a6a2e` to `#7d5f24` so it clears AA even on the ~8%-gold tint.

Authed-page a11y (session / dashboard / drill-down / projector) needs the
emulator seeded — deferred with the full demo-flow specs (`reports/blocked.md`).

### Responsive pass — public + pupil surfaces at mobile (done, verified)

Checked landing / login / join / session at 375×812 (mobile) in the preview:
**no horizontal overflow on any** (scrollWidth == clientWidth); the pupil chat
fits the viewport with internal scroll + pinned composer. One real
"reads-amateur" issue found + fixed: the **session topbar was overcrowded on
phones** (wordmark + "Classroom" label + "Switch class" + user chip colliding).
Hid the decorative "Classroom" sub-label and the "Switch class" link via
`bw-hide-sm` (≤640px) — verified the topbar declutters at mobile and the items
reappear at desktop (978px), no overflow either way.

## Remaining (prioritised for a focused, live-verified pass)

These need a running app + visual judgement and `@axe-core/playwright` on the
e2e pages; left for a dedicated pass rather than shipped unverified.

1. **Higher-alpha gold literals** (0.08 / 0.12 / 0.13 / 0.18–0.55) — accent
   strokes, gradients, hover states. Either add a small extended tint scale
   (`-4`, `-5`) or map to the nearest token; each needs an eyeball in dark
   mode (some are borders, not fills, where the contrast maths differs).
2. **Spacing rhythm** (ui-polish #2) + **button padding** (#3) — normalise to
   the brand spacing scale; several cards/buttons drift from the token grid.
3. **Tutor message type scale** (#4) — tighten line-height/measure on long
   coach turns.
4. **Focus + error states** (#8) — give inputs a gold focus ring and a
   consistent crimson error treatment (currently ad-hoc per surface).
5. **Integrated a11y sweep** — run `@axe-core/playwright` across the pupil
   session, teacher dashboard, class drill-down, and projector; fix contrast
   / label / landmark findings inline.
6. **Responsive** — iPad 1024×768 landscape (the pilot device) + a narrow
   phone pass on the pupil surfaces; check the class-header control row
   wraps cleanly now that it carries Whiteboard / Research-export / join
   controls.

## Verification method (for the remaining pass)

Per the goal: claude-in-chrome / preview walkthrough of the demo flow +
`@axe-core/playwright` on the e2e pages; iterate until the next change
wouldn't move the "first-class vs prototype" judgement. Screenshot before/
after each surface in both themes.
