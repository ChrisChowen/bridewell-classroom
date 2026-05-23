// Shared helpers for the teacher engagement visualisations (PupilCard,
// EngagementLane, the drill panel). Kept here so the card and the lane share
// one trajectory model rather than each rolling their own.

import type { EngagementState } from "@/lib/brand";

// Engagement as a 0–4 ordinal: the y-axis of every trajectory chart MEANS
// "how engaged", floor (off-task) to ceiling (flowing). This is what lets the
// line read as climbing/slipping rather than as an arbitrary category strip.
export const STATE_Y: Record<EngagementState, number> = {
  off_task: 0,
  disengaged: 1,
  wheel_spinning: 2,
  productive_struggle: 3,
  flowing: 4,
};

export type TrajectoryPoint = { state: EngagementState; t: number; confidence: number };

// Render arbitrary classifier cue tags as plain English for a non-technical
// teacher: "revises_mid_thought" → "Revises mid thought". Robust for any tag
// the model emits — no fixed lookup that silently breaks on a new one.
export function humaniseCue(tag: string): string {
  const t = tag.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

// A short, warm description of where a pupil's engagement is heading, derived
// from the slope of the recent trajectory. Plain words a teacher reads at a
// glance — never a number or a jargon state name.
export function trendWord(
  trajectory: TrajectoryPoint[]
): { label: string; direction: "up" | "down" | "flat" | "new" } {
  const pts = trajectory.filter(Boolean);
  if (pts.length === 0) return { label: "just starting", direction: "new" };
  if (pts.length === 1) return { label: "settling in", direction: "new" };

  // Compare the average of the most recent half against the earlier half so a
  // single noisy reading doesn't flip the word.
  const ys = pts.map((p) => STATE_Y[p.state]);
  const mid = Math.max(1, Math.floor(ys.length / 2));
  const earlier = ys.slice(0, ys.length - mid);
  const recent = ys.slice(ys.length - mid);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = avg(recent) - (earlier.length ? avg(earlier) : avg(recent));

  if (delta >= 0.6) return { label: "climbing", direction: "up" };
  if (delta <= -0.6) return { label: "slipping", direction: "down" };
  return { label: "steady", direction: "flat" };
}

// Build the SVG geometry for an engagement trajectory inside a w×h box. The
// line rides the 0–4 engagement scale (top = flowing). Returns the line path,
// a filled-area path beneath it, and per-point coords carrying their state so
// each node can take its own state colour.
export function buildEngagementPath(
  trajectory: TrajectoryPoint[],
  w: number,
  h: number,
  pad = 4
): {
  line: string;
  area: string;
  points: Array<{ x: number; y: number; state: EngagementState }>;
} | null {
  const pts = trajectory.filter(Boolean);
  if (pts.length === 0) return null;
  const n = pts.length;
  const stepX = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  const points = pts.map((entry, i) => ({
    x: pad + (n > 1 ? i * stepX : (w - pad * 2) / 2),
    y: pad + (4 - STATE_Y[entry.state]) * ((h - pad * 2) / 4),
    state: entry.state,
  }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const area = `${line} L ${last.x.toFixed(1)} ${h} L ${first.x.toFixed(1)} ${h} Z`;
  return { line, area, points };
}

// Human-readable "time since" — "just now", "45s", "12m", "3h".
export function humanAge(ms: number): string {
  if (!ms || ms < 0 || ms < 5000) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

// Two-letter initials from a display name.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}
