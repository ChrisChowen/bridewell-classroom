"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { statePill } from "@/lib/brand";
import { StatePill } from "@/components/shared/StatePill";
import type { PupilSummary } from "@/types";

// Per-pupil drill panel. The two trajectories side by side (engagement
// states across time + Reason confidence across the same span) is the
// answer to the 29 May audience question "show me how the dashboard knows
// a student is struggling". CLAUDE.md §Demo-day load-bearing question.

export function PupilPanel({
  pupil,
  reasonTrajectory,
  onClose,
}: {
  pupil: PupilSummary;
  reasonTrajectory?: number[];
  onClose: () => void;
}) {
  const reasonAvg = useMemo(() => {
    if (!reasonTrajectory?.length) return undefined;
    return reasonTrajectory.reduce((a, b) => a + b, 0) / reasonTrajectory.length;
  }, [reasonTrajectory]);

  return (
    <aside
      className="bw-card"
      style={{
        position: "sticky",
        top: 24,
        padding: 0,
        animation: "bw-fade-in 200ms ease-out",
      }}
      aria-label={`${pupil.displayName} detail`}
    >
      <header
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--color-navy-900)",
              color: "var(--color-cream-50)",
              fontSize: 12,
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
            }}
          >
            {pupil.initials}
          </span>
          <div>
            <div className="bw-display" style={{ fontSize: 18 }}>{pupil.displayName}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Confidence {Math.round(pupil.stateConfidence * 100)}%
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bw-btn-secondary"
          aria-label="Close pupil panel"
          style={{ padding: 6 }}
        >
          <X size={14} />
        </button>
      </header>

      <div style={{ padding: 18, display: "grid", gap: 16 }}>
        <div>
          <span className="bw-section-label" style={{ display: "block", marginBottom: 6 }}>
            Current state
          </span>
          <StatePill state={pupil.currentState} />
        </div>

        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span className="bw-section-label">Reason confidence · last 8 firings</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {reasonAvg !== undefined ? `avg ${Math.round(reasonAvg * 100)}%` : "no data"}
            </span>
          </div>
          <ReasonTrajectory series={reasonTrajectory} />
        </div>

        <div
          className="bw-stack-sm"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Stat label="Scaffold use · last 5 msgs" value={String(pupil.scaffoldLast5)} />
          <Stat
            label="Reason last"
            value={pupil.reasonConfidenceTrailing !== undefined ? `${Math.round(pupil.reasonConfidenceTrailing * 100)}%` : "—"}
          />
        </div>

        <div>
          <span className="bw-section-label" style={{ display: "block", marginBottom: 8 }}>
            Intervene
          </span>
          <div style={{ display: "grid", gap: 6 }}>
            <button className="bw-btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left" }} disabled>
              Send a teacher hint…
            </button>
            <button className="bw-btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left" }} disabled>
              Switch to Expert mode (with rationale)
            </button>
            <button className="bw-btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left" }} disabled>
              Pair with a flowing pupil
            </button>
            <button className="bw-btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left" }} disabled>
              Mark reviewed
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            Wired in Phase 3 — handlers write to RTDB and the pupil session subscribes for live delivery.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--surface)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        {label}
      </div>
      <div className="bw-display" style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}

function ReasonTrajectory({ series }: { series?: number[] }) {
  if (!series || series.length === 0) {
    return (
      <div
        style={{
          height: 60,
          border: "1px dashed var(--line)",
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        Reason has not fired in this session yet.
      </div>
    );
  }
  const W = 220;
  const H = 60;
  const stepX = W / (series.length - 1 || 1);
  const path = series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(H - v * (H - 8) - 4).toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  // Reference bands: < 0.4 (pattern flag), 0.4–0.65 (soft challenge),
  // > 0.65 (accept). Reason architecture v2, response layer.
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 64, display: "block" }}
      role="img"
      aria-label="Reason confidence trajectory"
    >
      {/* Bands */}
      <rect x="0" y="0" width={W} height={H * 0.35} fill="rgba(61,143,168,0.06)" />
      <rect x="0" y={H * 0.35} width={W} height={H * 0.25} fill="rgba(181,138,60,0.06)" />
      <rect x="0" y={H * 0.6} width={W} height={H * 0.4} fill="rgba(216,154,47,0.06)" />
      {/* Area + line */}
      <path d={area} fill="rgba(181,138,60,0.16)" />
      <path d={path} stroke="var(--color-gold-500)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {series.map((v, i) => (
        <circle key={i} cx={i * stepX} cy={H - v * (H - 8) - 4} r="2.2" fill="var(--color-gold-500)" />
      ))}
    </svg>
  );
}
