"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { statePill, type EngagementState } from "@/lib/brand";
import type { LivePupil } from "@/lib/firebase/live";

// Shared glide for positional/colour changes on the field — slow enough to
// read as "the class is moving" from across the room, not a snap.
const FIELD_GLIDE = { duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

// The whiteboard / projector centrepiece — "The Field".
//
// Concept: an observatory star-chart of the class. Each pupil is ONE
// nameless point of light, placed on a ruled chart whose vertical axis is
// the lesson's steps. A pupil's star climbs as they progress through the
// lesson; its colour is their engagement state (brand state palette). A
// single luminous gold line marks where the class collectively is (the
// average step) and glides as the room moves. A calm crimson vignette
// appears at one edge if a safeguarding concern has fired — never a flash.
//
// Why this shape (vs. the old filling-flask + glowing-orb): the chart is
// typographic and classical (an observatory register), reads from across
// the room, and shows three things at once — how far the class has come
// (height), how the room feels (colour), and whether they're moving
// together (clustering). It is collective and nameless by construction:
// the teacher's dashboard holds the per-pupil detail; the room sees the
// class as one working body. No game furniture, no XP, no competition.

interface Props {
  pupils: LivePupil[];
  stepCount: number;
}

// Deterministic [0,1] from a pupil id, so each star keeps a stable
// horizontal position across renders (no jitter on every update).
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // unsigned → [0,1)
  return ((h >>> 0) % 100000) / 100000;
}

function isEngaged(p: LivePupil): boolean {
  return p.state === "flowing" || p.state === "productive_struggle";
}

// SVG coordinate system. We render at a fixed viewBox and let it scale to
// fill the projector with preserveAspectRatio.
const VB_W = 1000;
const VB_H = 640;
const PAD_L = 96; // room for step labels
const PAD_R = 150; // room for the "class is here" flag
const PAD_T = 40;
const PAD_B = 48;

