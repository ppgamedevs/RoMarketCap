/**
 * Post-ingestion hooks
 * 
 * Triggers after company ingestion:
 * - ROMC score calculation
 * - Data confidence boost
 * - Enrichment scheduling
 */

import { prisma } from "@/src/lib/db";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { computeScoreForCompany } from "@/src/lib/scoring/computeScoreForCompany";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";

/**
 * Apply post-ingestion hooks for a company.
 * This is called after a company is created or updated via national ingestion.
 */
export async function applyPostIngestionHooks(companyId: string): Promise<void> {
  try {
    // 1. Trigger ROMC score calculation (v1 and AI)
    await Promise.all([
      updateCompanyRomcV1ById(companyId).catch((error) => {
        console.error(`[post-hooks] Failed to update ROMC v1 for ${companyId}:`, error);
      }),
      updateCompanyRomcAiById(companyId).catch((error) => {
        console.error(`[post-hooks] Failed to update ROMC AI for ${companyId}:`, error);
      }),
      computeScoreForCompany(companyId).catch((error) => {
        console.error(`[post-hooks] Failed to compute score-v0 for ${companyId}:`, error);
      }),
    ]);

    // 2. Update integrity and confidence
    // This includes recalculating data confidence (which now includes SEAP/EU_FUNDS provenance with 1.2x weight)
    await updateCompanyIntegrity(companyId).catch((error) => {
      console.error(`[post-hooks] Failed to update integrity for ${companyId}:`, error);
    });

    // 3. Schedule enrichment (mark company as needing enrichment)
    // The existing enrichment cron will pick it up
    // We can optionally set a flag or just rely on the enrichment cron's logic
    // For now, we'll just ensure the company is marked as public and active
    await prisma.company.update({
      where: { id: companyId },
      data: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        isActive: true,
      },
    }).catch((error) => {
      console.error(`[post-hooks] Failed to update company visibility for ${companyId}:`, error);
    });

  } catch (error) {
    // Log but don't throw - post-hooks shouldn't fail ingestion
    console.error(`[post-hooks] Error applying hooks for ${companyId}:`, error);
  }
}

