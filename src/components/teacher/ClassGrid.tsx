"use client";

import { StatePill } from "@/components/shared/StatePill";
import type { PupilSummary } from "@/types";

export function ClassGrid({
  pupils,
  onSelect,
}: {
  pupils: PupilSummary[];
  onSelect?: (pupilId: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {pupils.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect?.(p.id)}
          className="bw-card"
          style={{
            textAlign: "left",
            padding: 14,
            cursor: "pointer",
            transition: "border-color 120ms ease, transform 120ms ease",
            background: "var(--surface-elev)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: "var(--color-navy-900)",
                  color: "var(--color-cream-50)",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {p.initials}
              </span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{p.displayName}</span>
            </div>
            <StatePill state={p.currentState} size="small" />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>Scaffold uses · last 5: {p.scaffoldLast5}</span>
            <span>
              Reason ·{" "}
              {p.reasonConfidenceTrailing !== undefined
                ? Math.round(p.reasonConfidenceTrailing * 100) + "%"
                : "—"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
