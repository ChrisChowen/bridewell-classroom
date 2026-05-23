// Branded loading skeletons. Used by route-level loading.tsx files so a
// navigation paints the page's shape instantly (calm shimmer in the brand
// gold tint) instead of a blank flash or bare "Loading…" text. Reuses the
// bw-shimmer keyframe from globals.css.
import { Crest } from "@/components/shared/Crest";

const shimmer: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--line) 0%, var(--color-gold-tint-2) 50%, var(--line) 100%)",
  backgroundSize: "200% 100%",
  animation: "bw-shimmer 1400ms linear infinite",
  borderRadius: 6,
};

export function SkeletonLine({
  width = "100%",
  height = 12,
}: {
  width?: number | string;
  height?: number;
}) {
  return <div aria-hidden style={{ ...shimmer, width, height }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="bw-card"
      style={{ padding: 18, display: "grid", gap: 10, border: "1px solid var(--line)" }}
    >
      <SkeletonLine width="40%" height={10} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </div>
  );
}

// A minimal product top bar (crest + wordmark) so the chrome is stable across
// the loading→loaded transition.
export function SkeletonTopBar() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px clamp(12px, 4vw, 20px)",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <Crest size={28} />
      <span className="bw-display" style={{ fontSize: 15 }}>
        Bridewell
      </span>
    </header>
  );
}

// Full-page skeleton scaffold: stable top bar + a content area of skeleton
// cards. role="status" announces the loading state to assistive tech.
export function PageSkeleton({
  cards = 2,
  maxWidth = 1200,
}: {
  cards?: number;
  maxWidth?: number;
}) {
  return (
    <main role="status" aria-busy="true" aria-label="Loading" style={{ minHeight: "100dvh" }}>
      <SkeletonTopBar />
      <div style={{ maxWidth, margin: "0 auto", padding: "24px 28px", display: "grid", gap: 16 }}>
        <SkeletonLine width="38%" height={26} />
        <SkeletonLine width="55%" height={12} />
        <div style={{ height: 8 }} />
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} lines={i === 0 ? 2 : 3} />
        ))}
      </div>
    </main>
  );
}
