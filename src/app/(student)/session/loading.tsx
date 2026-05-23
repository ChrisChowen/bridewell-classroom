import { SkeletonTopBar, SkeletonLine } from "@/components/shared/Skeleton";

// Instant branded fallback while the pupil session loads — approximates the
// chat layout (top bar, a tutor turn settling in, pinned composer) so the
// transition into the lesson feels calm rather than blank.
export default function SessionLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading your lesson"
      style={{ height: "100dvh", display: "grid", gridTemplateRows: "auto 1fr auto" }}
    >
      <SkeletonTopBar />
      <div style={{ padding: "28px 32px", display: "grid", gap: 22, alignContent: "start", maxWidth: 720 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <SkeletonLine width={48} height={9} />
          <SkeletonLine width="90%" />
          <SkeletonLine width="70%" />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", padding: "12px 16px", background: "var(--surface-elev)" }}>
        <SkeletonLine height={40} />
      </div>
    </main>
  );
}
