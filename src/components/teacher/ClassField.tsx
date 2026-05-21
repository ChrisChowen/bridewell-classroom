"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LivePupil } from "@/lib/firebase/live";

// The whiteboard view's centrepiece — a Harry-Potter style points
// vessel. The class collects gems together as they make progress
// through the lesson, and the jar fills over time. This is NOT a
// per-pupil dashboard — that's the teacher's own surface. The
// whiteboard is the projector view in the room and shows ONLY
// collective signals: the jar, the class aura, the moments ticker.
//
// Why this shape: the user wanted "gamification done right" — the
// reward is collective, every pupil's contribution lands in the same
// vessel, nobody is named, nobody is targeted. Stretch path: split the
// jar into two/four columns for team competition (left as a prop for
// future iteration).

interface Props {
  pupils: LivePupil[];
  fillRatio: number; // 0..1 — used to draw the gem level
  marbles: number;
  capacity: number;
  stepCount: number;
}

export function ClassField({ pupils, fillRatio, marbles, capacity, stepCount }: Props) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
        gap: 56,
        alignItems: "center",
        minHeight: 0,
      }}
    >
      <Vessel fillRatio={fillRatio} marbles={marbles} capacity={capacity} stepCount={stepCount} />
      <ClassAura pupils={pupils} />
    </section>
  );
}

// --- Vessel -------------------------------------------------------------
//
// SVG apothecary flask with an animated liquid fill. The flask is drawn
// in SVG (not an imported PNG) so the liquid clipping is precise at any
// scale, the lines stay crisp on the projector, and we don't depend on
// a chroma-keyed Imagen asset. Two sin-waves layered on the liquid
// surface give the fill a calm tidal motion; the fill rises smoothly
// when class progress advances. Bubbles rise occasionally for life.
//
// Why fluid over gems: gem stacks read like a poorly-tuned CSS demo at
// the resolutions a projector renders at. A clean wave fill is calmer,
// satisfying, and easier to read from across the room.

function Vessel({
  fillRatio,
  marbles,
  capacity,
  stepCount,
}: {
  fillRatio: number;
  marbles: number;
  capacity: number;
  stepCount: number;
}) {
  const milestone = fillRatio >= 0.75;
  const safeRatio = Math.max(0, Math.min(1, fillRatio));
  // Surface y in the SVG's interior viewBox space (top=0, bottom=380).
  // We never let the surface go fully to the rim — leave 4px of air at
  // the top so the wave doesn't clip against the neck.
  const surfaceY = 16 + (1 - safeRatio) * 360;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.55,
          fontWeight: 600,
          marginBottom: 18,
        }}
      >
        Class progress · {stepCount} {stepCount === 1 ? "step" : "steps"}
      </div>

      {/* Halo behind the flask — soft candlelight backdrop */}
      <div style={{ position: "relative", width: 320, height: 460 }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -40,
            background:
              "radial-gradient(ellipse at 50% 55%, rgba(216,154,47,0.20) 0%, rgba(216,154,47,0.05) 40%, transparent 70%)",
            filter: "blur(4px)",
          }}
        />

        <FluidFlask surfaceY={surfaceY} fillRatio={safeRatio} milestone={milestone} />
      </div>

      <div style={{ marginTop: 18, textAlign: "center" }}>
        <div className="bw-display" style={{ fontSize: 42, lineHeight: 1.0 }}>
          {marbles}
          <span style={{ opacity: 0.4, fontSize: 26 }}> / {capacity || "—"}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, letterSpacing: "0.08em" }}>
          steps reached across the class
        </div>
      </div>
    </div>
  );
}

