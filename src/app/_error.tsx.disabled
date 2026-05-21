"use client";

// Global error boundary. Catches any uncaught render-time exception
// from a route segment that doesn't have its own error.tsx, so the
// audience never sees a Next.js stack trace on the demo day.

import { useEffect } from "react";
import Link from "next/link";
import { Crest } from "@/components/shared/Crest";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the browser console so the developer can still see it.
    // Production logging would go to a server-side sink here.
    console.error("[Bridewell] uncaught render error", error);
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
      <div style={{ maxWidth: 520, display: "grid", gap: 16, justifyItems: "center" }}>
        <Crest size={36} />
        <h1 className="bw-display" style={{ fontSize: 28, lineHeight: 1.2, margin: 0 }}>
          Something went wrong on this screen.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          The page hit an unexpected error. Your session is safe — try again, or
          return to the homepage.
        </p>
        {error?.digest && (
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            ref · {error.digest}
          </p>
        )}
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <button onClick={() => reset()} className="bw-btn-primary">
            Try again
          </button>
          <Link href="/" className="bw-btn-secondary">
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
