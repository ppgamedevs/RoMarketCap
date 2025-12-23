import type { Company } from "@prisma/client";

type CompanyForConfidence = Pick<
  Company,
  "id" | "revenueLatest" | "profitLatest" | "employees" | "website" | "descriptionRo" | "enrichVersion" | "lastEnrichedAt" | "lastScoredAt"
>;

/**
 * Calculate data confidence score (0-100) based on:
 * - Source count (metrics, submissions, claims)
 * - Freshness (last enriched, last scored)
 * - Manual confirmation (approved claims/submissions)
 * - Enrichment success (enrichVersion, lastEnrichedAt)
 */
export async function calculateDataConfidence(company: CompanyForConfidence): Promise<number> {
  const { prisma } = await import("@/src/lib/db");

  const [metricsCount, approvedSubmissionsCount, approvedClaimsCount] = await Promise.all([
    prisma.companyMetric.count({ where: { companyId: company.id } }),
    prisma.companySubmission.count({ where: { companyId: company.id, status: "APPROVED" } }),
    prisma.companyClaim.count({ where: { companyId: company.id, status: "APPROVED" } }),
  ]);

  let score = 0;

  // Source count (0-30 points)
  const sourceCount = metricsCount + approvedSubmissionsCount + approvedClaimsCount;
  score += Math.min(30, sourceCount * 5);

  // Freshness (0-25 points)
  const now = new Date();
  if (company.lastEnrichedAt) {
    const daysSinceEnrich = Math.floor((now.getTime() - company.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceEnrich <= 7) score += 25;
    else if (daysSinceEnrich <= 30) score += 15;
    else if (daysSinceEnrich <= 90) score += 5;
  }

  if (company.lastScoredAt) {
    const daysSinceScore = Math.floor((now.getTime() - company.lastScoredAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceScore <= 1) score += 10;
    else if (daysSinceScore <= 7) score += 5;
  }

  // Manual confirmation (0-25 points)
  if (approvedClaimsCount > 0) score += 15;
  if (approvedSubmissionsCount > 0) score += Math.min(10, approvedSubmissionsCount * 2);

  // Enrichment success (0-20 points)
  if (company.enrichVersion != null && company.enrichVersion > 1) score += 10;
  if (company.lastEnrichedAt != null) {
    const daysSince = Math.floor((now.getTime() - company.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 30) score += 10;
  }

  // Data completeness bonus (0-10 points)
  const hasRevenue = company.revenueLatest != null;
  const hasProfit = company.profitLatest != null;
  const hasEmployees = company.employees != null;
  const hasWebsite = company.website != null;
  const hasDescription = (company.descriptionRo ?? "").trim().length >= 40;

  const completenessFields = [hasRevenue, hasProfit, hasEmployees, hasWebsite, hasDescription].filter(Boolean).length;
  score += Math.min(10, completenessFields * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get human-readable confidence level.
 */
export function getConfidenceLevel(score: number): "High" | "Medium" | "Low" {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

