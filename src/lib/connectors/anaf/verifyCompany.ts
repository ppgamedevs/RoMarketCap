/**
 * ANAF Verification Service (Safe Mode)
 * 
 * PROMPT 52: Normalized verification service that returns a clean, standardized result.
 * This service queries public ANAF endpoints or published datasets ONLY.
 * 
 * DO NOT attempt to scrape restricted/private endpoints.
 */

import { verifyCompanyANAF as verifyCompanyANAFInternal } from "@/src/lib/verification/anaf";
import { normalizeCUI } from "@/src/lib/ingestion/cuiValidation";

export type ANAFVerificationResult = {
  cui: string;
  officialName?: string;
  isActive?: boolean;
  vatRegistered?: boolean;
  source: "ANAF";
  verifiedAt: Date;
};

/**
 * Verify company by CUI
 * 
 * Returns normalized object with:
 * - cui: Normalized CUI
 * - officialName: Official company name from ANAF (if available)
 * - isActive: Active/inactive status (if available)
 * - vatRegistered: VAT registration status (if available)
 * - source: Always "ANAF"
 * - verifiedAt: Verification timestamp
 * 
 * If data is unavailable, returns minimal object with verifiedAt and source.
 * DO NOT throw - always returns a result.
 */
export async function verifyCompany(cui: string): Promise<ANAFVerificationResult> {
  const normalized = normalizeCUI(cui);
  if (!normalized) {
    // Return minimal result for invalid CUI
    return {
      cui: cui, // Return original if normalization fails
      source: "ANAF",
      verifiedAt: new Date(),
    };
  }

  try {
    // Use internal verification function
    const result = await verifyCompanyANAFInternal(normalized);

    // If verification failed or is pending, return minimal result
    if (result.verificationStatus !== "SUCCESS") {
      return {
        cui: normalized,
        source: "ANAF",
        verifiedAt: result.verifiedAt,
      };
    }

    // Extract official name from raw response if available
    let officialName: string | undefined;
    if (result.rawResponse && typeof result.rawResponse === "object") {
      const raw = result.rawResponse as Record<string, unknown>;
      // Try common ANAF response fields for company name
      officialName =
        (raw.denumire as string) ||
        (raw.denumireCompleta as string) ||
        (raw.denumireComplet as string) ||
        (raw.nume as string) ||
        undefined;
    }

    return {
      cui: normalized,
      officialName,
      isActive: result.isActive,
      vatRegistered: result.isVatRegistered,
      source: "ANAF",
      verifiedAt: result.verifiedAt,
    };
  } catch (error) {
    // Never throw - return minimal result on error
    console.error(`[anaf-verify] Error verifying CUI ${normalized}:`, error);
    return {
      cui: normalized,
      source: "ANAF",
      verifiedAt: new Date(),
    };
  }
}

