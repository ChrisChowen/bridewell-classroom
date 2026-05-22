"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// A quiet "Reconnecting…" pill that appears only when the browser goes
// offline. On flaky school Wi-Fi a silent disconnect makes the teacher's
// Class Stream or the pupil's session look frozen-but-live; this gives an
// honest signal without alarm (muted tone, no flashing — patterns, not
// alerts). Renders nothing when online, so it's safe to drop into any header.
export function ConnectionPill() {
  // Start optimistic (online) to avoid an SSR/first-paint flash; correct it on
  // mount and on every connectivity change.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      title="You appear to be offline — the lesson will catch up when the connection returns."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        padding: "5px 10px",
        borderRadius: 999,
        color: "var(--text-muted)",
        background: "rgba(181,138,60,0.10)",
        border: "1px solid var(--line)",
        whiteSpace: "nowrap",
      }}
    >
      <WifiOff size={12} /> Reconnecting…
    </span>
  );
}
