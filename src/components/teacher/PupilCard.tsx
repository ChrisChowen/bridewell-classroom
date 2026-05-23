"use client";

import { motion } from "motion/react";
import { ChevronRight, AlertTriangle, MessageSquare } from "lucide-react";
import { StatePill } from "@/components/shared/StatePill";
import { EngagementLane } from "@/components/teacher/EngagementLane";
import { humanAge, initials } from "@/lib/teacher-viz";
import type { LivePupil } from "@/lib/firebase/live";

// Pupil card — the primary live teacher surface, redesigned around the three
// things a teacher reads at a glance: the dominant engagement STATE, the
// trajectory (climbing / slipping), and the pupil's own last words as evidence.
// One tap opens the drill panel. Pattern, not alert; evidence over instance.

export function PupilCard({
  pupil,
  selected,
  stepCount,
  onSelect,
}: {
  pupil: LivePupil;
  selected?: boolean;
  stepCount?: number;
  onSelect: (id: string) => void;
}) {
  const ageMs = Date.now() - (pupil.lastActive ?? 0);
  const safe = pupil.safeguarding;
  const lastMsgMs = pupil.lastMessageAt ? Date.now() - pupil.lastMessageAt : Infinity;
  const recentlyActive = lastMsgMs < 30_000;
  const stepIndex = pupil.currentStepIndex ?? 0;
  const hasReadings = (pupil.trajectory?.length ?? 0) > 0;

  return (
    <motion.button
      onClick={() => onSelect(pupil.pupilId)}
      aria-pressed={selected}
      className="bw-card"
      layout="position"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      style={{
        padding: 16,
        textAlign: "left",
        background: selected ? "var(--color-gold-tint-1)" : "var(--surface-elev)",
        border: `1px solid ${selected ? "var(--color-gold-500)" : "var(--line)"}`,
        // Safeguarding gets a calm crimson edge — present but never flashing.
        borderLeft: safe
          ? `3px solid var(--color-crimson)`
          : `1px solid ${selected ? "var(--color-gold-500)" : "var(--line)"}`,
        boxShadow: "var(--shadow-sm)",
        cursor: "pointer",
        transition:
          "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 196,
      }}
    >
      {/* Header — avatar + name, with the dominant state chip on the right */}
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--radius-pill)",
              background: "var(--color-navy-900)",
              color: "var(--color-cream-50)",
              fontSize: 11,
              fontWeight: "var(--weight-semibold)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {initials(pupil.displayName)}
          </span>
          <span
            style={{
              fontSize: 15,
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
              aria-label="Active just now"
              title="Sent a message in the last 30s"
              style={{
                width: 6,
                height: 6,
                borderRadius: "var(--radius-pill)",
                background: "var(--color-gold-500)",
                animation: "bw-pulse 1.4s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <StatePill state={pupil.state} />
      </div>

      {/* The engagement trajectory — the load-bearing "struggling?" read */}
      <EngagementLane trajectory={pupil.trajectory ?? []} state={pupil.state} />

      {/* Lesson position — quiet step pips */}
      {stepCount && stepCount > 1 && (
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 10,
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Step {Math.min(stepIndex + 1, stepCount)} of {stepCount}
          </span>
          <div style={{ display: "flex", gap: 3, flex: 1 }} aria-hidden>
            {Array.from({ length: stepCount }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i <= stepIndex ? "var(--color-gold-500)" : "var(--line)",
                  opacity: i === stepIndex ? 1 : i < stepIndex ? 0.7 : 1,
                  transition: "background var(--dur-base) var(--ease-standard)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Evidence — the pupil's own last words */}
      <div style={{ flex: 1 }}>
        {pupil.lastPupilExcerpt ? (
          <div
            className="flex items-start gap-2"
            style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}
          >
            <MessageSquare size={12} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
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
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No messages yet.</div>
        )}
      </div>

      {/* Footer — confidence / freshness / open. Fallback shown quietly. */}
      <div
        className="flex items-center justify-between"
        style={{ fontSize: 12, color: "var(--text-muted)" }}
      >
        <span>
          {pupil.classifierFallback ? (
            <span
              title="The classifier was unavailable for the latest reading — treat this state as unconfirmed."
              style={{ color: "var(--color-gold-text)" }}
            >
              signal unclear
            </span>
          ) : hasReadings ? (
            `${Math.round(pupil.confidence * 100)}% sure · ${humanAge(ageMs)}`
          ) : (
            `joined ${humanAge(ageMs)}`
          )}
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--text)", fontWeight: 500 }}>
          Open <ChevronRight size={13} />
        </span>
      </div>

      {/* Safeguarding — calm, single line, sorted to the top by the grid */}
      {safe && (
        <div
          role="alert"
          className="flex items-start gap-2"
          style={{
            padding: "8px 10px",
            background:
              safe.severity === "high" ? "var(--color-crimson-tint-2)" : "var(--color-crimson-tint-1)",
            color: safe.severity === "high" ? "var(--color-crimson)" : "var(--text)",
            borderRadius: "var(--radius-md)",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle size={12} color="var(--color-crimson)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
              Safeguarding · {safe.severity}
            </strong>{" "}
            · {safe.summary}
          </span>
        </div>
      )}
    </motion.button>
  );
}
