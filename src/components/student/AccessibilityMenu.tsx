"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Check } from "lucide-react";

// Pupil-side accessibility menu. Adjusts the pupil's own reading
// experience — text size, dyslexia-friendly spacing, reduced motion —
// persisted to localStorage and applied as attributes on <html>. These
// are presentation-only and never touch the tutor's behaviour or any
// pupil data (SEND adaptation of the tutor is teacher-set, separately).

type FontScale = "normal" | "large" | "xlarge";
type Reading = "default" | "friendly";

const KEYS = {
  fontScale: "bw-a11y-font-scale",
  reading: "bw-a11y-reading",
  motion: "bw-a11y-reduce-motion",
} as const;

function apply(fontScale: FontScale, reading: Reading, reduceMotion: boolean) {
  const el = document.documentElement;
  if (fontScale === "normal") el.removeAttribute("data-font-scale");
  else el.setAttribute("data-font-scale", fontScale);
  if (reading === "default") el.removeAttribute("data-reading");
  else el.setAttribute("data-reading", "friendly");
  if (reduceMotion) el.setAttribute("data-reduce-motion", "on");
  else el.removeAttribute("data-reduce-motion");
}

// Apply persisted prefs as early as the menu mounts (the menu sits in the
// session header, so this runs on every pupil session load).
export function useApplyAccessibilityPrefs() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fontScale = (localStorage.getItem(KEYS.fontScale) as FontScale) || "normal";
    const reading = (localStorage.getItem(KEYS.reading) as Reading) || "default";
    const reduceMotion = localStorage.getItem(KEYS.motion) === "on";
    apply(fontScale, reading, reduceMotion);
  }, []);
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>("normal");
  const [reading, setReading] = useState<Reading>("default");
  const [reduceMotion, setReduceMotion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useApplyAccessibilityPrefs();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFontScale((localStorage.getItem(KEYS.fontScale) as FontScale) || "normal");
    setReading((localStorage.getItem(KEYS.reading) as Reading) || "default");
    setReduceMotion(localStorage.getItem(KEYS.motion) === "on");
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update(next: { fontScale?: FontScale; reading?: Reading; reduceMotion?: boolean }) {
    const fs = next.fontScale ?? fontScale;
    const rd = next.reading ?? reading;
    const rm = next.reduceMotion ?? reduceMotion;
    setFontScale(fs);
    setReading(rd);
    setReduceMotion(rm);
    localStorage.setItem(KEYS.fontScale, fs);
    localStorage.setItem(KEYS.reading, rd);
    localStorage.setItem(KEYS.motion, rm ? "on" : "off");
    apply(fs, rd, rm);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="bw-btn-secondary"
        aria-label="Accessibility options"
        aria-expanded={open}
        title="Accessibility"
        style={{ padding: 7 }}
      >
        <Accessibility size={14} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Accessibility options"
          className="bw-card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 248,
            padding: 14,
            zIndex: 50,
            display: "grid",
            gap: 14,
            boxShadow: "0 8px 28px rgba(15,26,46,0.18)",
          }}
        >
          <div>
            <div className="bw-section-label" style={{ marginBottom: 6 }}>Text size</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["normal", "large", "xlarge"] as FontScale[]).map((fs) => (
                <button
                  key={fs}
                  onClick={() => update({ fontScale: fs })}
                  className="bw-btn-secondary"
                  aria-pressed={fontScale === fs}
                  style={{
                    flex: 1,
                    fontSize: fs === "normal" ? 12 : fs === "large" ? 14 : 16,
                    padding: "5px 0",
                    borderColor: fontScale === fs ? "var(--color-gold-500)" : undefined,
                    fontWeight: fontScale === fs ? 600 : 400,
                  }}
                >
                  A
                </button>
              ))}
            </div>
          </div>

          <Toggle
            label="Dyslexia-friendly"
            hint="More spacing, clearer font"
            on={reading === "friendly"}
            onChange={(v) => update({ reading: v ? "friendly" : "default" })}
          />
          <Toggle
            label="Reduce motion"
            hint="Fewer animations"
            on={reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />

          <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>
            These settings change only how the page looks for you. They&apos;re saved on this device.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{hint}</span>
      </span>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 38,
          height: 22,
          borderRadius: 999,
          background: on ? "var(--color-gold-500)" : "var(--line)",
          position: "relative",
          transition: "background 140ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#fff",
            display: "grid",
            placeItems: "center",
            transition: "left 140ms ease",
          }}
        >
          {on && <Check size={11} color="var(--color-gold-500)" />}
        </span>
      </span>
    </button>
  );
}
