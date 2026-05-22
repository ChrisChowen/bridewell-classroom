"use client";

// Last-resort boundary for an error thrown in the ROOT layout itself
// (where the normal error.tsx can't render because the layout failed).
// It must supply its own <html>/<body>, and can't rely on the app's CSS
// variables/classes loading — so everything here is literal inline style.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Bridewell] root layout error", error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 40,
          textAlign: "center",
          background: "#FAF6EE",
          color: "#0F1A2E",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 10px", fontWeight: 600 }}>
            Bridewell Classroom is temporarily unavailable.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "#4A5670", margin: "0 0 20px" }}>
            Something went wrong loading the app. Your data is safe. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#FAF6EE",
              background: "#0F1A2E",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
