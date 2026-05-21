"use client";

// Teacher class-detail error boundary. If the live RTDB subscription
// throws or the class doc is malformed, the teacher gets a recoverable
// state with a link back to the dashboard rather than a blank page.

import { useEffect } from "react";
import Link from "next/link";
import { Crest } from "@/components/shared/Crest";

export default function ClassError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Bridewell class] uncaught render error", error);
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
      <div style={{ maxWidth: 520, display: "grid", gap: 14, justifyItems: "center" }}>
        <Crest size={32} />
        <h1 className="bw-display" style={{ fontSize: 24, lineHeight: 1.25, margin: 0 }}>
          This class view hit an unexpected error.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          The pupils&apos; sessions and saved data are not affected — only this
          screen. Try again, or head back to the dashboard.
        </p>
        {error?.digest && (
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            ref · {error.digest}
          </p>
        )}
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <button onClick={() => reset()} className="bw-btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="bw-btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
