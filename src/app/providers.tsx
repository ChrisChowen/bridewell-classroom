"use client";

import { AuthProvider } from "@/lib/firebase/auth-context";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

// The motion library animates via JS (Web Animations API), so the global
// `html[data-reduce-motion="on"] *` CSS override that blanks CSS transitions
// does NOT stop library animations. We bridge it here: reduced-motion is on
// when EITHER the app's own accessibility toggle OR the OS preference is set.
// `reducedMotion="always"` makes the library skip transforms/opacity moves;
// `"user"` (the off case) still defers to the OS preference as a safety net.
function useAppReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compute = () =>
      setReduced(root.getAttribute("data-reduce-motion") === "on" || mq.matches);
    compute();
    mq.addEventListener("change", compute);
    const obs = new MutationObserver(compute);
    obs.observe(root, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    return () => {
      mq.removeEventListener("change", compute);
      obs.disconnect();
    };
  }, []);
  return reduced;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const reduced = useAppReducedMotion();
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <AuthProvider>{children}</AuthProvider>
    </MotionConfig>
  );
}
