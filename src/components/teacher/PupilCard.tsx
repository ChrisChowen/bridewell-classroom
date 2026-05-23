"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { ChevronRight, AlertTriangle, MessageSquare, CloudOff, Zap } from "lucide-react";
import { StatePill } from "@/components/shared/StatePill";
import { statePill, type EngagementState } from "@/lib/brand";
import type { LivePupil } from "@/lib/firebase/live";

// Pupil card — the primary teacher surface. Live data only.
// Shows current state, time since activity, a sparkline of recent
// engagement states, the pupil's last message excerpt, and a small
// safeguarding chip when one is raised. Click to open the drill panel
// with the full trajectory, conversation, and intervention controls.

// Map states to a 0–4 ordinal so the sparkline becomes a real line over
// "engagement quality" rather than a category strip.
const STATE_Y: Record<EngagementState, number> = {
  off_task: 0,
  disengaged: 1,
  wheel_spinning: 2,
  productive_struggle: 3,
  flowing: 4,
};

export function PupilCard({
  pupil,
  selected,
  stepCount,
  onSelect,
}: {
  pupil: LivePupil;
  selected?: boolean;
  // Total steps in the lesson plan — drives the progress dots. Optional
  // because the dashboard may render before the plan loads.
  stepCount?: number;
  onSelect: (id: string) => void;
}) {
  const ageMs = Date.now() - (pupil.lastActive ?? 0);
  const safe = pupil.safeguarding;
  // Optimistic "currently typing" dot: pupil sent a message since the
  // last snapshot. We hold the dot for 30s after their last message.
  const lastMsgMs = pupil.lastMessageAt ? Date.now() - pupil.lastMessageAt : Infinity;
  const recentlyActive = lastMsgMs < 30_000;
  const stepIndex = pupil.currentStepIndex ?? 0;

  // Compute the trajectory default inside the memo: `pupil.trajectory ?? []`
  // is a fresh array each render when undefined, which would otherwise
  // invalidate the memo every time.
  const sparkline = useMemo(() => buildSparklinePath(pupil.trajectory ?? []), [pupil.trajectory]);

  return (
    <motion.button
      onClick={() => onSelect(pupil.pupilId)}
      aria-pressed={selected}
      className="bw-card"
      // layout="position" animates the card sliding to its new slot when the
      // grid re-sorts (attention/recent/A–Z) without distorting its contents;
      // the enter fade+scale brings new pupils in as they join rather than
      // popping. Background/border still transition via CSS so motion only
      // owns transform+opacity (no double-animation of the same property).
      layout="position"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      style={{
        padding: 14,
        textAlign: "left",
        background: selected ? "rgba(181,138,60,0.08)" : "var(--surface-elev)",
        border: `1px solid ${selected ? "var(--color-gold-500)" : "var(--line)"}`,
        cursor: "pointer",
        transition:
          "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 10,
        minHeight: 168,
      }}
    >
      {/* Header row: avatar + name + state pill */}
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "var(--color-navy-900)",
              color: "var(--color-cream-50)",
              fontSize: 11,
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {initials(pupil.displayName)}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={pupil.displayName}
          >
            {pupil.displayName}
          </span>
          {recentlyActive && (
            <span
              aria-label="Pupil sent a message in the last 30s"
              title="Sent a message just now"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--color-gold-500)",
                animation: "bw-pulse 1.4s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <StatePill state={pupil.state} size="small" />
      </div>

      {/* Step progress strip — quiet, sits between header and sparkline. */}
      {stepCount && stepCount > 1 && (
        <div className="flex items-center gap-2" style={{ marginTop: -2 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            {stepIndex + 1}/{stepCount}
          </span>
          <div style={{ display: "flex", gap: 3, flex: 1 }} aria-hidden>
            {Array.from({ length: stepCount }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  background:
                    i <= stepIndex ? "var(--color-gold-500)" : "var(--line)",
                  opacity: i === stepIndex ? 1 : i < stepIndex ? 0.7 : 1,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sparkline */}
      <div style={{ position: "relative", height: 48 }}>
        <svg
          viewBox="0 0 200 48"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block" }}
          role="img"
          aria-label={`Engagement trajectory for ${pupil.displayName}`}
        >
          {/* Reference bands — flowing/productive at top, wheel/disengaged/off at bottom */}
          <rect x="0" y="0" width="200" height="14" fill="rgba(61,143,168,0.05)" />
          <rect x="0" y="34" width="200" height="14" fill="rgba(216,154,47,0.05)" />
          {sparkline ? (
            <>
              {/* Morph the trajectory rather than repaint it: when the line
                  re-fits (a new classification lands) motion interpolates the
                  path `d` and the state colour glides instead of snapping.
                  Point counts that change frame-to-frame fall back to a cut
                  for that one frame, which is imperceptible at this scale. */}
              <motion.path
                animate={{ d: sparkline.area, fill: statePill[pupil.state].colour }}
                opacity="0.18"
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
              <motion.path
                animate={{ d: sparkline.line, stroke: statePill[pupil.state].colour }}
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
              {sparkline.points.map((p, i) => (
                <motion.circle
                  key={i}
                  animate={{ cx: p.x, cy: p.y, fill: statePill[p.state].colour }}
                  r="1.6"
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                />
              ))}
            </>
          ) : (
            <text
              x="100"
              y="28"
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
              fontFamily="var(--font-sans)"
            >
              No classifications yet
            </text>
          )}
        </svg>
      </div>

      {/* Last message preview + meta row */}
      <div style={{ display: "grid", gap: 6 }}>
        {pupil.lastPupilExcerpt ? (
          <div
            className="flex items-start gap-2"
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.4,
              maxWidth: "100%",
            }}
          >
            <MessageSquare size={11} style={{ marginTop: 2, flexShrink: 0 }} />
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontStyle: "italic",
              }}
            >
              &ldquo;{pupil.lastPupilExcerpt}&rdquo;
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No messages yet.</div>
        )}

        <div className="flex items-center justify-between" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <span title={`Engagement confidence ${(pupil.confidence * 100).toFixed(0)}%`}>
            {humanAge(ageMs)} ago · {Math.round(pupil.confidence * 100)}%
            {pupil.classifierTier === "flash" && !pupil.classifierFallback && (
              <span
                title="Last classification from the Flash-tier first pass — confident enough not to need the Pro tiebreaker."
                style={{
                  marginLeft: 6,
                  color: "var(--text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Zap size={10} />
              </span>
            )}
            {pupil.classifierFallback && (
              <span
                title="The classifier was unavailable for the most recent snapshot — this state is not reliable."
                style={{
                  marginLeft: 6,
                  color: "var(--color-gold-text)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <CloudOff size={10} />
              </span>
            )}
          </span>
          <span className="flex items-center gap-1" style={{ color: "var(--text)" }}>
            Open <ChevronRight size={11} />
          </span>
        </div>

        {safe && (
          <div
            role="alert"
            className="flex items-center gap-2"
            style={{
              padding: "6px 8px",
              background:
                safe.severity === "high"
                  ? "rgba(142,42,42,0.10)"
                  : "rgba(216,154,47,0.12)",
              color:
                safe.severity === "high" ? "var(--color-crimson)" : "var(--text)",
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.35,
            }}
          >
            <AlertTriangle
              size={12}
              color={safe.severity === "high" ? "var(--color-crimson)" : "var(--color-gold-500)"}
              style={{ flexShrink: 0 }}
            />
            <span>
              <strong style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
                Safeguarding · {safe.severity}
              </strong>{" "}
              · {safe.summary}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

function humanAge(ms: number): string {
  if (!ms || ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function buildSparklinePath(
  trajectory: Array<{ state: EngagementState; t: number; confidence: number }>
): {
  line: string;
  area: string;
  points: Array<{ x: number; y: number; state: EngagementState }>;
} | null {
  if (!trajectory.length) return null;
  const W = 200;
  const H = 48;
  const PAD = 4;
  const n = trajectory.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  const points = trajectory.map((entry, i) => ({
    x: PAD + i * stepX,
    y: PAD + (4 - STATE_Y[entry.state]) * ((H - PAD * 2) / 4),
    state: entry.state,
  }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1]!.x.toFixed(1)} ${H} L ${points[0]!.x.toFixed(1)} ${H} Z`;
  return { line, area, points };
}
