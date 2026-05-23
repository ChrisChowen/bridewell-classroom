"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { Route } from "next";
import { Settings, Check, ArrowLeftRight, ChevronDown } from "lucide-react";
import { speechOutputAvailable } from "@/lib/voice";

// localStorage key for the "read answers aloud" preference. Read by
// ChatSurface to decide whether to speak tutor replies (British voice).
export const VOICE_OUTPUT_KEY = "bw-voice-output";

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

// The pupil settings menu. Folds the previously-separate topbar controls —
// accessibility (text size / dyslexia / motion / read-aloud), appearance
// (dark mode), and class switching — into one calm dropdown so the session
// header isn't cluttered. `switchClassHref` adds the "Switch class" item only
// where a class context exists (omit it in the design preview).
//
// `userLabel` merges the menu with the pupil's name chip: instead of a
// separate gear icon AND a name chip, the chip itself is the trigger (name +
// caret), matching the account-chip-as-menu pattern. Without it, a plain gear.
export function AccessibilityMenu({
  switchClassHref,
  userLabel,
}: {
  switchClassHref?: string;
  userLabel?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>("normal");
  const [reading, setReading] = useState<Reading>("default");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useApplyAccessibilityPrefs();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFontScale((localStorage.getItem(KEYS.fontScale) as FontScale) || "normal");
    setReading((localStorage.getItem(KEYS.reading) as Reading) || "default");
    setReduceMotion(localStorage.getItem(KEYS.motion) === "on");
    setVoiceOut(localStorage.getItem(VOICE_OUTPUT_KEY) === "on");
    setVoiceAvailable(speechOutputAvailable());
    setDark(localStorage.getItem("bw-theme") === "dark");
  }, []);

  function toggleVoiceOut(v: boolean) {
    setVoiceOut(v);
    localStorage.setItem(VOICE_OUTPUT_KEY, v ? "on" : "off");
  }

  // Dark mode — same persistence as the standalone ThemeToggle (bw-theme +
  // data-theme on <html>), so it stays in sync wherever both appear.
  function toggleDark(v: boolean) {
    setDark(v);
    const el = document.documentElement;
    if (v) {
      el.setAttribute("data-theme", "dark");
      localStorage.setItem("bw-theme", "dark");
    } else {
      el.removeAttribute("data-theme");
      localStorage.setItem("bw-theme", "light");
    }
  }

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
      {userLabel ? (
        // The name chip IS the menu trigger (account-chip-as-menu).
        <button
          onClick={() => setOpen((o) => !o)}
          className="bw-card"
          aria-label="Settings"
          aria-expanded={open}
          title="Settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px 6px 12px",
            fontSize: 12,
            color: "var(--text-muted)",
            cursor: "pointer",
            maxWidth: "44vw",
          }}
        >
          <strong
            style={{
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userLabel}
          </strong>
          <ChevronDown
            size={13}
            aria-hidden
            style={{
              flexShrink: 0,
              color: "var(--text-muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 140ms ease",
            }}
          />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="bw-btn-secondary"
          aria-label="Settings"
          aria-expanded={open}
          title="Settings"
          style={{ padding: 7 }}
        >
          <Settings size={14} />
        </button>
      )}

      <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Settings"
          className="bw-card"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
          style={{
            transformOrigin: "top right",
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 248,
            padding: 14,
            zIndex: 50,
            display: "grid",
            gap: 14,
            boxShadow: "var(--shadow-lg)",
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
          {voiceAvailable && (
            <Toggle
              label="Read answers aloud"
              hint="British voice"
              on={voiceOut}
              onChange={toggleVoiceOut}
            />
          )}

          <Toggle
            label="Dark mode"
            hint="Easier in a dim room"
            on={dark}
            onChange={toggleDark}
          />

          <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>
            These settings change only how the page looks for you. They&apos;re saved on this device.
          </p>

          {switchClassHref && (
            <Link
              href={switchClassHref as Route}
              className="bw-btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                borderTop: "1px solid var(--line)",
                paddingTop: 10,
                marginTop: 2,
                width: "100%",
              }}
            >
              <ArrowLeftRight size={13} /> Switch class
            </Link>
          )}
        </motion.div>
      )}
      </AnimatePresence>
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
