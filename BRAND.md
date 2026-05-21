# Bridewell Classroom - Brand and visual identity

**Status:** working brand brief, v1, 21 May 2026.
**Source of truth:** the public Bridewell visual identity as it actually exists on KESW, Barrow Hills, and the Bridewell AI announcement, plus the Bridewell Royal Hospital heritage page. This is not a guess. Match it.
**Reference URLs to look at before writing any UI:**

- King Edward's Witley (a Bridewell School): https://www.kesw.org/
- Barrow Hills (a Bridewell School): https://www.barrowhills.org/
- Bridewell - Our Living Heritage (KESW page on the foundation): https://www.kesw.org/about-our-school/bridewell-our-living-heritage/
- Bridewell AI announcement (the existing AI product this tool sits alongside): https://www.kesw.org/2025/04/23/bridewell-ai-future-proofing-every-pupils-education/
- Bridewell Connect (alumni network using the foundation brand): https://bridewellconnect.org.uk/

## Identity in one paragraph

Bridewell Royal Hospital is a 1553 foundation. King Edward's Witley, Barrow Hills, and Longacre are its three schools. Bridewell AI is the Unified Projects-built AI tutor already in production across them. The visual identity across the entire group is grounded, classical, navy-and-gold with a crest as the primary mark. The register is dignified rather than ornamental. The product brand for this tool is "Bridewell Classroom"; it sits inside the Bridewell AI ecosystem and should feel like a sibling artefact, not a third-party tool.

## Brand hierarchy (this is the most important rule)

**Bridewell is primary. The school is configuration.**

The Bridewell mark sits in the top-left of every product surface. The product wordmark is "Bridewell Classroom" (or "Bridewell AI - Classroom" if positioning as a Bridewell AI module is preferred; check with Chris). The school the signed-in teacher belongs to appears only in the user chip in the top-right, with the school's small monogram and name, alongside the teacher's name and avatar initials.

Boss's prototype got this wrong: "King Edward's Witley" was the eyebrow and the Bridewell crest was second. That makes the product look like a King Edward's tool that Bridewell co-stamped. The correct hierarchy is the inverse.

## Colour

**Primary palette:**

- `--navy-900`: `#0D2A4A` deep royal navy, the dominant brand colour. Use for header bars, primary CTAs, and the dark surfaces.
- `--navy-700`: `#143B6B` slightly lifted, for secondary surfaces and hover states.
- `--gold-500`: `#B58A3C` warm Bridewell gold, the accent. Used for the crest detail, for emphasis, for the Reason interaction surfaces, for high-attention states.
- `--gold-300`: `#D4A858` lighter gold for hover states on the accent.
- `--cream-50`: `#FAF6EE` very soft cream, the light-mode background. Not parchment. Calmer than off-white, warmer than pure white.
- `--white`: `#FFFFFF`.
- `--ink-900`: `#0F1A2E` near-black for body text on light surfaces.
- `--ink-700`: `#1F2B44` for secondary body text.
- `--ink-500`: `#5A6478` for muted text.

**State colours:** do not use red/green for status meaning. JT raised colour-blindness at Checkpoint 1 explicitly. Pair colour with icons and labels.

- `--state-flowing`: a calm cyan-teal, `#3D8FA8`, with a circle icon
- `--state-productive`: gold, `#B58A3C`, with a spiral icon
- `--state-wheel-spinning`: a muted amber, `#D89A2F`, with a recursive arrow icon
- `--state-disengaged`: cool grey, `#8A8FA3`, with a dim circle icon
- `--state-off-task`: a darker grey-blue, `#4A5670`, with a dashed circle icon

The state palette is intentionally not "red/amber/green". The team's literature talks about productive struggle as a positive state; representing it in amber communicates the wrong thing. Gold for productive struggle says "this is the work happening". Cyan-teal for flowing says "this pupil is moving". Muted amber for wheel-spinning says "needs attention without alarm".

**Crimson** belongs to Barrow Hills specifically (their secondary accent) and to errors. Use sparingly. Not a primary brand colour.

**Dark mode**: invert the surfaces, keep the navy primary, lift the gold slightly for contrast. Dark mode is for teacher use in dim rooms (lessons run from 9am into late afternoon); it is not the default register.

## Typography

**Display serif (for the brand mark, page titles, and AI tutor text only):** a classical book serif. Recommended free options that fit the Bridewell register: Source Serif 4 (Adobe, free), IBM Plex Serif (free), or EB Garamond (free). Pick one and commit. Do not pair multiple serifs. Avoid editorial display serifs like Fraunces or Instrument Serif at headline sizes; they read as marketing pages, not as a teacher tool.

**UI sans (for all chrome, nav, body, dashboard labels):** a humanist sans. Recommended free options: Inter, IBM Plex Sans, or Source Sans 4. Inter is the safest default and pairs cleanly with any of the recommended serifs.

**Mono (for system labels, kbd shortcuts, code-shaped text only):** JetBrains Mono or IBM Plex Mono.

**Type rules:**

