"use client";

import type { LessonStep } from "@/types";
import type { LivePupil } from "@/lib/firebase/live";
import { statePill } from "@/lib/brand";

// A horizontal bird's-eye view of the lesson. One column per step, with
// a stack of dots underneath showing the pupils currently on that step
// (one dot per pupil, coloured by engagement state, NO names). Lets
// the teacher answer "where is the class as a whole?" at a glance and
// spot which steps are bottlenecks. Complements the per-pupil cards
// rather than replacing them.

interface Props {
  sequence: LessonStep[];
  pupils: LivePupil[];
}

export function StepTimeline({ sequence, pupils }: Props) {
  if (!sequence || sequence.length <= 1) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${sequence.length}, minmax(0, 1fr))`,
        gap: 12,
      }}
    >
      {sequence.map((step, i) => {
        const onStep = pupils.filter((p) => (p.currentStepIndex ?? 0) === i);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--surface)",
              minHeight: 92,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                STEP {i + 1}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: onStep.length > 0 ? "var(--color-gold-500)" : "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {onStep.length} pupil{onStep.length === 1 ? "" : "s"}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.3,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
              title={step.title}
            >
              {step.title}
            </div>
            <div
              className="flex items-center gap-1"
              style={{ flexWrap: "wrap", marginTop: "auto", minHeight: 12 }}
              aria-label={`${onStep.length} pupils on step ${i + 1}`}
            >
              {onStep.map((p) => (
                <span
                  key={p.pupilId}
                  title={p.displayName}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: statePill[p.state]?.colour ?? "var(--text-muted)",
                    opacity: 0.85,
                  }}
                />
              ))}
              {onStep.length === 0 && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
