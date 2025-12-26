/**
 * PROMPT 57: Skeleton Company Creation
 * 
 * Creates minimal company records with only public identifiers.
 * No financials, no scoring, just enough for indexing.
 */

import { prisma } from "@/src/lib/db";
import { normalizeCUI, isValidCUI } from "@/src/lib/ingestion/cuiValidation";
import { makeCompanySlug } from "@/src/lib/slug";
import type { SkeletonCompanyInput, UniverseSource } from "./types";

/**
 * Create or update a skeleton company
 * 
 * Returns: { companyId, created, isSkeleton }
 */
export async function upsertSkeletonCompany(input: SkeletonCompanyInput): Promise<{
  companyId: string;
  created: boolean;
  isSkeleton: boolean;
}> {
  const cui = normalizeCUI(input.cui);
  if (!cui || !isValidCUI(cui)) {
    throw new Error(`Invalid CUI: ${input.cui}`);
  }

  // Check if company exists
  const existing = await prisma.company.findUnique({
    where: { cui },
    select: { id: true, isSkeleton: true },
  });

  if (existing) {
    // Update skeleton status if needed
    if (existing.isSkeleton) {
      // Keep as skeleton if still minimal
      return {
        companyId: existing.id,
        created: false,
        isSkeleton: true,
      };
    }
    // Already active, don't downgrade
    return {
      companyId: existing.id,
      created: false,
      isSkeleton: false,
    };
  }

  // Create new skeleton company
  const slug = makeCompanySlug(input.legalName, cui);

  const company = await prisma.company.create({
    data: {
      cui,
      slug,
      name: input.legalName,
      legalName: input.legalName,
      countySlug: input.countySlug || null,
      caenCode: input.caenCode || null,
      foundedAt: input.foundedAt || null,
      foundedYear: input.foundedAt ? input.foundedAt.getFullYear() : null,
      universeSource: input.universeSource,
      universeConfidence: input.universeConfidence,
      universeVerified: input.universeVerified || false,
      isSkeleton: true, // Mark as skeleton
      isPublic: true,
      visibilityStatus: "PUBLIC",
      sourceConfidence: input.universeConfidence,
      dataConfidence: input.universeConfidence,
      // No financials, no scoring
      employees: null,
      revenueLatest: null,
      profitLatest: null,
      romcScore: null,
      romcAiScore: null,
      lastScoredAt: null,
    },
  });

  return {
    companyId: company.id,
    created: true,
    isSkeleton: true,
  };
}

/**
 * Check if company should be promoted from skeleton to active
 * 
 * Promotion happens when:
 * - Has financial data (revenueLatest or employees)
 * - Has been enriched
 * - Has been claimed
 * - Has ROMC AI score
 */
export async function checkSkeletonPromotion(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      isSkeleton: true,
      revenueLatest: true,
      employees: true,
      lastEnrichedAt: true,
      isClaimed: true,
      romcAiScore: true,
    },
  });

  if (!company || !company.isSkeleton) {
    return false; // Not a skeleton or doesn't exist
  }

  // Check promotion criteria
  const hasFinancials = company.revenueLatest != null || company.employees != null;
  const hasEnrichment = company.lastEnrichedAt != null;
  const hasClaim = company.isClaimed;
  const hasScore = company.romcAiScore != null;

  if (hasFinancials || hasEnrichment || hasClaim || hasScore) {
    // Promote to active
    await prisma.company.update({
      where: { id: companyId },
      data: { isSkeleton: false },
    });
    return true;
  }

  return false;
}

