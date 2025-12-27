/**
 * PROMPT 56: Ranking Integrity Rules
 * 
 * Ensures rankings are stable, fair, and not manipulable
 */

import { Prisma, CompanyRiskFlag } from "@prisma/client";

/**
 * Minimum data confidence threshold for appearing in top lists
 */
const MIN_DATA_CONFIDENCE = 40;

/**
 * Risk flags that should exclude companies from rankings
 */
const EXCLUDING_RISK_FLAGS: CompanyRiskFlag[] = [
  CompanyRiskFlag.SUSPICIOUS_ACTIVITY,
  // Add more as needed
];

/**
 * Ranking guard filter
 */
export type RankingGuardFilter = {
  where: Prisma.CompanyWhereInput;
  orderBy: Prisma.CompanyOrderByWithRelationInput[];
};

/**
 * Build ranking guard filter
 * 
 * Excludes:
 * - DEMO companies when LAUNCH_MODE=1
 * - Companies below minimum data confidence
 * - Companies with excluding risk flags
 * 
 * Ensures deterministic tie-breakers:
 * - romcAiScore desc
 * - dataConfidence desc
 * - lastScoredAt desc
 * - CUI asc
 */
export function buildRankingGuard(launchMode: boolean = false): RankingGuardFilter {
  const where: Prisma.CompanyWhereInput = {
    isPublic: true,
    visibilityStatus: "PUBLIC",
    dataConfidence: {
      gte: MIN_DATA_CONFIDENCE,
    },
    // PROMPT 57: Exclude skeleton companies from rankings
    isSkeleton: false,
    // PROMPT 60: Exclude merged companies (only show canonical)
    mergedIntoCompanyId: null,
  };

  // Exclude DEMO companies in launch mode
  if (launchMode) {
    where.isDemo = false;
  }

  // Exclude companies with risk flags
  where.NOT = {
    companyRiskFlags: {
      hasSome: EXCLUDING_RISK_FLAGS,
    },
  };

  // Deterministic tie-breakers
  const orderBy: Prisma.CompanyOrderByWithRelationInput[] = [
    { romcAiScore: "desc" },
    { dataConfidence: "desc" },
    { lastScoredAt: "desc" },
    { cui: "asc" },
  ];

  return {
    where,
    orderBy,
  };
}

/**
 * Check if company should be included in rankings
 */
export function shouldIncludeInRanking(company: {
  isDemo: boolean;
  dataConfidence: number | null;
  companyRiskFlags: string[];
  isPublic: boolean;
  visibilityStatus: string;
  isSkeleton?: boolean;
  mergedIntoCompanyId?: string | null;
}, launchMode: boolean = false): boolean {
  // Must be public
  if (!company.isPublic || company.visibilityStatus !== "PUBLIC") {
    return false;
  }

  // PROMPT 57: Exclude skeleton companies
  if (company.isSkeleton === true) {
    return false;
  }

  // PROMPT 60: Exclude merged companies
  if (company.mergedIntoCompanyId) {
    return false;
  }

  // Exclude DEMO in launch mode
  if (launchMode && company.isDemo) {
    return false;
  }

  // Must meet minimum confidence
  if ((company.dataConfidence ?? 0) < MIN_DATA_CONFIDENCE) {
    return false;
  }

  // Must not have excluding risk flags
  for (const flag of EXCLUDING_RISK_FLAGS) {
    if (company.companyRiskFlags.includes(flag as string)) {
      return false;
    }
  }

  return true;
}

