/**
 * Freshness badge classification based on last enrichment/scoring dates.
 */

export type FreshnessStatus = "fresh" | "stale" | "old";

export interface FreshnessBadge {
  status: FreshnessStatus;
  label: string;
  labelRo: string;
  color: string;
}

/**
 * Classify freshness based on last enriched/scored dates.
 */
export function classifyFreshness(lastEnrichedAt: Date | null, lastScoredAt: Date | null): FreshnessStatus {
  const now = new Date();
  const enrichedDays = lastEnrichedAt ? Math.floor((now.getTime() - lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
  const scoredDays = lastScoredAt ? Math.floor((now.getTime() - lastScoredAt.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;

  // Use the most recent of the two
  const daysSinceUpdate = Math.min(enrichedDays, scoredDays);

  if (daysSinceUpdate < 7) return "fresh";
  if (daysSinceUpdate < 30) return "stale";
  return "old";
}

/**
 * Get badge info for a freshness status.
 */
export function getFreshnessBadge(status: FreshnessStatus): FreshnessBadge {
  switch (status) {
    case "fresh":
      return {
        status: "fresh",
        label: "Fresh",
        labelRo: "Actualizat",
        color: "bg-green-100 text-green-800",
      };
    case "stale":
      return {
        status: "stale",
        label: "Stale",
        labelRo: "Învechit",
        color: "bg-yellow-100 text-yellow-800",
      };
    case "old":
      return {
        status: "old",
        label: "Old",
        labelRo: "Vechi",
        color: "bg-red-100 text-red-800",
      };
  }
}

