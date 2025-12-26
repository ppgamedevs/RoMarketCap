/**
 * Update company integrity score and risk flags based on ANAF verification
 * 
 * This function enhances the integrity score calculation to include verification status.
 * It does NOT overwrite Company core fields - only updates confidence and risk flags.
 */

import { PrismaClient, CompanyRiskFlag } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Calculate confidence boost from verification
 */
function getVerificationConfidenceBoost(verification: {
  isActive: boolean;
  isVatRegistered: boolean;
  verificationStatus: "SUCCESS" | "ERROR" | "PENDING";
} | null): number {
  if (!verification || verification.verificationStatus !== "SUCCESS") {
    return 0;
  }

  let boost = 0;

  // Active status adds confidence
  if (verification.isActive) {
    boost += 10;
  } else {
    // Inactive reduces confidence
    boost -= 20;
  }

  // VAT registration adds confidence
  if (verification.isVatRegistered) {
    boost += 5;
  }

  return boost;
}

/**
 * Get risk flags based on verification
 */
function getVerificationRiskFlags(verification: {
  isActive: boolean;
  verificationStatus: "SUCCESS" | "ERROR" | "PENDING";
} | null): string[] {
  const flags: string[] = [];

  if (!verification) {
    return flags;
  }

  if (verification.verificationStatus === "ERROR") {
    flags.push("VERIFICATION_FAILED");
  }

  if (verification.verificationStatus === "SUCCESS" && !verification.isActive) {
    flags.push("INACTIVE_IN_ANAF");
  }

  return flags;
}

/**
 * Update company integrity and confidence based on verification
 */
export async function updateIntegrityWithVerification(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { verification: true },
  });

  if (!company) {
    return;
  }

  const verification = company.verification;

  // Calculate confidence boost
  const confidenceBoost = getVerificationConfidenceBoost(
    verification
      ? {
          isActive: verification.isActive,
          isVatRegistered: verification.isVatRegistered,
          verificationStatus: verification.verificationStatus as "SUCCESS" | "ERROR" | "PENDING",
        }
      : null,
  );
  const baseConfidence = company.dataConfidence ?? 50;
  const newConfidence = Math.max(0, Math.min(100, baseConfidence + confidenceBoost));

  // Get risk flags
  const verificationFlags = getVerificationRiskFlags(
    verification
      ? {
          isActive: verification.isActive,
          verificationStatus: verification.verificationStatus as "SUCCESS" | "ERROR" | "PENDING",
        }
      : null,
  );
  const existingFlags = (company.companyRiskFlags || []) as CompanyRiskFlag[];
  
  // Remove old verification-related flags
  // Note: These flags need to be added to the CompanyRiskFlag enum in the schema
  // For now, we filter by casting the string to enum type for comparison
  const filteredFlags = existingFlags.filter(
    (flag) => flag !== ("VERIFICATION_FAILED" as CompanyRiskFlag) && flag !== ("INACTIVE_IN_ANAF" as CompanyRiskFlag),
  );
  
  // Add new flags (cast to enum type - these should be added to the enum)
  const newFlags = [...new Set([...filteredFlags, ...(verificationFlags as CompanyRiskFlag[])])] as CompanyRiskFlag[];

  // Update company (only confidence and risk flags, never core fields)
  await prisma.company.update({
    where: { id: companyId },
    data: {
      dataConfidence: newConfidence,
      companyRiskFlags: newFlags,
    },
  });
}

