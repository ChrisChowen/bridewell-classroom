"use client";

import { useState } from "react";
import { Sparkles, BookmarkPlus, Check } from "lucide-react";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import type { LessonAppraisal } from "@/types";

// Appears on the class detail page after the teacher ends the lesson.
// Generates an AI appraisal of the lesson plan against the class's
// actual classifier outcomes; offers a one-click save to the school's
// shared lesson library. Implements the self-improving-system loop the
// teacher asked for.

export function AppraisalPanel({ classId, embedded = false }: { classId: string; embedded?: boolean }) {
  const [appraisal, setAppraisal] = useState<LessonAppraisal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) throw new Error("Not signed in");
      const token = await getCleanIdToken();
      const r = await fetch("/api/lessons/appraise", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to appraise");
      setAppraisal(d.appraisal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!appraisal) return;
    setSaving(true);
    try {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) throw new Error("Not signed in");
      const token = await getCleanIdToken();
      const r = await fetch("/api/lessons/save-to-library", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId, appraisal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to save");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!appraisal && !generating && !error) {
    // Embedded inside the class page's "After the lesson" disclosure: skip the
    // duplicate gold header (the disclosure already carries it) and show just
    // the description + action.
    if (embedded) {
      return (
        <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 540, lineHeight: 1.5 }}>
            The AI reads the engagement data, Reason events, and a sample of pupil
            conversations from this class, and writes a short appraisal of the plan you
            can save to the school&apos;s shared library — future plan generation draws on
            highly-rated ones.
          </p>
          <button onClick={generate} className="bw-btn-emphasis" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            <Sparkles size={13} style={{ marginRight: 6 }} />
            Generate appraisal
          </button>
        </div>
      );
    }
    return (
      <section
        className="bw-card"
        style={{
          padding: 18,
          marginBottom: 18,
          borderLeft: "3px solid var(--color-gold-500)",
          background: "var(--color-gold-tint-1)",
        }}
      >
        <div className="flex items-center justify-between gap-12">
          <div>
            <div className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
              After the lesson
            </div>
            <h3 className="bw-display" style={{ fontSize: 17, marginTop: 4 }}>
              Appraise this lesson plan
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, maxWidth: 540 }}>
              The AI reads the engagement data, Reason events, and a sample of pupil
              conversations from this class, and writes a short appraisal of THE PLAN
              you can save to the school&apos;s shared library. The library improves over
              time — future plan generation will draw on highly-rated ones.
            </p>
          </div>
          <button onClick={generate} className="bw-btn-emphasis" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            <Sparkles size={13} style={{ marginRight: 6 }} />
            Generate appraisal
          </button>
        </div>
      </section>
    );
  }

  if (generating) {
    return (
      <section className="bw-card" style={{ padding: 18, marginBottom: 18 }}>
        <span className="bw-section-label">Appraising the lesson plan…</span>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Reading classifier outcomes and a sample of pupil conversations. ~15 seconds.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bw-card" style={{ padding: 18, marginBottom: 18 }}>
        <span className="bw-section-label" style={{ color: "var(--color-crimson)" }}>
          Appraisal failed
        </span>
        <p style={{ fontSize: 13, marginTop: 6 }}>{error}</p>
      </section>
    );
  }

  if (!appraisal) return null;

  return (
    <section
      data-testid="appraisal-result"
      className="bw-card"
      style={{
        padding: 18,
        marginBottom: 18,
        borderLeft: "3px solid var(--color-gold-500)",
        background: "var(--surface-elev)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 12 }}>
        <div className="flex items-center gap-3">
          <span className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
            AI appraisal of this plan
          </span>
          <Rating rating={appraisal.rating} />
        </div>
        {!saved ? (
          <button onClick={save} disabled={saving} className="bw-btn-primary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            <BookmarkPlus size={12} style={{ marginRight: 6 }} />
            {saving ? "Saving…" : "Save to library"}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: "var(--color-gold-text)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} /> Saved to library
          </span>
        )}
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>{appraisal.summary}</p>

      <div
        className="bw-stack-sm"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
      >
        <ColumnHeader title="What worked" items={appraisal.whatWorked} />
        <ColumnHeader title="What to adjust" items={appraisal.whatToAdjust} />
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Metric label="Pupils classified" value={String(appraisal.metrics.pupilsClassified)} />
        <Metric label="States observed" value={Object.entries(appraisal.metrics.statesObserved).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"} />
        <Metric label="Reason events" value={String(appraisal.metrics.reasonEvents)} />
        {appraisal.metrics.reasonAcceptRate !== undefined && (
          <Metric label="Reason accept-rate" value={Math.round(appraisal.metrics.reasonAcceptRate * 100) + "%"} />
        )}
        <Metric label="Safeguarding" value={String(appraisal.metrics.safeguardingEvents)} />
      </div>
    </section>
  );
}

function Rating({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--color-gold-text)" }} title={`${rating} of 5`}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--text-muted)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function ColumnHeader({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 6 }}>
        {title}
      </div>
      <ul style={{ margin: 0, padding: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
        {items.length === 0 && <li style={{ fontSize: 12, color: "var(--text-muted)" }}>—</li>}
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.45 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span style={{ color: "var(--text-muted)" }}>{label}: </span>
      <span style={{ color: "var(--text)" }}>{value}</span>
    </span>
  );
}
