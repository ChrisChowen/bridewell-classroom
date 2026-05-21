"use client";

import Image from "next/image";
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
// The illustrated jar is one static image (generated via Imagen,
// chroma-keyed to transparent). The gems are HTML elements positioned
// inside the jar's interior and animated in with a falling motion when
// the fill increases. We keep the gems in DOM rather than re-rendering
// the image so each "+1 gem" event reads as motion, not a refresh.

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
  // We render up to 60 visible gems; past that the jar reads as full
  // and the human eye loses count.
  const visibleGems = Math.min(60, Math.round(fillRatio * 60));
  const previous = useRef(visibleGems);
  useEffect(() => {
    previous.current = visibleGems;
  }, [visibleGems]);
  const milestone = fillRatio >= 0.75;

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

      {/* Vessel container — illustrated jar + animated gems layered inside */}
      <div
        style={{
          position: "relative",
          width: 360,
          height: 480,
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* Soft warm halo behind the jar — looks lit by candlelight */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -40,
            background:
              "radial-gradient(ellipse at 50% 55%, rgba(216,154,47,0.18) 0%, rgba(216,154,47,0.06) 35%, transparent 65%)",
            filter: "blur(6px)",
          }}
        />

        {/* The illustrated jar (heraldic flat illustration) */}
        <Image
          src="/img/points-jar-empty.png"
          alt=""
          aria-hidden
          width={360}
          height={480}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
          priority
        />

        {/* Interior — the gems live in here, clipped to the jar's belly */}
        <div
          style={{
            position: "absolute",
            // Interior coordinates tuned to the Imagen jar — the
            // hourglass-shaped interior sits roughly between y 70 and
            // y 380, narrowing slightly at the centre.
            top: 70,
            left: 90,
            width: 180,
            height: 310,
            overflow: "hidden",
            clipPath:
              "polygon(8% 0%, 92% 0%, 78% 50%, 78% 50%, 100% 100%, 0% 100%, 22% 50%, 22% 50%)",
            pointerEvents: "none",
          }}
          aria-hidden
        >
          {/* Warm liquid behind the gems — soft fill at the base */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${Math.max(2, fillRatio * 100)}%`,
              background:
                "linear-gradient(to top, rgba(216,154,47,0.45) 0%, rgba(216,154,47,0.18) 70%, rgba(216,154,47,0) 100%)",
              transition: "height 1200ms cubic-bezier(0.2, 0.9, 0.2, 1)",
              borderRadius: "0 0 6px 6px",
            }}
          />
          {/* Gems */}
          {gemPositions(visibleGems).map((g, i) => (
            <Gem key={i} {...g} delay={i * 35} />
          ))}
        </div>

        {/* Milestone label appears at 75% — calm, never strobing */}
        {milestone && (
          <div
            style={{
              position: "absolute",
              top: 92,
              left: 0,
              right: 0,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.32em",
                color: "var(--color-gold-500)",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Finish line
            </div>
          </div>
        )}
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

// A single gem — rendered with layered radial-gradients so each one
// reads as a faceted bead, not a flat circle. Falls in from the top
// with a small bounce.
function Gem({
  x,
  y,
  size,
  hue,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  hue: "gold" | "navy";
  delay: number;
}) {
  // Two colour variants so the jar isn't monotone — gold dominates, a
  // few navy gems mix in for visual rhythm.
  const goldFill =
    "radial-gradient(circle at 30% 25%, #f7dc97 0%, #d89a2f 38%, #8a5e1c 88%)";
  const navyFill =
    "radial-gradient(circle at 30% 25%, #3d6a9e 0%, #163666 45%, #0a1d3a 90%)";
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: 999,
        background: hue === "gold" ? goldFill : navyFill,
        boxShadow:
          "inset -2px -3px 4px rgba(0,0,0,0.35), inset 2px 2px 3px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.25)",
        animation: "bw-gem-drop 700ms cubic-bezier(0.2, 0.9, 0.2, 1) both",
        animationDelay: `${delay}ms`,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

// Lay out the gems from the bottom of the jar's belly upward. We pack
// them by row inside the interior box, with a small alternating offset
// so the pile reads like settled beads. Hue alternates so navy gems
// occur every ~6 gems for visual rhythm.
function gemPositions(n: number): Array<{
  x: number;
  y: number;
  size: number;
  hue: "gold" | "navy";
}> {
  const cols = 8;
  const rowH = 11; // % of container height per row
  const colW = 100 / (cols + 1); // % per column
  const out: Array<{ x: number; y: number; size: number; hue: "gold" | "navy" }> = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const offset = row % 2 === 0 ? 0 : colW / 2;
    const x = colW + col * colW + offset;
    const y = 100 - row * rowH - rowH / 2;
    const size = 16 + (i % 3) * 2;
    out.push({
      x,
      y,
      size,
      hue: i % 6 === 0 ? "navy" : "gold",
    });
  }
  return out;
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
