/**
 * PROMPT 60: Identity Resolution Engine
 * 
 * Deterministic engine for matching and deduplicating companies.
 * Creates merge candidates with confidence scores.
 */

import { prisma } from "@/src/lib/db";
import { normalizeCUI } from "@/src/lib/ingestion/cuiValidation";
import { normalizeQuery } from "@/src/lib/search/normalize";
import { normalizeDomain } from "@/src/lib/ingestion/merge";

export type MatchReason = 
  | "CUI_EXACT"
  | "NAME_HIGH"
  | "NAME_MEDIUM"
  | "DOMAIN_EXACT"
  | "DOMAIN_HIGH"
  | "COUNTY_INDUSTRY"
  | "PHONE_EMAIL";

export type MergeCandidateData = {
  sourceCompanyId: string;
  targetCompanyId: string;
  confidence: number; // 0-100
  matchReasons: MatchReason[];
  diffJson: {
    source: Record<string, unknown>;
    target: Record<string, unknown>;
  };
};

/**
 * Normalize company name for matching:
 * - Remove SRL, SA, SC, PFA, etc.
 * - Remove diacritics
 * - Remove punctuation
 * - Lowercase
 */
export function normalizeCompanyName(name: string | null | undefined): string | null {
  if (!name) return null;

  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/\b(srl|sa|sc|pfa|snc|ra|s\.c\.|s\.a\.|s\.r\.l\.)\b/gi, "") // Remove company types
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Compute confidence score for name match
 */
function computeNameConfidence(
  name1: string | null,
  name2: string | null
): { confidence: number; reason: MatchReason | null } {
  if (!name1 || !name2) {
    return { confidence: 0, reason: null };
  }

  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);

  if (!norm1 || !norm2) {
    return { confidence: 0, reason: null };
  }

  // Exact match after normalization
  if (norm1 === norm2) {
    return { confidence: 90, reason: "NAME_HIGH" };
  }

  // High similarity (one contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length >= norm2.length ? norm1 : norm2;
    // If shorter is at least 70% of longer, consider it high confidence
    if (shorter.length / longer.length >= 0.7) {
      return { confidence: 75, reason: "NAME_HIGH" };
    }
  }

  // Medium similarity (shared significant words)
  const words1 = new Set(norm1.split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(norm2.split(/\s+/).filter((w) => w.length > 3));
  
  if (words1.size > 0 && words2.size > 0) {
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    const jaccard = intersection.size / union.size;
    
    if (jaccard >= 0.6) {
      return { confidence: 60, reason: "NAME_MEDIUM" };
    }
  }

  return { confidence: 0, reason: null };
}

/**
 * Compute confidence score for domain match
 */
export function computeDomainConfidence(
  domain1: string | null | undefined,
  domain2: string | null | undefined
): { confidence: number; reason: MatchReason | null } {
  if (!domain1 || !domain2) {
    return { confidence: 0, reason: null };
  }

  const norm1 = normalizeDomain(domain1);
  const norm2 = normalizeDomain(domain2);

  if (!norm1 || !norm2) {
    return { confidence: 0, reason: null };
  }

  if (norm1 === norm2) {
    return { confidence: 85, reason: "DOMAIN_EXACT" };
  }

  // Subdomain match (e.g., www.example.com vs example.com)
  if (norm1.endsWith(norm2) || norm2.endsWith(norm1)) {
    return { confidence: 70, reason: "DOMAIN_HIGH" };
  }

  return { confidence: 0, reason: null };
}

/**
 * Compute confidence score for county + industry match
 */
function computeCountyIndustryConfidence(
  county1: string | null | undefined,
  county2: string | null | undefined,
  industry1: string | null | undefined,
  industry2: string | null | undefined
): { confidence: number; reason: MatchReason | null } {
  if (!county1 || !county2 || !industry1 || !industry2) {
    return { confidence: 0, reason: null };
  }

  const countyMatch = county1.toLowerCase() === county2.toLowerCase() ||
                      (county1.toLowerCase().includes(county2.toLowerCase()) ||
                       county2.toLowerCase().includes(county1.toLowerCase()));
  const industryMatch = industry1.toLowerCase() === industry2.toLowerCase() ||
                        (industry1.toLowerCase().includes(industry2.toLowerCase()) ||
                         industry2.toLowerCase().includes(industry1.toLowerCase()));

  if (countyMatch && industryMatch) {
    return { confidence: 50, reason: "COUNTY_INDUSTRY" };
  }

  return { confidence: 0, reason: null };
}

/**
 * Compute confidence score for phone/email match
 */
function computeContactConfidence(
  phone1: string | null | undefined,
  phone2: string | null | undefined,
  email1: string | null | undefined,
  email2: string | null | undefined
): { confidence: number; reason: MatchReason | null } {
  if ((phone1 && phone2 && phone1 === phone2) ||
      (email1 && email2 && email1.toLowerCase() === email2.toLowerCase())) {
    return { confidence: 80, reason: "PHONE_EMAIL" };
  }

  return { confidence: 0, reason: null };
}

/**
 * Find potential merge candidates for a company
 */
