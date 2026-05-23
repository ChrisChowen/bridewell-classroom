"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Users, BookOpen, ArrowRight } from "lucide-react";
import { getFirebase } from "@/lib/firebase/client";
import {
  subscribeToLiveAggregate,
  subscribeToSessionStatus,
  type AggregatePupil,
  type SessionStatus,
} from "@/lib/firebase/live";
import type { ClassRecord } from "@/types";

// A class on the teacher's home grid. Carries the same calm live read as the
// class view — when a lesson is running it shows a live dot and "N working ·
// M need a look" pulled from the nameless aggregate node (no over-fetch); when
// it isn't, the roster count. One tap opens the live view.

export function ClassCard({ klass }: { klass: ClassRecord }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [agg, setAgg] = useState<AggregatePupil[]>([]);
  const [roster, setRoster] = useState<number | null>(null);

  useEffect(() => subscribeToSessionStatus(klass.id, setStatus), [klass.id]);
  useEffect(() => subscribeToLiveAggregate(klass.id, setAgg), [klass.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fb = getFirebase();
      if (!fb.ready) return;
      try {
        const { collection, getCountFromServer, query, where } = await import("firebase/firestore");
        const snap = await getCountFromServer(
          query(collection(fb.db, "pupils"), where("classId", "==", klass.id))
        );
        if (!cancelled) setRoster(snap.data().count);
      } catch {
        /* roster count is a nicety — leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [klass.id]);

  const working = agg.filter(
    (a) => a.state === "flowing" || a.state === "productive_struggle"
  ).length;
  const needLook = agg.length - working;
  const value = status?.value ?? null;
  const isLive = value === "active" || value === "wrap_up";

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(klass.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  }

  return (
    <Link
      href={`/class/${klass.id}`}
      className="bw-card bw-class-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 18,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-sm)",
        borderLeft: isLive ? "3px solid var(--color-bridewell-red)" : undefined,
        transition:
          "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
      }}
    >
      {/* Header — name + status */}
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {klass.name}
        </span>
        <StatusTag value={value} live={isLive} />
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {klass.subject} · {klass.school}
        {klass.lessonPlan &&
          ` · ${klass.lessonPlan.estimatedMinutes} min · ${klass.lessonPlan.criticalConcepts.length} critical concept${
            klass.lessonPlan.criticalConcepts.length === 1 ? "" : "s"
          }`}
      </div>

      {klass.lessonPlan ? (
        <div className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
          <BookOpen size={13} color="var(--color-gold-500)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {klass.lessonPlan.title}
          </span>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No lesson plan yet.</div>
      )}

      {/* Live read — the calm pulse, only while a lesson is running */}
      {isLive && agg.length > 0 && (
        <div style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{working} working</span>
          {needLook > 0 && (
            <span style={{ color: "var(--color-gold-text)", fontWeight: 600 }}>
              {" · "}{needLook} need{needLook === 1 ? "s" : ""} a look
            </span>
          )}
        </div>
      )}
      {isLive && agg.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Live — waiting for pupils to start.</div>
      )}

      {/* Footer — join code + roster + open */}
      <div className="flex items-center justify-between" style={{ marginTop: "auto", gap: 10 }}>
        <button
          onClick={copy}
          title="Copy the join code"
          className="bw-card"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            letterSpacing: "0.1em",
            background: "var(--surface)",
            cursor: "pointer",
          }}
        >
          <span>{klass.joinCode}</span>
          {copied ? <Check size={12} color="var(--color-gold-500)" /> : <Copy size={12} color="var(--text-muted)" />}
        </button>
        <span className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {roster !== null && (
            <span className="flex items-center gap-1" title="Pupils joined">
              <Users size={12} /> {roster}
            </span>
          )}
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function StatusTag({ value, live }: { value: SessionStatus["value"] | null; live: boolean }) {
  if (!value || value === "not_started") {
    return <Tag label="Lobby" tone="muted" />;
  }
  if (value === "ended") return <Tag label="Ended" tone="muted" />;
  if (value === "paused") return <Tag label="Paused" tone="muted" />;
  return <Tag label={value === "wrap_up" ? "Wrapping up" : "Live"} tone="live" live={live} />;
}

function Tag({ label, tone, live }: { label: string; tone: "muted" | "live"; live?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: "var(--radius-pill)",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        border: "1px solid var(--line)",
        background: tone === "live" ? "rgba(227, 6, 19, 0.06)" : "var(--surface)",
        color: tone === "live" ? "var(--text)" : "var(--text-muted)",
      }}
    >
      {tone === "live" && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "var(--radius-pill)",
            background: "var(--color-bridewell-red)",
            animation: live ? "bw-pulse 1.6s ease-in-out infinite" : undefined,
          }}
        />
      )}
      {label}
    </span>
  );
}
