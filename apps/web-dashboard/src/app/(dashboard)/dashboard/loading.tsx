import { PageSkeleton } from "@/shared/components/ui/Skeleton";

/** Shown instantly while any console page loads its data (Next.js loading boundary). */
export default function DashboardLoading() {
  return <PageSkeleton />;
}
