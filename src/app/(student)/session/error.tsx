"use client";

// Pupil-side error boundary. The chat surface is one of the most
// load-bearing screens on demo day — if it throws, the audience must
// see something composed, not a blank screen. We render a friendly
// message in the pupil register (calm, no jargon, no stack trace).

import { useEffect } from "react";
import Link from "next/link";
import { Crest } from "@/components/shared/Crest";

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Bridewell session] uncaught render error", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480, display: "grid", gap: 14, justifyItems: "center" }}>
        <Crest size={32} />
        <h1 className="bw-display" style={{ fontSize: 24, lineHeight: 1.25, margin: 0 }}>
          Something stopped working in this lesson.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Your work is saved. Tap try again, or let your teacher know if it
          keeps happening.
        </p>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <button onClick={() => reset()} className="bw-btn-primary">
            Try again
          </button>
          <Link href="/" className="bw-btn-secondary">
            Leave lesson
          </Link>
        </div>
      </div>
    </main>
  );
}