- Page titles use the display serif, at restrained sizes (24px on dashboard, 32px on landing). Not in italic. The serif italic is for emphasis quotes only.
- The Bridewell wordmark uses the display serif. "Bridewell" in roman, "Classroom" in roman, kerned tightly. Optionally, "Bridewell" in roman and "Classroom" in a tracked small-caps treatment underneath in the sans.
- Body text in the sans, at 15-16px, line height 1.5.
- Section labels in the sans, in small caps, tracked, at 11px (the "RECENT POSTS" / "ANALYSIS" pattern that KESW and Boss's prototype both use).
- Italics: reserved for emphasis quotes (the KESW pattern: "we remain proud to be changing lives"). Do not italicise UI titles, do not use cursive script anywhere, do not use italic for decoration.

## The crest

The Bridewell crest is the primary brand mark. It is a small, refined heraldic shield mark (the historic Bridewell Royal Hospital arms; not to be confused with the KESW crest or the Barrow Hills sapling crest). It sits in the top-left of every surface at small size (32-40px tall).

The crest should be authored as an inline SVG so it crisp-scales. If a clean Bridewell Royal Hospital arms reference cannot be sourced, fall back to a simple shield silhouette in navy with the gold accent, as a placeholder until a real crest asset is provided.

School-specific crests (KESW, Barrow Hills, Longacre) appear only in the user chip in the top-right at 16-20px, alongside the teacher's name and role. They never compete with the Bridewell mark for hierarchy.

## Iconography

Lucide-react is the icon set. Restrained, geometric, line-based, scales cleanly with the type. No emoji, no flat-colour illustration, no decorative flourishes in icons. The single decorative flourish allowed is the fleur-de-lis as an occasional section marker (the KESW pattern; gold colour, used sparingly, at 16-20px).

## Photography and imagery

Avoid stock photos. If imagery is needed (landing surfaces, success states), prefer photography of real-feeling classroom moments. The KESW and Barrow Hills sites use this pattern (students in lab coats, scholars on Bridewell Day). Do not generate AI imagery; use placeholders that can be swapped for real photography during a polish pass.

## Voice and tone

Direct, calm, warm. Address teachers as professionals. Address students at a Year 7-9 reading level (the brief target is ages 11-13, extending to KS4). No exclamation points in the AI tutor's voice except in pupil-celebrating moments. No "buddy" framing. No fake informality. The Bridewell AI is described as "a personal teaching assistant" on KESW's own page; that register holds across this tool.

## Surfaces and patterns

**Cards** use the cream-50 background in light mode, navy-700 in dark mode, with a 1px border in the line colour (`rgba(15, 26, 46, 0.12)` light, `rgba(181, 138, 60, 0.22)` dark). Rounded 8px corners.

**Buttons** are flat with a 1px border in line colour for secondary, navy-900 fill with cream text for primary, gold-500 fill with navy text for emphasis (used for the Reason interaction trigger only).

**Tables and rows** use generous vertical padding (12-16px per row). Zebra striping at very low contrast (`rgba(15, 26, 46, 0.02)` on light).

**Charts** use the state palette consistently. Engagement timelines use the state colours per cell, not red/amber/green. Trajectories use the state palette as line colours, with the line returning to the state of the most recent classification.

**The Reason interaction surface** uses the gold accent and a left-bordered card pattern. Distinguishes itself from regular chat by a soft gold tint background (`rgba(181, 138, 60, 0.08)`) and a "Reason" label in gold at the top. Slides in with a 200ms ease-out animation. Not a button; an inline moment.

**Section markers** can use a small gold fleur-de-lis at 16px before the section heading, sparingly. Pattern borrowed directly from the KESW Bridewell heritage page; appropriate for the brand foundation.

## Things that are NOT Bridewell (do not do)

- Parchment textures, paper textures, watermark backgrounds.
- Editorial display serifs at headline sizes (Fraunces, Instrument Serif, Playfair). These belong on a magazine.
- Italic cursive in dashboard titles ("Good afternoon, Jane."). Reserve italic for emphasis quotes only.
- Crimson as a primary colour. Crimson is Barrow Hills' secondary accent; not the brand foundation.
- Pixel-art typography or pixel sprites. Game language; not for the classroom tool.
- Hand-written / brush / cursive fonts anywhere.
- Heraldic ornamentation beyond the crest and the occasional fleur-de-lis. No banners, no scrolls, no Latin mottos in display type.
- Glassmorphism, neumorphism, gradient backgrounds, animated noise, parallax decoration.
- Purple, magenta, hot pink, lime green. Out of palette.
- Skeuomorphic chrome (3D buttons, embossed labels, drop shadows beyond a single soft shadow on cards).

## Things to emulate (calm modern digital execution of a classical brand)

The aesthetic reference is "Linear and Anthropic-quality restraint, applied inside the Bridewell colour and type system". Not "a private school website made interactive". Not "a corporate enterprise dashboard". Specifically:

- Linear's information density and hover affordance discipline.
- Anthropic's typographic restraint and warm neutral palette.
- Notion's calm content surfaces.
- Apple's HIG-style use of the system bar and live status surfaces.

The combination yields: a serious modern teacher tool that feels native to Bridewell because of its palette, type, and brand hierarchy, but reads as digital software rather than as an heirloom object.

## What this rules out at the layout level

- No hero photography on the dashboard.
- No marketing-style three-column "Why Bridewell" sections.
- No animated landing transitions on internal surfaces.
- No award badges, no kerned LATIN INSCRIPTIONS, no fleur-de-lis wallpaper.
- No mood-board moments. Every pixel earns its place by serving the teacher's task.

## Final test for any surface

Before shipping any view, ask: would a teacher at Kingswood (KESW) recognise this as the same family of products as their existing Bridewell AI access, while also understanding that the heritage register has been brought into a modern teaching tool that respects their professional time? If yes, the surface is on-brand. If it reads as "private school cosplay" or "generic SaaS dashboard", iterate.
