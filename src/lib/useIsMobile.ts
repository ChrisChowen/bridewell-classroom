"use client";

import { useEffect, useState } from "react";

// SSR-safe viewport check. Defaults to false on the server / first paint (so
// the desktop layout renders without a flash), then corrects on mount and on
// every viewport change. 880px is the breakpoint the responsive layer already
// uses (bw-stack-md) — below it the two-column teacher layout can't hold, so
// the drill panel switches to a bottom sheet.
export function useIsMobile(maxWidth = 880): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidth]);
  return isMobile;
}
