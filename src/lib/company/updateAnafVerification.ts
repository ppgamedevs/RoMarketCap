/**
 * Update Company with ANAF verification results
 * 
 * PROMPT 52: Helper to update Company fields based on ANAF verification.
 * 
 * Rules:
 * - Never overwrite user-submitted names unless confidence is higher
 * - Always update anafVerifiedAt
 * - Increase dataConfidence when verification succeeds
 */

import { prisma } from "@/src/lib/db";
import { ANAFVerificationResult } from "@/src/lib/connectors/anaf/verifyCompany";

/**
 * Update company with ANAF verification results
 * 
 * @param companyId Company ID
 * @param verification ANAF verification result
 */
export async function updateAnafVerification(
  companyId: string,
  verification: ANAFVerificationResult,
): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      verification: true,
      claims: {
        where: { status: "APPROVED" },
        take: 1,
      },
      submissions: {
        where: { status: "APPROVED" },
        take: 1,
      },
    },
  });

  if (!company) {
    return;
  }

  // Determine if we have user-submitted data (higher confidence)
  const hasUserSubmittedName = company.claims.length > 0 || company.submissions.length > 0;
  const hasHighConfidence = (company.sourceConfidence ?? 50) >= 70;

  // Build update data
  const updateData: {
    anafVerifiedAt: Date;
    vatRegistered?: boolean;
    officialName?: string;
    dataConfidence?: number;
  } = {
    anafVerifiedAt: verification.verifiedAt,
  };

  // Update VAT registration status (always update, it's a fact)
  if (verification.vatRegistered !== undefined) {
    updateData.vatRegistered = verification.vatRegistered;
  }

  // Update official name only if:
  // 1. We have an official name from ANAF
  // 2. AND (no user-submitted name OR ANAF confidence is higher)
  if (verification.officialName) {
    const shouldUpdateName =
      !hasUserSubmittedName || // No user submission, safe to update
      (!hasHighConfidence && verification.isActive); // Low confidence user data, but ANAF is active (higher trust)

    if (shouldUpdateName) {
      // Only update if current name is different or missing
      if (!company.legalName || company.legalName !== verification.officialName) {
        updateData.officialName = verification.officialName;
        // Also update legalName if it's empty or different
        // But preserve user-submitted names if they exist
        if (!hasUserSubmittedName) {
          await prisma.company.update({
            where: { id: companyId },
            data: {
              ...updateData,
              legalName: verification.officialName,
            },
          });
          return; // Early return to avoid double update
        }
      }
    }
  }

  // Increase data confidence when verification succeeds
  if (verification.isActive === true && verification.vatRegistered !== undefined) {
    const currentConfidence = company.dataConfidence ?? 50;
    // Boost confidence by 5-10 points for successful verification
    const confidenceBoost = verification.vatRegistered ? 10 : 5;
    updateData.dataConfidence = Math.min(100, currentConfidence + confidenceBoost);
  }

  // Update company
  await prisma.company.update({
    where: { id: companyId },
    data: updateData,
  });
}

