/**
 * PROMPT 54: Verification and Upsert Logic
 * 
 * Takes DiscoveredCompany records, verifies them via ANAF,
 * and upserts Company records with provenance.
 */

import { prisma } from "@/src/lib/db";
import { DiscoveryStatus, DiscoverySource } from "@prisma/client";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";
import { makeCompanySlug } from "@/src/lib/slug";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { computeScoreForCompany } from "@/src/lib/scoring/computeScoreForCompany";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";
import { hashRow } from "@/src/lib/ingestion/provenance";

/**
 * Verify and upsert a discovered company
 * 
 * @param discoveredCompanyId - ID of DiscoveredCompany record
 * @param budgetRemaining - Remaining budget for verification (decremented)
 * @returns Result of verification/upsert
 */
export async function verifyAndUpsert(
  discoveredCompanyId: string,
  budgetRemaining: { count: number },
): Promise<{
  success: boolean;
  companyId?: string;
  status: DiscoveryStatus;
  error?: string;
}> {
  // Check budget
  if (budgetRemaining.count <= 0) {
    return {
      success: false,
      status: "ERROR",
      error: "Budget exhausted",
    };
  }

  // Get discovered company
  const discovered = await prisma.discoveredCompany.findUnique({
    where: { id: discoveredCompanyId },
  });

  if (!discovered) {
    return {
      success: false,
      status: "ERROR",
      error: "DiscoveredCompany not found",
    };
  }

  // Skip if already verified or invalid
  if (discovered.status === "VERIFIED" || discovered.status === "INVALID" || discovered.status === "REJECTED") {
    return {
      success: true,
      companyId: discovered.linkedCompanyId || undefined,
      status: discovered.status,
    };
  }

  // Update try count and last tried
  await prisma.discoveredCompany.update({
    where: { id: discoveredCompanyId },
    data: {
      tryCount: { increment: 1 },
      lastTriedAt: new Date(),
    },
  });

  try {
    // Verify via ANAF
    const verification = await verifyCompany(discovered.cui);

    // Check if company exists in ANAF
    if (verification.isActive === undefined || verification.isActive === false) {
      // Not found or inactive
      await prisma.discoveredCompany.update({
        where: { id: discoveredCompanyId },
        data: {
          status: "INVALID",
          lastError: "Company not found or inactive in ANAF",
        },
      });

      budgetRemaining.count--;
      return {
        success: false,
        status: "INVALID",
        error: "Company not found or inactive in ANAF",
      };
    }

    // Company exists and is active - upsert Company
    const evidenceCompanyName = discovered.evidenceJson && typeof discovered.evidenceJson === 'object' && 'companyName' in discovered.evidenceJson ? String((discovered.evidenceJson as Record<string, unknown>).companyName) : null;
    const officialName = verification.officialName || evidenceCompanyName || `Company ${discovered.cui}`;
    const slug = makeCompanySlug(officialName, discovered.cui);
    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${discovered.cui.toLowerCase()}` : slug;

    // Check if company already exists by CUI
    const existingCompany = await prisma.company.findUnique({
      where: { cui: discovered.cui },
    });

    let companyId: string;
    let created = false;

    if (existingCompany) {
      // Update existing company (minimal - don't overwrite)
      companyId = existingCompany.id;
    } else {
      // Create new company
      const company = await prisma.company.create({
        data: {
          slug: finalSlug,
          name: officialName,
          legalName: officialName,
          cui: discovered.cui,
          country: "RO",
          isPublic: true,
          visibilityStatus: "PUBLIC",
          sourceConfidence: 60, // Moderate confidence for discovered companies
          dataConfidence: 60,
          isActive: true,
          vatRegistered: verification.vatRegistered || false,
        },
      });
      companyId = company.id;
      created = true;
    }

    // Link discovered company to company
    await prisma.discoveredCompany.update({
      where: { id: discoveredCompanyId },
      data: {
        status: "VERIFIED",
        linkedCompanyId: companyId,
        lastError: null,
      },
    });

    // Create/update provenance
    const evidence = discovered.evidenceJson as Record<string, unknown>;
    const rowHash = hashRow(evidence);

    const existingProvenance = await prisma.companyProvenance.findUnique({
      where: {
        company_provenance_unique: {
          companyId,
          sourceName: discovered.source,
          rowHash,
        },
      },
    });

    if (!existingProvenance) {
      await prisma.companyProvenance.create({
        data: {
          companyId,
          sourceName: discovered.source,
          rowHash,
          discoverySource: discovered.source,
          evidenceUrl: evidence.url as string | undefined,
          evidenceJson: evidence as Record<string, unknown>,
          confidenceScore: 70, // Good confidence for verified companies
          firstSeenAt: discovered.discoveredAt,
          lastSeenAt: new Date(),
          rawJson: evidence,
          externalId: (evidence.contractId || evidence.fundProjectId || evidence.awardNoticeId) as string | undefined,
          contractValue: evidence.value || evidence.amount ? (typeof (evidence.value || evidence.amount) === "number" ? (evidence.value || evidence.amount) as number : parseFloat(String(evidence.value || evidence.amount))) : undefined,
          contractYear: evidence.year as number | undefined,
          contractingAuthority: (evidence.authorityName || evidence.programName) as string | undefined,
        },
      });
    } else {
      await prisma.companyProvenance.update({
        where: { id: existingProvenance.id },
        data: {
          lastSeenAt: new Date(),
          evidenceUrl: evidence.url as string | undefined,
        },
      });
    }

    // Trigger scoring and integrity updates (only for new companies or budget allows)
    if (created || budgetRemaining.count > 10) {
      await Promise.all([
        updateCompanyRomcV1ById(companyId).catch(() => null),
        updateCompanyRomcAiById(companyId).catch(() => null),
        computeScoreForCompany(companyId).catch(() => null),
        updateCompanyIntegrity(companyId).catch(() => null),
      ]);
    }

    budgetRemaining.count--;
    return {
      success: true,
      companyId,
      status: "VERIFIED",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.discoveredCompany.update({
      where: { id: discoveredCompanyId },
      data: {
        status: "ERROR",
        lastError: errorMessage,
      },
    });

    budgetRemaining.count--;
    return {
      success: false,
      status: "ERROR",
      error: errorMessage,
    };
  }
}
