"use client";

import { useMemo } from "react";
import { statePill, type EngagementState } from "@/lib/brand";
import type { LivePupil } from "@/lib/firebase/live";

// Class pulse — the collective answer to "how is my class doing?", in plain
// words first and a calm distribution bar second. Deliberately legible at any
// size: with one pupil the bar is that pupil's single state colour and the
// headline reads "1 working" / "1 needs a look" — never the meaningless
// full-width block the old strip showed. Pattern, not alert.

const ORDER: EngagementState[] = [
  "flowing",
  "productive_struggle",
  "wheel_spinning",
  "disengaged",
  "off_task",
];

// "Working" = the two engaged states; everything else is a pupil who could use
// a look. This is the teacher's triage split, not a value judgement on the pupil.
const WORKING: EngagementState[] = ["flowing", "productive_struggle"];

export function ClassPulse({
  pupils,
  stepCount,
}: {
  pupils: LivePupil[];
  stepCount?: number;
}) {
  const { total, working, needLook, counts, avgStep } = useMemo(() => {
    const counts: Record<EngagementState, number> = {
      flowing: 0,
      productive_struggle: 0,
      wheel_spinning: 0,
      disengaged: 0,
      off_task: 0,
    };
    for (const p of pupils) counts[p.state] = (counts[p.state] ?? 0) + 1;
    const total = pupils.length;
    const working = WORKING.reduce((n, s) => n + counts[s], 0);
    const avgStep =
      total === 0 ? 0 : pupils.reduce((a, p) => a + (p.currentStepIndex ?? 0), 0) / total;
    return { total, working, needLook: total - working, counts, avgStep };
  }, [pupils]);

  return (
    <section className="bw-card" style={{ padding: 18, boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 12 }}>
        <span className="bw-section-label">Class pulse</span>
        {stepCount && stepCount > 1 && total > 0 && (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            around step {Math.round(avgStep + 1)} of {stepCount}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Waiting for pupils to start working — the pulse appears as they begin.
        </p>
      ) : (
        <>
          {/* Headline — plain words, the triage answer first */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span className="bw-display" style={{ fontSize: 20 }}>
              {working} of {total}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              working well
              {needLook > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--color-gold-text)", fontWeight: 600 }}>
                    {needLook} could use a look
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Distribution bar — state palette, glides on change */}
          <div
            role="img"
            aria-label={
              "Class state: " +
              ORDER.filter((s) => counts[s] > 0)
                .map((s) => `${counts[s]} ${statePill[s].label}`)
                .join(", ")
            }
            style={{
              display: "flex",
              height: 12,
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              gap: 2,
              padding: 2,
            }}
          >
            {ORDER.map((s) => {
              const pct = (counts[s] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s}
                  title={`${statePill[s].label} · ${counts[s]}`}
                  style={{
                    width: `${pct}%`,
                    background: statePill[s].colour,
                    borderRadius: "var(--radius-pill)",
                    transition: "width var(--dur-slower) var(--ease-standard)",
                  }}
                />
              );
            })}
          </div>

          {/* Compact legend — only the states actually present, so it stays calm */}
          <div className="flex items-center" style={{ gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {ORDER.filter((s) => counts[s] > 0).map((s) => (
              <span key={s} className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <span
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 2, background: statePill[s].colour }}
                />
                {statePill[s].label}
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{counts[s]}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
