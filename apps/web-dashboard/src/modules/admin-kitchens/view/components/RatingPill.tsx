import { Pill } from "@/modules/admin/view/components/ui";

/** The kitchen's public 7-day rating as customers see it. */
export function RatingPill({ rating }: { rating: { status: string; grade: string | null } | null }) {
  if (!rating) return <span className="text-slate-400">Not monitored</span>;
  if (rating.status === "verified" && rating.grade) {
    return <Pill tone={rating.grade === "A" || rating.grade === "B" ? "green" : "amber"}>Grade {rating.grade}</Pill>;
  }
  if (rating.status === "incomplete") return <Pill tone="amber">{rating.grade ? `${rating.grade} (incomplete)` : "Incomplete"}</Pill>;
  return <Pill tone="slate">Pending</Pill>;
}