export async function findMergeCandidates(
  companyId: string,
  options: {
    minConfidence?: number;
    excludeExisting?: boolean;
  } = {}
): Promise<MergeCandidateData[]> {
  const { minConfidence = 50, excludeExisting = true } = options;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      cui: true,
      name: true,
      legalName: true,
      domain: true,
      county: true,
      countySlug: true,
      industry: true,
      industrySlug: true,
      phone: true,
      email: true,
      website: true,
      address: true,
      isDemo: true,
      mergedIntoCompanyId: true,
    },
  });

  if (!company || company.isDemo || company.mergedIntoCompanyId) {
    return [];
  }

  const candidates: MergeCandidateData[] = [];

  // Build query conditions
  const where: any = {
    id: { not: companyId },
    isDemo: false,
    mergedIntoCompanyId: null,
  };

  // If company has CUI, find exact CUI matches first
  if (company.cui) {
    const cuiMatches = await prisma.company.findMany({
      where: {
        ...where,
        cui: company.cui,
      },
      select: {
        id: true,
        cui: true,
        name: true,
        legalName: true,
        domain: true,
        county: true,
        countySlug: true,
        industry: true,
        industrySlug: true,
        phone: true,
        email: true,
        website: true,
        address: true,
      },
    });

    for (const match of cuiMatches) {
      // CUI match is always high confidence
      const diffJson = {
        source: {
          name: company.name,
          legalName: company.legalName,
          domain: company.domain,
          county: company.county,
          industry: company.industry,
        },
        target: {
          name: match.name,
          legalName: match.legalName,
          domain: match.domain,
          county: match.county,
          industry: match.industry,
        },
      };

      candidates.push({
        sourceCompanyId: company.id,
        targetCompanyId: match.id,
        confidence: 95,
        matchReasons: ["CUI_EXACT"],
        diffJson,
      });
    }
  }

  // If no CUI or we want to find more candidates, try probabilistic matching
  if (!company.cui || candidates.length === 0) {
    // Find companies with similar normalized names
    const normalizedName = normalizeCompanyName(company.name || company.legalName);
    
    if (normalizedName) {
      // Get all companies (we'll filter in memory for name matching)
      // This is not ideal for scale, but for v1 it's acceptable
      const allCompanies = await prisma.company.findMany({
        where,
        select: {
          id: true,
          cui: true,
          name: true,
          legalName: true,
          domain: true,
          county: true,
          countySlug: true,
          industry: true,
          industrySlug: true,
          phone: true,
          email: true,
          website: true,
          address: true,
        },
        take: 1000, // Limit for v1
      });

      for (const candidate of allCompanies) {
        // Skip if already in candidates
        if (candidates.some((c) => c.targetCompanyId === candidate.id)) {
          continue;
        }

        // Never merge if both have CUIs and they differ
        if (company.cui && candidate.cui && company.cui !== candidate.cui) {
          continue;
        }

        const matchReasons: MatchReason[] = [];
        let confidence = 0;

        // Name match
        const nameMatch = computeNameConfidence(
          company.name || company.legalName,
          candidate.name || candidate.legalName
        );
        if (nameMatch.confidence > 0) {
          confidence = Math.max(confidence, nameMatch.confidence);
          if (nameMatch.reason) matchReasons.push(nameMatch.reason);
        }

        // Domain match
        const domainMatch = computeDomainConfidence(
          company.domain || company.website,
          candidate.domain || candidate.website
        );
        if (domainMatch.confidence > 0) {
          confidence = Math.max(confidence, domainMatch.confidence);
          if (domainMatch.reason) matchReasons.push(domainMatch.reason);
        }

        // County + Industry match (only if we have name match)
        if (nameMatch.confidence >= 60) {
          const countyIndustryMatch = computeCountyIndustryConfidence(
            company.county || company.countySlug,
            candidate.county || candidate.countySlug,
            company.industry || company.industrySlug,
            candidate.industry || candidate.industrySlug
          );
          if (countyIndustryMatch.confidence > 0) {
            confidence = Math.min(100, confidence + countyIndustryMatch.confidence);
            if (countyIndustryMatch.reason) matchReasons.push(countyIndustryMatch.reason);
          }
        }

        // Contact match
        const contactMatch = computeContactConfidence(
          company.phone,
          candidate.phone,
          company.email,
          candidate.email
        );
        if (contactMatch.confidence > 0) {
          confidence = Math.max(confidence, contactMatch.confidence);
          if (contactMatch.reason) matchReasons.push(contactMatch.reason);
        }

        if (confidence >= minConfidence && matchReasons.length > 0) {
          const diffJson = {
            source: {
              name: company.name,
              legalName: company.legalName,
              domain: company.domain,
              county: company.county,
              industry: company.industry,
              phone: company.phone,
              email: company.email,
            },
            target: {
              name: candidate.name,
              legalName: candidate.legalName,
              domain: candidate.domain,
              county: candidate.county,
              industry: candidate.industry,
              phone: candidate.phone,
              email: candidate.email,
            },
          };

          candidates.push({
            sourceCompanyId: company.id,
            targetCompanyId: candidate.id,
            confidence,
            matchReasons,
            diffJson,
          });
        }
      }
    }
  }

  // Exclude existing merge candidates if requested
  if (excludeExisting) {
    const existing = await prisma.mergeCandidate.findMany({
      where: {
        sourceCompanyId: companyId,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { targetCompanyId: true },
    });

    const existingIds = new Set(existing.map((e) => e.targetCompanyId));
    return candidates.filter((c) => !existingIds.has(c.targetCompanyId));
  }

  return candidates;
}

