"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, Users, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { subscribeToMyClasses } from "@/lib/firebase/classes";
import { NewClassWizard } from "./NewClassWizard";
import type { ClassRecord } from "@/types";

// Classes panel — teacher creates and manages classes from here. The join
// code is the primary affordance: copy it, write it on the board, pupils
// type it into /join.

export function ClassesPanel() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMyClasses(user.uid, setClasses);
    return unsub;
  }, [user]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1400);
    } catch {
      // Older browsers / Safari may need fallback; skipped for now.
    }
  }

  return (
    <section className="bw-card" style={{ padding: 0, overflow: "hidden" }}>
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span className="bw-section-label">Your classes</span>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Each class has a join code your pupils type at /join.
          </div>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="bw-btn-emphasis"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <Plus size={14} /> New class
        </button>
      </header>

      {classes.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          You have no classes yet. Click <strong>New class</strong> to choose a topic — the AI drafts a lesson plan you approve, then hands you a join code.
        </div>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {classes.map((c) => (
          <li
            key={c.id}
            style={{
              borderTop: "1px solid var(--line)",
              transition: "background 120ms ease",
            }}
          >
            <Link
              href={`/class/${c.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: 12,
                alignItems: "center",
                padding: "14px 18px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                  {c.lessonPlan && (
                    <span
                      className="flex items-center gap-1"
                      title={c.lessonPlan.title}
                      style={{
                        fontSize: 10,
                        color: "var(--color-gold-500)",
                        background: "var(--color-gold-tint-2)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      <BookOpen size={10} /> Plan ready
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {c.subject} · {c.school}
                  {c.lessonPlan && ` · ${c.lessonPlan.estimatedMinutes} min · ${c.lessonPlan.criticalConcepts.length} critical concept${c.lessonPlan.criticalConcepts.length === 1 ? "" : "s"}`}
                </div>
                {c.lessonPlan && (
                  <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4, lineHeight: 1.4 }}>
                    {c.lessonPlan.title}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copy(c.joinCode);
                }}
                title="Copy join code"
                className="bw-card"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  background: "var(--surface)",
                  cursor: "pointer",
                }}
              >
                <span>{c.joinCode}</span>
                {copiedCode === c.joinCode ? (
                  <Check size={12} color="var(--color-gold-500)" />
                ) : (
                  <Copy size={12} color="var(--text-muted)" />
                )}
              </button>
              <RosterCount classId={c.id} />
              <ArrowRight size={14} color="var(--text-muted)" />
            </Link>
          </li>
        ))}
      </ul>

      {wizardOpen && <NewClassWizard onClose={() => setWizardOpen(false)} />}
    </section>
  );
}

function RosterCount({ classId }: { classId: string }) {
  // Distinguish "still loading" and "couldn't count" from a genuine zero —
  // a class you know has pupils showing "—" reads as broken on demo day.
  const [n, setN] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fb = getFirebase();
      if (!fb.ready) return;
      const { collection, getCountFromServer, query, where } = await import("firebase/firestore");
      try {
        const q = query(collection(fb.db, "pupils"), where("classId", "==", classId));
        const snap = await getCountFromServer(q);
        if (!cancelled) {
          setN(snap.data().count);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);
  // ok → the real count (including 0); loading → a quiet ellipsis; error → "—".
  const display = status === "ok" ? n ?? 0 : status === "loading" ? "…" : "—";
  return (
    <span
      title={status === "error" ? "Couldn't load the roster count" : "Pupils joined"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        color: "var(--text-muted)",
      }}
    >
      <Users size={12} /> {display}
    </span>
  );
}

