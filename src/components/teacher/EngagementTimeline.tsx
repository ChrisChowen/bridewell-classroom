"use client";

import { statePill } from "@/lib/brand";
import type { PupilSummary } from "@/types";
import type { EngagementState } from "@/lib/brand";

// Placeholder engagement timeline. Each row is one pupil; each cell is one
// 5-minute classification window from oldest → newest. Phase 0 reads the
// demo seed; Phase 1 swaps in Firestore engagement snapshots.

export function EngagementTimeline({
  pupils,
  timeline,
  buckets = 4,
}: {
  pupils: PupilSummary[];
  timeline: Record<string, EngagementState[]>;
  buckets?: number;
}) {
  return (
    <div className="bw-card" style={{ padding: 18 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <span className="bw-section-label">Engagement timeline · last 20 min</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Sonnet classification, 5-minute windows
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `140px repeat(${buckets}, 1fr)`,
          gap: 4,
          alignItems: "center",
        }}
      >
        {/* Header row */}
        <span aria-hidden />
        {Array.from({ length: buckets }, (_, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            t{i - buckets + 1 === 0 ? "0" : `${i - buckets + 1}`}
          </span>
        ))}

        {pupils.map((p) => (
          <Row key={p.id} pupil={p} states={timeline[p.id] ?? []} buckets={buckets} />
        ))}
      </div>

      <Legend />
    </div>
  );
}

function Row({
  pupil,
  states,
  buckets,
}: {
  pupil: PupilSummary;
  states: EngagementState[];
  buckets: number;
}) {
  const cells: EngagementState[] = Array.from({ length: buckets }, (_, i) => states[i] ?? pupil.currentState);
  return (
    <>
      <span style={{ fontSize: 13 }}>{pupil.displayName}</span>
      {cells.map((s, i) => (
        <div
          key={i}
          title={statePill[s].label}
          aria-label={statePill[s].label}
          style={{
            height: 22,
            borderRadius: 4,
            background: statePill[s].colour,
            opacity: 0.92,
          }}
        />
      ))}
    </>
  );
}

function Legend() {
  const keys: EngagementState[] = ["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid var(--line)",
      }}
    >
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span
            aria-hidden
            style={{ width: 12, height: 12, borderRadius: 3, background: statePill[k].colour }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{statePill[k].label}</span>
        </div>
      ))}
    </div>
  );
}
