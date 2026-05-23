import { PageSkeleton } from "@/components/shared/Skeleton";

// Instant branded fallback while the dashboard route loads — replaces the
// blank flash / bare "Loading…" on navigation.
export default function DashboardLoading() {
  return <PageSkeleton cards={2} maxWidth={1200} />;
}
