/**
 * PROMPT 56: Coverage statistics API
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export async function GET() {
  try {
    await requireAdmin();

    const [
      total,
      withDomain,
      withIndustry,
      withCounty,
      withRevenue,
      withEmployees,
      scored,
      enriched,
      confidenceLow,
      confidenceMedium,
      confidenceHigh,
      integrityLow,
      integrityMedium,
      integrityHigh,
    ] = await Promise.all([
      prisma.company.count({ where: { isPublic: true } }),
      prisma.company.count({ where: { isPublic: true, domain: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, industrySlug: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, countySlug: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, revenueLatest: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, employees: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, lastScoredAt: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, lastEnrichedAt: { not: null } } }),
      prisma.company.count({ where: { isPublic: true, dataConfidence: { lt: 40 } } }),
      prisma.company.count({ where: { isPublic: true, dataConfidence: { gte: 40, lt: 70 } } }),
      prisma.company.count({ where: { isPublic: true, dataConfidence: { gte: 70 } } }),
      prisma.company.count({ where: { isPublic: true, companyIntegrityScore: { lt: 40 } } }),
      prisma.company.count({ where: { isPublic: true, companyIntegrityScore: { gte: 40, lt: 70 } } }),
      prisma.company.count({ where: { isPublic: true, companyIntegrityScore: { gte: 70 } } }),
    ]);

    // Calculate provenance breakdown (sample from fieldProvenance)
    // This is an approximation - we'd need to scan all companies for exact counts
    const provenanceBreakdown = {
      official: 0, // ANAF_VERIFY, EU_FUNDS, SEAP
      thirdParty: 0, // THIRD_PARTY
      userApproved: 0, // USER_APPROVED
      enrichment: 0, // ENRICHMENT
    };

    // Sample 100 companies to estimate provenance breakdown
    const sample = await prisma.company.findMany({
      where: { isPublic: true },
      select: { fieldProvenance: true },
      take: 100,
    });

    for (const company of sample) {
      const provenance = company.fieldProvenance as Record<string, { sourceId: string }> | null;
      if (provenance) {
        for (const fieldProv of Object.values(provenance)) {
          const sourceId = fieldProv.sourceId;
          if (sourceId === "ANAF_VERIFY" || sourceId === "EU_FUNDS" || sourceId === "SEAP") {
            provenanceBreakdown.official++;
          } else if (sourceId === "THIRD_PARTY") {
            provenanceBreakdown.thirdParty++;
          } else if (sourceId === "USER_APPROVED") {
            provenanceBreakdown.userApproved++;
          } else if (sourceId === "ENRICHMENT") {
            provenanceBreakdown.enrichment++;
          }
        }
      }
    }

    // Scale to total (rough estimate)
    const scale = total / 100;
    provenanceBreakdown.official = Math.round(provenanceBreakdown.official * scale);
    provenanceBreakdown.thirdParty = Math.round(provenanceBreakdown.thirdParty * scale);
    provenanceBreakdown.userApproved = Math.round(provenanceBreakdown.userApproved * scale);
    provenanceBreakdown.enrichment = Math.round(provenanceBreakdown.enrichment * scale);

    return NextResponse.json({
      ok: true,
      stats: {
        total,
        withDomain,
        withIndustry,
        withCounty,
        withRevenue,
        withEmployees,
        scored,
        enriched,
        confidenceDistribution: {
          low: confidenceLow,
          medium: confidenceMedium,
          high: confidenceHigh,
        },
        integrityDistribution: {
          low: integrityLow,
          medium: integrityMedium,
          high: integrityHigh,
        },
        provenanceBreakdown,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

