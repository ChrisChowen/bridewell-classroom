"use client";

import { useState } from "react";
import { statePill, type EngagementState } from "@/lib/brand";
import type { PupilSummary } from "@/types";

// Class Stream — bespoke realtime visualisation. One horizon ribbon per
// pupil, oldest → newest, the head dot pulsing at "now". Designed to
// scale to ~30 pupils on a 1280px laptop screen.
//
// Sort: attention-required first (wheel_spinning > off_task > disengaged
// > productive_struggle > flowing). This honours the 13 May teacher
// brief: pattern, not alert; visual over notification. The teacher's
// eye lands on the rows that matter without anyone needing to interrupt.

const ATTENTION_RANK: Record<EngagementState, number> = {
  wheel_spinning: 0,
  off_task: 1,
  disengaged: 2,
  productive_struggle: 3,
  flowing: 4,
};

export function ClassStream({
  pupils,
  timeline,
  onSelect,
  selectedId,
}: {
  pupils: PupilSummary[];
  timeline: Record<string, EngagementState[]>;
  onSelect?: (pupilId: string) => void;
  selectedId?: string | null;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const sorted = [...pupils].sort((a, b) => {
    const r = ATTENTION_RANK[a.currentState] - ATTENTION_RANK[b.currentState];
    if (r !== 0) return r;
    return a.displayName.localeCompare(b.displayName);
  });

  const buckets = Math.max(...Object.values(timeline).map((t) => t.length), 1);

  return (
    <div className="bw-card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}
      >
        <span className="bw-section-label">Class stream · last 20 min · sorted by attention</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Sonnet classifier · 50s windows
        </span>
      </div>

      <div style={{ padding: "10px 18px 18px" }}>
        {sorted.map((p, idx) => {
          const states = timeline[p.id] ?? [];
          const isSel = selectedId === p.id;
          const isHover = hover === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(p.id)}
              aria-label={`${p.displayName}, currently ${statePill[p.currentState].label}`}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "160px 1fr 100px",
                alignItems: "center",
                gap: 14,
                padding: "8px 8px",
                background: isSel
                  ? "rgba(181,138,60,0.08)"
                  : isHover
                  ? "rgba(15,26,46,0.025)"
                  : "transparent",
                borderRadius: 6,
                cursor: onSelect ? "pointer" : "default",
                border: "none",
                textAlign: "left",
                transition: "background 120ms ease",
                marginTop: idx === 0 ? 0 : 2,
                animation: `bw-fade-in 220ms ${Math.min(idx * 18, 360)}ms both`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "var(--color-navy-900)",
                    color: "var(--color-cream-50)",
                    fontSize: 9,
                    fontWeight: 600,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {p.initials}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.displayName}
                </span>
              </div>

              <Ribbon states={states} buckets={buckets} current={p.currentState} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: statePill[p.currentState].colour,
                  }}
                />
                <span>{Math.round(p.stateConfidence * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <Legend />
    </div>
  );
}

function Ribbon({
  states,
  buckets,
  current,
}: {
  states: EngagementState[];
  buckets: number;
  current: EngagementState;
}) {
  // Render as inline-SVG strips so we can pulse the head independently and
  // overlay an axis. Strip width adapts to container; using percentages.
  const pad = states.length < buckets ? Array.from({ length: buckets - states.length }, () => current) : [];
  const seq: EngagementState[] = [...pad, ...states];
  const headColour = statePill[current].colour;

  return (
    <div style={{ position: "relative", height: 18 }}>
      {/* Strip */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          borderRadius: 4,
          overflow: "hidden",
          background: "rgba(15,26,46,0.04)",
        }}
      >
        {seq.map((s, i) => (
          <div
            key={i}
            title={statePill[s].label}
            style={{
              flex: 1,
              background: statePill[s].colour,
              opacity: 0.6 + (i / buckets) * 0.4, // older fades, newer is full
            }}
          />
        ))}
      </div>
      {/* Now head */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -3,
          top: "50%",
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: 999,
          background: headColour,
          boxShadow: `0 0 0 3px ${headColour}33`,
          animation: "bw-head-pulse 1800ms ease-in-out infinite",
        }}
      />
    </div>
  );
}

function Legend() {
  const keys: EngagementState[] = ["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 18,
        padding: "12px 18px",
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: 2, background: statePill[k].colour }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{statePill[k].label}</span>
        </div>
      ))}
    </div>
  );
}
