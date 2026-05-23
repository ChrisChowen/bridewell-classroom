"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// App-wide route transition. A `template.tsx` re-mounts on every navigation
// (unlike layout.tsx), so this gives each route a calm opacity fade-in —
// dashboard ↔ class detail, the auth flow, etc. Opacity only (no transform or
// height), so it can never shift layout or break the height:100dvh chains the
// session/projector surfaces rely on. Honours reduced-motion via the root
// MotionConfig in providers.tsx.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