export function ClassField({ pupils, stepCount }: Props) {
  const steps = Math.max(1, stepCount);

  const { stars, avgStep, hasConcern, active } = useMemo(() => {
    const now = Date.now();
    const active = pupils.filter((p) => now - (p.lastActive ?? 0) < 90_000).length;
    const hasConcern = pupils.some(
      (p) => p.safeguarding && p.safeguarding.severity !== "low",
    );
    const avgStep =
      pupils.length === 0
        ? 0
        : pupils.reduce((a, p) => a + (p.currentStepIndex ?? 0), 0) / pupils.length;

    const stars = pupils.map((p) => {
      const sx = hash01(p.pupilId || p.displayName || "x");
      const step = Math.min(steps - 1, Math.max(0, p.currentStepIndex ?? 0));
      return {
        id: p.pupilId,
        sx,
        step,
        // small deterministic vertical wobble so stars on the same step
        // don't stack on the exact rule line
        wobble: (hash01((p.pupilId || "") + "y") - 0.5) * 28,
        state: (p.state ?? "disengaged") as EngagementState,
        engaged: isEngaged(p),
        confidence: p.confidence ?? 0.5,
      };
    });
    return { stars, avgStep, hasConcern, active };
  }, [pupils, steps]);

  // Map a (continuous) step value to a y in chart space. Bottom of the
  // chart = step 0 ("just started"), top = final step.
  const innerTop = PAD_T;
  const innerBottom = VB_H - PAD_B;
  const stepToY = (s: number) => {
    if (steps === 1) return (innerTop + innerBottom) / 2;
    const frac = s / (steps - 1); // 0..1
    return innerBottom - frac * (innerBottom - innerTop);
  };
  const xFor = (sx: number) => PAD_L + sx * (VB_W - PAD_L - PAD_R);

  const avgY = stepToY(avgStep);

  return (
    <section
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.55,
          fontWeight: 600,
        }}
      >
        The class · {steps} {steps === 1 ? "step" : "steps"}
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* Calm crimson edge wash if safeguarding fired — no flashing. */}
        {hasConcern && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              background:
                "radial-gradient(ellipse 40% 60% at 100% 0%, rgba(142,42,42,0.18) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
        )}

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: "block", position: "absolute", inset: 0 }}
          role="img"
          aria-label={`The class chart: ${active} pupils active, average position step ${(avgStep + 1).toFixed(1)} of ${steps}.`}
        >
          <defs>
            <radialGradient id="bw-field-vignette" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#bw-field-vignette)" />

          {/* Ruled step lines + labels. Drawn bottom→top. */}
          {Array.from({ length: steps }).map((_, i) => {
            const y = stepToY(i);
            const isFinal = i === steps - 1;
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={VB_W - PAD_R + 40}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth={1}
                  strokeDasharray={isFinal ? "none" : "2 10"}
                />
                <text
                  x={PAD_L - 16}
                  y={y + 5}
                  textAnchor="end"
                  fontSize={16}
                  fill="rgba(255,255,255,0.5)"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {isFinal ? "Finish" : `Step ${i + 1}`}
                </text>
              </g>
            );
          })}

          {/* The collective "class is here" line — the one shared signal.
              Glides to the new average via animated SVG attributes (the old
              `transition: transform` was a no-op — the line moves by its y
              attributes, not a transform). */}
          {pupils.length > 0 && (
            <g>
              <motion.line
                x1={PAD_L}
                x2={VB_W - PAD_R + 40}
                stroke="var(--color-gold-500)"
                strokeWidth={2}
                opacity={0.85}
                initial={false}
                animate={{ y1: avgY, y2: avgY }}
                transition={FIELD_GLIDE}
              />
              <motion.circle
                cx={PAD_L}
                r={4}
                fill="var(--color-gold-500)"
                initial={false}
                animate={{ cy: avgY }}
                transition={FIELD_GLIDE}
              />
              <motion.text
                x={VB_W - PAD_R + 50}
                fontSize={13}
                fill="var(--color-gold-500)"
                initial={false}
                animate={{ y: avgY - 8 }}
                transition={FIELD_GLIDE}
                style={{
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                The class
              </motion.text>
              <motion.text
                x={VB_W - PAD_R + 50}
                fontSize={12}
                fill="rgba(255,255,255,0.55)"
                initial={false}
                animate={{ y: avgY + 12 }}
                transition={FIELD_GLIDE}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                is here
              </motion.text>
            </g>
          )}

          {/* Stars — one per pupil, no names. The star glides up the chart
              when its step advances and cross-fades colour when its state
              changes (both via animated cy/fill); the ambient breathe stays
              on the group transform. */}
          {stars.map((s, i) => {
            const cx = xFor(s.sx);
            const cy = stepToY(s.step) + s.wobble;
            const colour = statePill[s.state]?.colour ?? "rgba(255,255,255,0.6)";
            const r = 7 + s.confidence * 4;
            return (
              <g
                key={s.id || i}
                style={{
                  animation: `bw-star-breathe ${4.5 + (i % 5) * 0.6}s ease-in-out ${(i % 7) * 0.4}s infinite`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transformBox: "fill-box",
                }}
              >
                {/* soft glow */}
                <motion.circle cx={cx} r={r * 2.6} opacity={0.14} initial={false} animate={{ cy, fill: colour }} transition={FIELD_GLIDE} />
                <motion.circle cx={cx} r={r * 1.5} opacity={0.22} initial={false} animate={{ cy, fill: colour }} transition={FIELD_GLIDE} />
                {/* core */}
                <motion.circle cx={cx} r={r} initial={false} animate={{ cy, fill: colour }} transition={FIELD_GLIDE} />
                {/* highlight */}
                <motion.circle r={r * 0.34} fill="rgba(255,255,255,0.7)" initial={false} animate={{ cx: cx - r * 0.3, cy: cy - r * 0.3 }} transition={FIELD_GLIDE} />
              </g>
            );
          })}
        </svg>

        {/* Empty state — calm, with the chart faint behind. */}
        {pupils.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ maxWidth: 360 }}>
              <div
                className="bw-display"
                style={{ fontSize: 26, opacity: 0.9, marginBottom: 8 }}
              >
                Waiting for the class
              </div>
              <div style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.5 }}>
                As pupils join and start working, each appears here as a point of
                light — climbing the chart as the lesson moves.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
