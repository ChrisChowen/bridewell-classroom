"use client";

import { statePill, type EngagementState } from "@/lib/brand";
import type { PupilSummary } from "@/types";

// State distribution strip — a single horizontal stack showing how the
// class is split right now, with a small five-tile breakout beneath.
// Glanceable. Pattern, not alert. (13 May teacher interviews: visual over
// notification, evidence over instance.)

const ORDER: EngagementState[] = ["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"];

export function StateDistribution({ pupils }: { pupils: PupilSummary[] }) {
  const total = pupils.length || 1;
  const counts: Record<EngagementState, number> = {
    flowing: 0,
    productive_struggle: 0,
    wheel_spinning: 0,
    disengaged: 0,
    off_task: 0,
  };
  pupils.forEach((p) => {
    counts[p.currentState] += 1;
  });

  return (
    <div className="bw-card" style={{ padding: 18 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <span className="bw-section-label">Class state · right now</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {total} pupils · live
        </span>
      </div>

      {/* Stacked bar */}
      <div
        role="img"
        aria-label="Class state distribution stacked bar"
        style={{
          display: "flex",
          height: 10,
          borderRadius: 999,
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        {ORDER.map((s) => {
          const pct = (counts[s] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              title={`${statePill[s].label} · ${counts[s]}`}
              style={{ width: `${pct}%`, background: statePill[s].colour }}
            />
          );
        })}
      </div>

      {/* Tiles — wrap onto 2 rows on narrow viewports rather than crush */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10,
          marginTop: 16,
        }}
      >
        {ORDER.map((s) => (
          <div
            key={s}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--surface)",
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: 999, background: statePill[s].colour }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{statePill[s].label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="bw-display" style={{ fontSize: 22 }}>
                {counts[s]}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {Math.round((counts[s] / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
