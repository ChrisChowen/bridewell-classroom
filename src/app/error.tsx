"use client";

// Root route-error boundary. Catches a render throw on any page that
// doesn't have a nearer boundary (/, /login, /join, /dashboard, the admin
// surface, …) so the teacher/pupil gets a calm recoverable state in the
// Bridewell register rather than Next's unstyled default error page.

import { useEffect } from "react";
import Link from "next/link";
import { Crest } from "@/components/shared/Crest";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Bridewell] uncaught render error", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
      <div style={{ maxWidth: 520, display: "grid", gap: 14, justifyItems: "center" }}>
        <Crest size={32} />
        <h1 className="bw-display" style={{ fontSize: 24, lineHeight: 1.25, margin: 0 }}>
          Something went wrong on this screen.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, maxWidth: 420 }}>
          Your data is safe — only this view hit an error. Try again, or head back to the start.
        </p>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <button onClick={() => reset()} className="bw-btn-primary">
            Try again
          </button>
          <Link href="/" className="bw-btn-secondary">
            Back to start
          </Link>
        </div>
      </div>
    </main>
  );
}
