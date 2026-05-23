"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus, Sparkle } from "lucide-react";
import { statePill, type EngagementState } from "@/lib/brand";
import {
  buildEngagementPath,
  trendWord,
  type TrajectoryPoint,
} from "@/lib/teacher-viz";

// The bespoke per-pupil engagement chart — the load-bearing answer to "is this
// pupil struggling?". Unlike a generic sparkline, the y-axis MEANS engagement:
// the floor band is "needs a look" (off-task / disengaged / wheel-spinning),
// the ceiling band is "working well" (productive struggle / flowing). A pupil
// whose line sits low and falls reads as struggling at a glance, across the
// room; one whose line rides high reads as flowing. The head pulses at "now"
// and a plain-English trend word names the direction.

const W = 220;
const H = 60;
const PAD = 5;
const GLIDE = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

export function EngagementLane({
  trajectory,
  state,
  trend = true,
}: {
  trajectory: TrajectoryPoint[];
  state: EngagementState;
  trend?: boolean;
}) {
  const path = useMemo(() => buildEngagementPath(trajectory, W, H, PAD), [trajectory]);
  const word = useMemo(() => trendWord(trajectory), [trajectory]);
  const colour = statePill[state]?.colour ?? "var(--text-muted)";

  // y of the floor/ceiling band edges, in the same scale buildEngagementPath uses.
  const bandH = (H - PAD * 2) / 4;
  const ceilingBottom = PAD + bandH; // top band: flowing (4) down to productive (3)
  const floorTop = PAD + bandH * 3; // bottom band: wheel-spinning (2) down to off-task (0)

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
        role="img"
        aria-label={
          path
            ? `Engagement trajectory — currently ${statePill[state].label.toLowerCase()}, ${word.label}`
            : "No engagement reading yet"
        }
      >
        {/* Reference bands — faint, give the line a meaning without RAG colour.
            Top = working well, bottom = needs a look. */}
        <rect x="0" y={PAD} width={W} height={ceilingBottom - PAD} fill="var(--color-state-flowing)" opacity={0.05} />
        <rect x="0" y={floorTop} width={W} height={H - PAD - floorTop} fill="var(--color-state-wheel)" opacity={0.05} />
        {/* mid hairline */}
        <line x1="0" x2={W} y1={PAD + bandH * 2} y2={PAD + bandH * 2} stroke="var(--line)" strokeWidth="0.5" opacity="0.5" />

        {path ? (
          <>
            <motion.path
              initial={false}
              animate={{ d: path.area, fill: colour }}
              opacity={0.16}
              transition={GLIDE}
            />
            <motion.path
              initial={false}
              animate={{ d: path.line, stroke: colour }}
              strokeWidth={1.75}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              transition={GLIDE}
            />
            {path.points.map((p, i) => {
              const isHead = i === path.points.length - 1;
              return isHead ? (
                <g key="head">
                  {/* pulsing halo at "now" */}
                  <circle cx={p.x} cy={p.y} r={3.2} fill={statePill[p.state].colour} opacity={0.25}>
                    <animate attributeName="r" values="3.2;7;3.2" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <motion.circle
                    initial={false}
                    animate={{ cx: p.x, cy: p.y, fill: statePill[p.state].colour }}
                    r={3}
                    transition={GLIDE}
                  />
                </g>
              ) : (
                <motion.circle
                  key={i}
                  initial={false}
                  animate={{ cx: p.x, cy: p.y, fill: statePill[p.state].colour }}
                  r={1.6}
                  opacity={0.85}
                  transition={GLIDE}
                />
              );
            })}
          </>
        ) : (
          <text
            x={W / 2}
            y={H / 2 + 4}
            textAnchor="middle"
            fontSize="11"
            fill="var(--text-muted)"
            fontFamily="var(--font-sans)"
          >
            Reading engagement…
          </text>
        )}
      </svg>

      {trend && (
        <div
          className="flex items-center gap-1"
          style={{ fontSize: 11, color: "var(--text-muted)" }}
        >
          <TrendGlyph direction={word.direction} />
          <span style={{ fontWeight: 500, color: trendColour(word.direction) }}>{word.label}</span>
        </div>
      )}
    </div>
  );
}

function TrendGlyph({ direction }: { direction: "up" | "down" | "flat" | "new" }) {
  const c = trendColour(direction);
  if (direction === "up") return <TrendingUp size={12} color={c} aria-hidden />;
  if (direction === "down") return <TrendingDown size={12} color={c} aria-hidden />;
  if (direction === "new") return <Sparkle size={11} color={c} aria-hidden />;
  return <Minus size={12} color={c} aria-hidden />;
}

// Direction colour stays inside the brand: gold for the positive read, the
// muted wheel-spinning amber for a slip, neutral otherwise. Never RAG green/red.
function trendColour(direction: "up" | "down" | "flat" | "new"): string {
  if (direction === "up") return "var(--color-state-flowing)";
  if (direction === "down") return "var(--color-state-wheel)";
  return "var(--text-muted)";
}
