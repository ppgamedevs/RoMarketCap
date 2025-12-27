/**
 * PROMPT 60: Coverage Dashboard Stats
 * 
 * GET /api/admin/coverage/stats
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { getEffectiveLaunchMode } from "@/src/lib/launch/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const launchMode = getEffectiveLaunchMode();
    const where: Prisma.CompanyWhereInput = {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      mergedIntoCompanyId: null, // Exclude merged companies
    };

    if (launchMode) {
      where.isDemo = false; // Exclude demo in launch mode
    }

    // Total companies
    const totalCompanies = await prisma.company.count({ where });

    // Companies with various fields
    const withCUI = await prisma.company.count({
      where: { ...where, cui: { not: null } },
    });

    const withDomain = await prisma.company.count({
      where: { ...where, domain: { not: null } },
    });

    const withIndustry = await prisma.company.count({
      where: { ...where, industrySlug: { not: null } },
    });

    const withCounty = await prisma.company.count({
      where: { ...where, countySlug: { not: null } },
    });

    const withFinancials = await prisma.company.count({
      where: {
        ...where,
        lastFinancialSyncAt: { not: null },
      },
    });

    const withSEAP = await prisma.company.count({
      where: {
        ...where,
        provenance: {
          some: {
            sourceName: "SEAP",
          },
        },
      },
    });

    const withEUFunds = await prisma.company.count({
      where: {
        ...where,
        provenance: {
          some: {
            sourceName: "EU_FUNDS",
          },
        },
      },
    });

    const withEnrichment = await prisma.company.count({
      where: {
        ...where,
        lastEnrichedAt: { not: null },
      },
    });

    const withForecasts = await prisma.company.count({
      where: {
        ...where,
        forecasts: {
          some: {},
        },
      },
    });

    // Coverage by county
    const countyCoverage = await prisma.company.groupBy({
      by: ["countySlug"],
      where: {
        ...where,
        countySlug: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Coverage by industry
    const industryCoverage = await prisma.company.groupBy({
      by: ["industrySlug"],
      where: {
        ...where,
        industrySlug: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Duplicate risk indicators
    const duplicateDomains = await prisma.$queryRaw<Array<{ domain: string; count: bigint }>>`
      SELECT domain, COUNT(*) as count
      FROM companies
      WHERE domain IS NOT NULL
        AND is_demo = false
        AND merged_into_company_id IS NULL
        AND is_public = true
      GROUP BY domain
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `;

    const duplicateNames = await prisma.$queryRaw<Array<{ normalized_name: string; count: bigint }>>`
      SELECT 
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) as normalized_name,
        COUNT(*) as count
      FROM companies
      WHERE cui IS NULL
        AND is_demo = false
        AND merged_into_company_id IS NULL
        AND is_public = true
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `;

    // Top missing data segments
    const missingCounty = await prisma.company.count({
      where: { ...where, countySlug: null },
    });

    const missingIndustry = await prisma.company.count({
      where: { ...where, industrySlug: null },
    });

    const missingDomain = await prisma.company.count({
      where: { ...where, domain: null },
    });

    const missingFinancials = await prisma.company.count({
      where: {
        ...where,
        lastFinancialSyncAt: null,
        revenueLatest: null,
        profitLatest: null,
      },
    });

    // Compute Coverage Score (0-100)
    const coverageScore = computeCoverageScore({
      totalCompanies,
      withCUI,
      withDomain,
      withIndustry,
      withCounty,
      withFinancials,
      duplicateDomains: duplicateDomains.length,
      duplicateNames: duplicateNames.length,
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalCompanies,
        withCUI,
        withDomain,
        withIndustry,
        withCounty,
        withFinancials,
        withSEAP,
        withEUFunds,
        withEnrichment,
        withForecasts,
        coverageScore,
        countyCoverage: countyCoverage.map((c) => ({
          countySlug: c.countySlug,
          count: c._count.id,
        })),
        industryCoverage: industryCoverage.map((i) => ({
          industrySlug: i.industrySlug,
          count: i._count.id,
        })),
        duplicateRisks: {
          duplicateDomains: duplicateDomains.map((d) => ({
            domain: d.domain,
            count: Number(d.count),
          })),
          duplicateNames: duplicateNames.map((n) => ({
            normalizedName: n.normalized_name,
            count: Number(n.count),
          })),
        },
        missingData: {
          missingCounty,
          missingIndustry,
          missingDomain,
          missingFinancials,
        },
      },
    });
  } catch (error) {
    console.error("[admin/coverage/stats] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Compute Coverage Score (0-100)
 */
function computeCoverageScore(stats: {
  totalCompanies: number;
  withCUI: number;
  withDomain: number;
  withIndustry: number;
  withCounty: number;
  withFinancials: number;
  duplicateDomains: number;
  duplicateNames: number;
}): number {
  if (stats.totalCompanies === 0) return 0;

  // Completeness score (70% of total)
  const completenessScore = (
    (stats.withCUI / stats.totalCompanies) * 20 +
    (stats.withDomain / stats.totalCompanies) * 15 +
    (stats.withIndustry / stats.totalCompanies) * 15 +
    (stats.withCounty / stats.totalCompanies) * 10 +
    (stats.withFinancials / stats.totalCompanies) * 10
  );

  // Dedupe health score (30% of total)
  // Penalize for duplicates
  const duplicatePenalty = Math.min(
    30,
    (stats.duplicateDomains * 2) + (stats.duplicateNames * 1)
  );
  const dedupeScore = Math.max(0, 30 - duplicatePenalty);

  return Math.round(completenessScore + dedupeScore);
}
