// Demo seed data used to make the Phase 0 dashboard and session surfaces
// feel real without yet wiring Firebase. Will be replaced in Phase 1 by
// live Firestore + RTDB reads. Keep narrow and explicit.

import type { PupilSummary } from "@/types";
import type { EngagementState } from "@/lib/brand";

export const demoPupils: PupilSummary[] = [
  { id: "p1", displayName: "Priya Adesina", initials: "PA", currentState: "productive_struggle", stateConfidence: 0.81, reasonConfidenceTrailing: 0.62, scaffoldLast5: 1 },
  { id: "p2", displayName: "Marcus Holt", initials: "MH", currentState: "flowing", stateConfidence: 0.88, reasonConfidenceTrailing: 0.79, scaffoldLast5: 0 },
  { id: "p3", displayName: "Aisha Khan", initials: "AK", currentState: "wheel_spinning", stateConfidence: 0.72, reasonConfidenceTrailing: 0.31, scaffoldLast5: 4 },
  { id: "p4", displayName: "Tom Reeves", initials: "TR", currentState: "wheel_spinning", stateConfidence: 0.69, reasonConfidenceTrailing: 0.28, scaffoldLast5: 5 },
  { id: "p5", displayName: "Saoirse Byrne", initials: "SB", currentState: "flowing", stateConfidence: 0.91, reasonConfidenceTrailing: 0.84, scaffoldLast5: 0 },
  { id: "p6", displayName: "Bertie Lawson", initials: "BL", currentState: "disengaged", stateConfidence: 0.65, scaffoldLast5: 0 },
  { id: "p7", displayName: "Nia Williams", initials: "NW", currentState: "productive_struggle", stateConfidence: 0.77, reasonConfidenceTrailing: 0.58, scaffoldLast5: 2 },
  { id: "p8", displayName: "Ravi Mehta", initials: "RM", currentState: "flowing", stateConfidence: 0.84, reasonConfidenceTrailing: 0.71, scaffoldLast5: 1 },
  { id: "p9", displayName: "Olivia Carr", initials: "OC", currentState: "flowing", stateConfidence: 0.79, reasonConfidenceTrailing: 0.68, scaffoldLast5: 0 },
  { id: "p10", displayName: "Hassan Iqbal", initials: "HI", currentState: "productive_struggle", stateConfidence: 0.74, reasonConfidenceTrailing: 0.55, scaffoldLast5: 2 },
  { id: "p11", displayName: "Mei Lin", initials: "ML", currentState: "flowing", stateConfidence: 0.86, reasonConfidenceTrailing: 0.81, scaffoldLast5: 0 },
  { id: "p12", displayName: "Jacob Pritchard", initials: "JP", currentState: "off_task", stateConfidence: 0.58, scaffoldLast5: 0 },
  { id: "p13", displayName: "Elena Voss", initials: "EV", currentState: "productive_struggle", stateConfidence: 0.71, reasonConfidenceTrailing: 0.49, scaffoldLast5: 2 },
  { id: "p14", displayName: "Daniel Okafor", initials: "DO", currentState: "flowing", stateConfidence: 0.82, reasonConfidenceTrailing: 0.74, scaffoldLast5: 1 },
  { id: "p15", displayName: "Sophie Renton", initials: "SR", currentState: "disengaged", stateConfidence: 0.61, scaffoldLast5: 1 },
  { id: "p16", displayName: "Ahmad Yusuf", initials: "AY", currentState: "flowing", stateConfidence: 0.78, reasonConfidenceTrailing: 0.66, scaffoldLast5: 0 },
];

export const demoLesson = {
  id: "lesson_photo_y8",
  title: "Photosynthesis — what plants actually do with light",
  subject: "Biology",
  className: "Year 8 · Set 2",
  teacher: "Jane Wells",
  school: "KESW" as const,
  criticalConcepts: ["chlorophyll absorbs light", "glucose stores chemical energy"],
  startedMinAgo: 18,
  totalMin: 45,
};

export const demoTutorOpening =
  "Right, let us start where the light starts. When a leaf sits in sunlight, what do you think the leaf is actually doing with that light — taking it in, sending it back, or something else?";

// 24 buckets at 50s each across the 20-minute window. Synthesised so each
// pupil's trajectory ends at the current state per demoPupils. Phase 1
// replaces this with real engagementSnapshots from Firestore.

type Bias = "calm" | "drift" | "stuck" | "spike" | "off";

const tail: Record<string, { from: Bias; to: PupilSummary["currentState"] }> = {
  p1: { from: "calm", to: "productive_struggle" },
  p2: { from: "calm", to: "flowing" },
  p3: { from: "stuck", to: "wheel_spinning" },
  p4: { from: "spike", to: "wheel_spinning" },
  p5: { from: "calm", to: "flowing" },
  p6: { from: "drift", to: "disengaged" },
  p7: { from: "calm", to: "productive_struggle" },
  p8: { from: "calm", to: "flowing" },
  p9: { from: "calm", to: "flowing" },
  p10: { from: "calm", to: "productive_struggle" },
  p11: { from: "calm", to: "flowing" },
  p12: { from: "off", to: "off_task" },
  p13: { from: "calm", to: "productive_struggle" },
  p14: { from: "calm", to: "flowing" },
  p15: { from: "drift", to: "disengaged" },
  p16: { from: "calm", to: "flowing" },
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function biasedSequence(bias: Bias, end: EngagementState, length: number, seed: number): EngagementState[] {
  const rng = seededRandom(seed);
  const out: EngagementState[] = [];
  const middle: EngagementState[] = (() => {
    switch (bias) {
      case "calm":
        return ["flowing", "flowing", "productive_struggle", "flowing"];
      case "drift":
        return ["flowing", "productive_struggle", "disengaged", "disengaged"];
      case "stuck":
        return ["productive_struggle", "productive_struggle", "wheel_spinning", "wheel_spinning"];
      case "spike":
        return ["flowing", "productive_struggle", "wheel_spinning", "wheel_spinning"];
      case "off":
        return ["off_task", "disengaged", "off_task", "off_task"];
    }
  })();
  for (let i = 0; i < length - 2; i++) {
    const pick = middle[Math.floor(rng() * middle.length)] ?? "flowing";
    out.push(pick);
  }
  // Two end-cells lock onto the current state so the head reads true.
  out.push(end, end);
  return out;
}

export const TIMELINE_BUCKETS = 24;
export const TIMELINE_WINDOW_MIN = 20;

export const demoTimeline: Record<string, EngagementState[]> = Object.fromEntries(
  Object.entries(tail).map(([id, t], idx) => [
    id,
    biasedSequence(t.from, t.to, TIMELINE_BUCKETS, idx * 17 + 3),
  ])
);

// Per-pupil Reason confidence trajectory (eight Reason firings across the
// last 20 minutes). 0–1 floats. Real values land in Phase 2.
export const demoReasonTrajectory: Record<string, number[]> = {
  p1: [0.55, 0.6, 0.58, 0.66, 0.6, 0.62, 0.58, 0.62],
  p3: [0.5, 0.45, 0.4, 0.38, 0.34, 0.32, 0.3, 0.31],
  p4: [0.6, 0.55, 0.5, 0.42, 0.36, 0.32, 0.3, 0.28],
  p2: [0.7, 0.74, 0.72, 0.76, 0.78, 0.8, 0.78, 0.79],
  p5: [0.78, 0.8, 0.82, 0.84, 0.83, 0.85, 0.84, 0.84],
};
