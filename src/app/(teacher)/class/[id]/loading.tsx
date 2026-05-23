import { PageSkeleton } from "@/components/shared/Skeleton";

// Instant branded fallback while the class view loads. A wider scaffold to
// match the live pupil grid that's about to render.
export default function ClassLoading() {
  return <PageSkeleton cards={3} maxWidth={1400} />;
}
