"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getFirebase } from "@/lib/firebase/client";

interface CloseData {
  title: string;
  achievements: string[];
  stretch: string;
  nextTime: string;
}

// Pupil-facing close-of-lesson screen. Renders when the teacher ends
// the class. AI-generated, cites specific phrases the pupil used.
// No XP, no leaderboards — gamification by way of being seen.

export function ClosingScreen() {
  const [close, setClose] = useState<CloseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) {
        if (!cancelled) {
          setLoading(false);
          setError("Not signed in.");
        }
        return;
      }
      try {
        const token = await fb.auth.currentUser.getIdToken();
        const r = await fetch("/api/session/consolidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        if (!cancelled) {
          setClose(d.close);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        padding: 32,
        minHeight: "100%",
      }}
    >
      <div
        className="bw-card"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 32,
          textAlign: "center",
          background: "var(--surface-elev)",
        }}
      >
        <div
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "rgba(181,138,60,0.12)",
            color: "var(--color-gold-500)",
            margin: "0 auto 14px",
          }}
        >
          <Sparkles size={20} />
        </div>

        {loading && (
          <div>
            <div className="bw-display" style={{ fontSize: 22, marginBottom: 6 }}>
              Wrapping up your lesson…
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Your tutor is gathering what you covered today.
            </p>
          </div>
        )}

        {error && !loading && (
          <div>
            <div className="bw-display" style={{ fontSize: 22, marginBottom: 8 }}>
              Lesson ended.
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              {error}
            </p>
          </div>
        )}

        {close && !loading && (
          <div style={{ textAlign: "left" }}>
            <h1
              className="bw-display"
              style={{
                fontSize: 24,
                lineHeight: 1.25,
                textAlign: "center",
                marginBottom: 22,
              }}
            >
              {close.title}
            </h1>

            <Section title="What you showed today">
              <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
                {close.achievements.map((a) => (
                  <li key={a} style={{ fontSize: 14, lineHeight: 1.5 }}>{a}</li>
                ))}
              </ul>
            </Section>

            <Section title="Where you stretched">
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>{close.stretch}</p>
            </Section>

            <Section title="One thing for next time">
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>{close.nextTime}</p>
            </Section>
          </div>
        )}

        <div style={{ marginTop: 26, display: "flex", justifyContent: "center", gap: 10 }}>
          <Link href="/join" className="bw-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Join your next lesson <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--color-gold-500)",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
