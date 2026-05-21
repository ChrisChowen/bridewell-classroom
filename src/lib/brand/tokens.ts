// Bridewell Classroom — design tokens.
// Code-level expression of BRAND.md. Source of truth in the repo for colour,
// type, spacing, the engagement-state palette, and the Reason interaction
// surface treatment. Components import from here; ad-hoc hex values do not
// enter the codebase without an entry here justifying them.

export const colour = {
  // Primary palette (BRAND.md §Colour)
  navy900: "#0D2A4A",
  navy700: "#143B6B",
  gold500: "#B58A3C",
  gold300: "#D4A858",
  cream50: "#FAF6EE",
  white: "#FFFFFF",
  ink900: "#0F1A2E",
  ink700: "#1F2B44",
  ink500: "#5A6478",

  // Line / hairline colours
  lineLight: "rgba(15, 26, 46, 0.12)",
  lineDark: "rgba(181, 138, 60, 0.22)",
  zebraLight: "rgba(15, 26, 46, 0.02)",

  // Reason interaction surface tint (BRAND.md §Reason interaction surface)
  reasonTint: "rgba(181, 138, 60, 0.08)",

  // Crimson is Barrow Hills' secondary accent and the error colour. Sparing.
  crimson: "#8E2A2A",
} as const;

// Engagement states (BRAND.md §State colours).
// Pair every state with an icon and label so colour is never the only signal.
// Lucide icon names are noted here so component code stays consistent.
export const state = {
  flowing: {
    colour: "#3D8FA8", // cyan-teal
    label: "Flowing",
    icon: "circle",
    description: "Pupil is moving.",
  },
  productive_struggle: {
    colour: colour.gold500,
    label: "Productive struggle",
    icon: "loader-2", // spiral / coil
    description: "The work is happening.",
  },
  wheel_spinning: {
    colour: "#D89A2F", // muted amber
    label: "Wheel-spinning",
    icon: "rotate-cw", // recursive arrow
    description: "Needs attention without alarm.",
  },
  disengaged: {
    colour: "#8A8FA3", // cool grey
    label: "Disengaged",
    icon: "circle-dashed",
    description: "Pupil has drifted.",
  },
  off_task: {
    colour: "#4A5670", // darker grey-blue
    label: "Off-task",
    icon: "circle-slash",
    description: "Off the lesson.",
  },
} as const;

export type EngagementState = keyof typeof state;

// Type system (BRAND.md §Typography).
// One classical book serif for display + AI-tutor text; one humanist sans for
// chrome and body; one mono for system labels.
export const font = {
  serif: "var(--font-serif)", // Source Serif 4 — set in app/layout.tsx
  sans: "var(--font-sans)", // Inter — set in app/layout.tsx
  mono: "var(--font-mono)", // JetBrains Mono — set in app/layout.tsx
} as const;

export const typeScale = {
  // Display serif sizes (page titles, brand wordmark, AI tutor text)
  displayLanding: "32px",
  displayDashboard: "24px",

  // UI sans
  body: "16px",
  bodySmall: "15px",
  sectionLabel: "11px", // small-caps, tracked

  // Line height
  bodyLeading: 1.5,
} as const;

// Spacing scale — multiples of 4 with a couple of named values for surfaces
// that the brand brief calls for explicitly.
export const space = {
  px: "1px",
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",

  // Surfaces
  cardRadius: "8px",
  rowPaddingY: "14px", // 12–16px per BRAND.md
} as const;

// Reason interaction surface treatment (BRAND.md §Reason interaction surface).
// Gold accent + left-bordered card + soft gold tint background + "Reason"
// label in gold at the top. Slides in with 200ms ease-out. Not a button —
// an inline moment.
export const reasonSurface = {
  background: colour.reasonTint,
  borderLeft: `3px solid ${colour.gold500}`,
  labelColour: colour.gold500,
  enterMs: 200,
  ease: "ease-out",
} as const;

// State pill variants — colour + icon name + label, ready for the StatePill
// component to consume. Never use colour alone; always pair with the icon
// and the label text (JT's colour-blindness pushback, Checkpoint 1).
export const statePill = {
  flowing: { ...state.flowing, foreground: "#0F1A2E", background: "rgba(61, 143, 168, 0.12)" },
  productive_struggle: { ...state.productive_struggle, foreground: "#0F1A2E", background: "rgba(181, 138, 60, 0.12)" },
  wheel_spinning: { ...state.wheel_spinning, foreground: "#0F1A2E", background: "rgba(216, 154, 47, 0.14)" },
  disengaged: { ...state.disengaged, foreground: "#0F1A2E", background: "rgba(138, 143, 163, 0.14)" },
  off_task: { ...state.off_task, foreground: "#FAF6EE", background: "rgba(74, 86, 112, 0.18)" },
} as const;

export const brand = {
  productName: "Bridewell Classroom",
  ecosystem: "Bridewell AI",
  foundationYear: 1553,
} as const;
