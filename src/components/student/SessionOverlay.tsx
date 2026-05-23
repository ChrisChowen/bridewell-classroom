"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Pause, Sparkles, Hourglass } from "lucide-react";
import type { SessionStatusValue } from "@/lib/firebase/live";

// Full overlay over the pupil chat surface for non-active session
// states. Replaces the inline banners for not_started / paused /
// wrap_up so pupils don't keep typing into a chat that won't respond.
//
// The "active" and "ended" states do NOT render an overlay — active is
// the working state; ended hands off to the ClosingScreen entirely.

interface Props {
  status: SessionStatusValue;
  teacherName?: string;
  lessonTitle?: string;
  wrapUpNote?: string | null;
}

export function SessionOverlay({ status, teacherName, lessonTitle, wrapUpNote }: Props) {
  if (status === "active" || status === "ended") return null;

  const content = (() => {
    switch (status) {
      case "not_started":
        return {
          eyebrow: "In the lobby",
          title: lessonTitle ? `Waiting to start: ${lessonTitle}` : "Waiting for your teacher",
          body:
            teacherName
              ? `${teacherName} will start the lesson in a moment. The chat will open when they do.`
              : "Your teacher will start the lesson in a moment. The chat will open when they do.",
          icon: <Hourglass size={18} color="var(--color-gold-500)" />,
          art: "/img/scholar-reading.webp",
          tone: "calm" as const,
        };
      case "paused":
        return {
          eyebrow: "Paused",
          title: "Your teacher has paused the class",
          body: "Look up — they need the room's attention. The chat will open again when the lesson resumes.",
          icon: <Pause size={18} color="var(--color-gold-500)" />,
          art: "/img/scholar-thinking.webp",
          tone: "calm" as const,
        };
      case "wrap_up":
        return {
          eyebrow: "Wrapping up",
          title: "Your teacher has called for a wrap-up",
          body:
            wrapUpNote ??
            "Round off what you have so far. The chat is still open — finish your last reply and the tutor will help you summarise.",
          icon: <Sparkles size={18} color="var(--color-gold-500)" />,
          art: "/img/scholar-teaching.webp",
          tone: "gold" as const,
        };
    }
  })();
  if (!content) return null;

  // wrap_up is a soft-overlay: dims the chat but doesn't lock it (the
  // pupil should still be able to type their summarising reply). The
  // others are hard locks.
  const lock = status !== "wrap_up";

  return (
    <motion.div
      aria-live="polite"
      // Presence is controlled by the parent's AnimatePresence (keyed by
      // status), so this fades+blurs in on entry and out on exit instead of
      // snapping when the teacher starts/pauses/resumes the class.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        padding: "32px 24px",
        background:
          status === "wrap_up"
            ? "rgba(15,26,46,0.18)"
            : "rgba(15,26,46,0.45)",
        backdropFilter: status === "wrap_up" ? "blur(0px)" : "blur(3px)",
        WebkitBackdropFilter: status === "wrap_up" ? "blur(0px)" : "blur(3px)",
        pointerEvents: lock ? "auto" : "none",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
        style={{
          maxWidth: 560,
          width: "100%",
          background: "var(--surface-elev)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "30px 32px 28px",
          textAlign: "center",
          boxShadow: "var(--shadow-xl)",
          pointerEvents: "auto",
        }}
      >
        <div
          aria-hidden
          className="bw-scholar-frame"
          style={{
            margin: "0 auto 12px",
            width: 132,
            height: 132,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Image
            src={content.art}
            alt=""
            width={132}
            height={132}
            style={{ width: 132, height: "auto", objectFit: "contain" }}
            priority
          />
        </div>
        <div
          className="flex items-center"
          style={{
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {content.icon}
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: content.tone === "gold" ? "var(--color-gold-500)" : "var(--text-muted)",
            }}
          >
            {content.eyebrow}
          </span>
        </div>
        <h2 className="bw-display" style={{ fontSize: 22, lineHeight: 1.25, marginBottom: 12 }}>
          {content.title}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, maxWidth: 420, margin: "0 auto" }}>
          {content.body}
        </p>
      </motion.div>
    </motion.div>
  );
}