// SVG flask + animated liquid. Shape: rounded apothecary bottle —
// gentle shoulders narrowing to a short neck, wide belly, flat base
// with chamfered corners. Drawn at 320×460; scales cleanly.
function FluidFlask({
  surfaceY,
  fillRatio,
  milestone,
}: {
  surfaceY: number;
  fillRatio: number;
  milestone: boolean;
}) {
  // Drive the waves via a single animation frame loop. requestAnimationFrame
  // is sub-CSS-keyframe for smoothness on the projector. We only do
  // arithmetic per frame (no React state), updating SVG path attributes
  // directly — cheap.
  const surfaceRef = useRef<SVGPathElement>(null);
  const surface2Ref = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const targetY = useRef(surfaceY);
  const renderedY = useRef(surfaceY);

  useEffect(() => {
    targetY.current = surfaceY;
  }, [surfaceY]);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 16;
      // Ease toward the target surface so the fill rises smoothly
      // rather than jumping when the prop updates.
      renderedY.current += (targetY.current - renderedY.current) * 0.06;

      const y = renderedY.current;
      const a = 6;             // wave amplitude (px)
      const k1 = 0.018;        // wavelength constant for wave 1
      const k2 = 0.026;        // wavelength constant for wave 2
      const s1 = t * 0.0018;   // phase drift wave 1
      const s2 = -t * 0.0024;  // phase drift wave 2 (opposite direction)

      const w1 = buildSurface(y, a, k1, s1);
      const w2 = buildSurface(y, a * 0.55, k2, s2);
      const body = buildFillBody(y, a, k1, s1);

      surfaceRef.current?.setAttribute("d", w1);
      surface2Ref.current?.setAttribute("d", w2);
      fillRef.current?.setAttribute("d", body);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      viewBox="0 0 320 460"
      width={320}
      height={460}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <defs>
        {/* Liquid gradient — gold at the surface, deeper amber at the
            base. Matches the brand without going saturated. */}
        <linearGradient id="bw-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(247, 220, 151, 0.96)" />
          <stop offset="55%" stopColor="rgba(216, 154, 47, 0.92)" />
          <stop offset="100%" stopColor="rgba(160, 105, 24, 0.92)" />
        </linearGradient>
        <linearGradient id="bw-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        {/* Flask interior — clip the liquid to this shape so it can't
            spill past the glass walls. */}
        <clipPath id="bw-flask-interior">
          <path d={FLASK_INTERIOR_PATH} />
        </clipPath>
      </defs>

      {/* Glass back — soft translucent fill to give the flask body */}
      <path
        d={FLASK_INTERIOR_PATH}
        fill="url(#bw-glass)"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={1}
      />

      {/* Liquid, clipped to the interior. Two layered surface waves on
          top of a solid fill body. */}
      <g clipPath="url(#bw-flask-interior)">
        <path ref={fillRef} d="" fill="url(#bw-liquid)" />
        <path ref={surface2Ref} d="" fill="rgba(247, 220, 151, 0.35)" />
        <path ref={surfaceRef} d="" fill="rgba(247, 220, 151, 0.6)" />

        {/* Bubbles — three slow risers, randomised per mount. */}
        <Bubbles fillRatio={fillRatio} />
      </g>

      {/* Glass outline — the thin "wall" of the flask. Drawn last so it
          sits above the liquid. */}
      <path
        d={FLASK_OUTLINE_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      {/* Highlight gleam — a soft vertical streak on the left side of
          the bottle, so it reads as glass under candlelight. */}
      <path
        d="M 64 90 Q 56 220 70 380"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Finish-line tick, just below the neck. Lit when the class is
          at ≥ 75%. */}
      <line
        x1={70}
        x2={250}
        y1={32}
        y2={32}
        stroke={milestone ? "var(--color-gold-500)" : "rgba(255,255,255,0.18)"}
        strokeWidth={milestone ? 2 : 1}
        strokeDasharray="4 6"
      />
      <text
        x={160}
        y={22}
        textAnchor="middle"
        fontSize={9}
        letterSpacing={2.4}
        fill={milestone ? "var(--color-gold-500)" : "rgba(255,255,255,0.45)"}
        style={{ textTransform: "uppercase", fontWeight: 700 }}
      >
        FINISH LINE
      </text>
    </svg>
  );
}

// The interior shape (where liquid can be). Apothecary-bottle:
// flat-ish base at y=420 with chamfered corners, wide belly, gentle
// shoulders at y=80 narrowing to a short neck at y=20.
const FLASK_INTERIOR_PATH =
  "M 110 20 L 210 20 L 210 75 C 210 75 270 95 270 165 L 270 380 C 270 412 248 422 232 422 L 88 422 C 72 422 50 412 50 380 L 50 165 C 50 95 110 75 110 75 Z";
const FLASK_OUTLINE_PATH = FLASK_INTERIOR_PATH;

// Build a wavy surface line at height y, with amplitude a, wavelength
// constant k and phase s. We start at the left edge of the SVG, walk
// across with points, then close down to the bottom of the interior so
// the path can be filled.
function buildSurface(y: number, a: number, k: number, s: number): string {
  const points: string[] = [];
  for (let x = 30; x <= 290; x += 8) {
    const yy = y + Math.sin(x * k + s) * a;
    points.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  // Draw the wave as a thin band 4px thick so the surface has a
  // visible highlight.
  const bottomPoints = points.slice().reverse().map((p) => {
    const [px, py] = p.split(",").map(Number);
    return `${px.toFixed(1)},${(py + 4).toFixed(1)}`;
  });
  return `M ${points.join(" L ")} L ${bottomPoints.join(" L ")} Z`;
}

// Build the fill body — wave on top, descending straight down to the
// flask base, closing into a fillable shape.
function buildFillBody(y: number, a: number, k: number, s: number): string {
  const points: string[] = [];
  for (let x = 30; x <= 290; x += 8) {
    const yy = y + Math.sin(x * k + s) * a;
    points.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  return `M ${points.join(" L ")} L 290,460 L 30,460 Z`;
}

// Slow-rising bubbles. Each bubble loops on a different period; we
// stagger them so they never cluster. The bubble track is offset by
// fillRatio so they only appear once the liquid is high enough to
// support them visually.
function Bubbles({ fillRatio }: { fillRatio: number }) {
  if (fillRatio < 0.08) return null;
  const tops = [380, 405, 360];
  const xs = [110, 175, 220];
  const durations = [5200, 6800, 7600];
  return (
    <>
      {tops.map((bottomY, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={bottomY}
          r={4 + (i % 2) * 2}
          fill="rgba(255,255,255,0.45)"
          style={{
            animation: `bw-bubble-rise ${durations[i]}ms ease-in ${i * 900}ms infinite`,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />
      ))}
    </>
  );
}

// --- Class Aura ---------------------------------------------------------
//
// On the right of the jar. Shows the collective "mood" of the room as
// a single luminous shape that breathes. Colour and intensity follow
// the engagement mix — gold when the class is mostly engaged, warm
// amber when productive struggle dominates, muted slate when the class
// is quiet, dim crimson edge when safeguarding has fired. There are NO
// per-pupil markers here — just one collective body of light.

function ClassAura({ pupils }: { pupils: LivePupil[] }) {
  const summary = useMemo(() => summarise(pupils), [pupils]);
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: 460,
        borderRadius: 16,
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        overflow: "hidden",
      }}
    >
      {/* Centre orb */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "grid",
          placeItems: "center",
          minHeight: 0,
        }}
      >
        <Orb mood={summary.mood} intensity={summary.intensity} hasConcern={summary.hasConcern} />
      </div>

      {/* Class read-out (no names, all collective) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Stat label="In the room" value={summary.totalActive} suffix="active" />
        <Stat label="Working through" value={summary.workingPct} suffix="%" />
        <Stat label="Average step" value={summary.avgStep.toFixed(1)} suffix={`/ ${summary.stepCount || "—"}`} />
      </div>
    </div>
  );
}

function Orb({
  mood,
  intensity,
  hasConcern,
}: {
  mood: "calm" | "warm" | "muted";
  intensity: number;
  hasConcern: boolean;
}) {
  const centre =
    mood === "warm"
      ? "rgba(216,154,47,0.95)"
      : mood === "muted"
      ? "rgba(216,216,221,0.5)"
      : "rgba(245,233,182,0.95)";
  const edge =
    mood === "warm"
      ? "rgba(216,154,47,0.08)"
      : mood === "muted"
      ? "rgba(216,216,221,0.05)"
      : "rgba(247,220,151,0.08)";
  const sz = 280 + intensity * 60;
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: sz,
        height: sz,
        borderRadius: 999,
        background: `radial-gradient(circle at 50% 45%, ${centre} 0%, ${edge} 65%, transparent 75%)`,
        animation: "bw-orb-breathe 6s ease-in-out infinite",
        filter: "blur(0.5px)",
      }}
    >
      {/* Soft inner core that pulses */}
      <div
        style={{
          position: "absolute",
          inset: "30%",
          borderRadius: 999,
          background: `radial-gradient(circle, ${centre} 0%, transparent 70%)`,
          animation: "bw-orb-core 3.5s ease-in-out infinite",
          mixBlendMode: "screen",
        }}
      />
      {/* Subtle crimson ring if safeguarding fired anywhere — calm, no flashing */}
      {hasConcern && (
        <div
          style={{
            position: "absolute",
            inset: "-6%",
            borderRadius: 999,
            border: "1.5px dashed rgba(180,80,80,0.55)",
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 10 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: 0.55,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div className="bw-display" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 13, opacity: 0.55, marginLeft: 6 }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

// --- summary engine -----------------------------------------------------

function summarise(pupils: LivePupil[]) {
  const totalActive = pupils.filter((p) => Date.now() - (p.lastActive ?? 0) < 90_000).length;
  const engaged = pupils.filter(
    (p) => p.state === "flowing" || p.state === "productive_struggle"
  );
  const workingPct = pupils.length === 0 ? 0 : Math.round((engaged.length / pupils.length) * 100);
  const stuck = pupils.filter(
    (p) => p.state === "wheel_spinning" || p.state === "disengaged"
  );
  const avgStep =
    pupils.length === 0
      ? 0
      : pupils.reduce((acc, p) => acc + (p.currentStepIndex ?? 0), 0) / pupils.length;
  const stepCount = pupils.reduce(
    (acc, p) => Math.max(acc, (p.currentStepIndex ?? 0) + 1),
    0
  );
  const hasConcern = pupils.some((p) => p.safeguarding && p.safeguarding.severity !== "low");

  // Mood: warm if engagement >70%, muted if mostly stuck, otherwise calm.
  const mood: "calm" | "warm" | "muted" =
    workingPct >= 70 ? "warm" : stuck.length > engaged.length ? "muted" : "calm";
  const intensity = Math.min(1, workingPct / 100);

  return { totalActive, workingPct, stuck, avgStep, stepCount, mood, intensity, hasConcern };
}
