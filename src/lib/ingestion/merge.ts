/**
 * PROMPT 55: Deterministic Merge and Dedupe Rules
 * 
 * Implements conservative matching and merging logic
 */

import type { SourceCompanyRecord, CompanyPatch, CompanyIdentityCandidate } from "./types";
import { normalizeCui } from "@/src/lib/cui/normalize";
import { prisma } from "@/src/lib/db";
import { MERGE_PRIORITY, CONFIDENCE_THRESHOLDS } from "./types";

/**
 * Generic domains that should not be used for matching
 */
const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "yandex.com",
  "zoho.com",
  "company.com",
  "example.com",
  "test.com",
  "localhost",
]);

/**
 * Normalize domain for matching
 */
export function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) {
    return null;
  }

  const normalized = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "") // Remove protocol
    .replace(/^www\./, "") // Remove www
    .replace(/\/.*$/, "") // Remove path
    .split(":")[0]!; // Remove port

  // Reject generic domains
  if (GENERIC_DOMAINS.has(normalized)) {
    return null;
  }

  // Reject if too short or suspicious
  if (normalized.length < 3 || normalized.includes(" ")) {
    return null;
  }

  return normalized;
}

/**
 * Normalize name for matching (conservative)
 */
export function normalizeName(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\w\s]/g, "") // Remove special chars
    .substring(0, 100); // Cap length
}

/**
 * Compute company identity candidates from a record
 */
export function computeCompanyIdentityCandidates(record: SourceCompanyRecord): CompanyIdentityCandidate[] {
  const candidates: CompanyIdentityCandidate[] = [];

  // Primary: CUI
  if (record.cui) {
    candidates.push({ cui: record.cui });
  }

  // Secondary: domain + county (strict)
  const normalizedDomain = normalizeDomain(record.domain);
  if (normalizedDomain && record.countySlug) {
    candidates.push({
      domain: normalizedDomain,
      county: record.countySlug,
    });
  }

  // Tertiary: canonicalSlug + county (if we can derive slug from name)
  if (record.name && record.countySlug) {
    // Note: We'd need to compute slug here, but for now skip name-based matching
    // as it's too risky per requirements
  }

  return candidates;
}

/**
 * Find existing companies matching identity candidates
 */
export async function findMatchingCompanies(
  candidates: CompanyIdentityCandidate[],
): Promise<Array<{ id: string; cui: string | null; domain: string | null; countySlug: string | null }>> {
  if (candidates.length === 0) {
    return [];
  }

  const matches: Array<{ id: string; cui: string | null; domain: string | null; countySlug: string | null }> = [];

  for (const candidate of candidates) {
    if (candidate.cui) {
      // Match by CUI (primary)
      const byCui = await prisma.company.findUnique({
        where: { cui: candidate.cui },
        select: { id: true, cui: true, domain: true, countySlug: true },
      });
      if (byCui && !matches.find((m) => m.id === byCui.id)) {
        matches.push(byCui);
      }
    }

    if (candidate.domain && candidate.county) {
      // Match by domain + county (strict)
      const normalizedDomain = normalizeDomain(candidate.domain);
      if (normalizedDomain) {
        const byDomain = await prisma.company.findMany({
          where: {
            domain: normalizedDomain,
            countySlug: candidate.county,
          },
          select: { id: true, cui: true, domain: true, countySlug: true },
          take: 1,
        });
        for (const match of byDomain) {
          if (!matches.find((m) => m.id === match.id)) {
            matches.push(match);
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Choose best company match from candidates
 */
export async function chooseBestCompanyMatch(
  candidates: CompanyIdentityCandidate[],
): Promise<{ id: string; cui: string | null } | null> {
  const matches = await findMatchingCompanies(candidates);

  if (matches.length === 0) {
    return null;
  }

  // Prefer match with CUI
  const withCui = matches.find((m) => m.cui);
  if (withCui) {
    return { id: withCui.id, cui: withCui.cui };
  }

  // Otherwise return first match
  return { id: matches[0]!.id, cui: matches[0]!.cui };
}

/**
 * Build company patch from source record
 */
export function buildCompanyPatch(record: SourceCompanyRecord): CompanyPatch {
  const patch: CompanyPatch = {
    provenance: {},
  };

  // CUI (if present and valid)
  if (record.cui) {
    patch.cui = record.cui;
    patch.provenance!["cui"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  // Name (if present and confidence is high enough)
  if (record.name && record.confidence >= CONFIDENCE_THRESHOLDS.MIN_ACCEPT) {
    patch.name = record.name;
    patch.legalName = record.name;
    patch.provenance!["name"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  // Domain (if present and normalized)
  const normalizedDomain = normalizeDomain(record.domain);
  if (normalizedDomain) {
    patch.domain = normalizedDomain;
    patch.provenance!["domain"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  // Address
  if (record.address) {
    patch.address = record.address;
    patch.provenance!["address"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  // County and industry
  if (record.countySlug) {
    patch.countySlug = record.countySlug;
    patch.provenance!["countySlug"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  if (record.industrySlug) {
    patch.industrySlug = record.industrySlug;
    patch.provenance!["industrySlug"] = {
      sourceId: record.sourceId,
      sourceRef: record.sourceRef,
      seenAt: record.lastSeenAt,
      confidence: record.confidence,
    };
  }

  // Contacts
  if (record.contacts) {
    if (record.contacts.email) {
      patch.email = record.contacts.email;
      patch.provenance!["email"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
    if (record.contacts.phone) {
      patch.phone = record.contacts.phone;
      patch.provenance!["phone"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
    if (record.contacts.website) {
      patch.website = record.contacts.website;
      patch.provenance!["website"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
    if (record.contacts.socials) {
      patch.socials = record.contacts.socials;
      patch.provenance!["socials"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
  }

  // Metrics
  if (record.metrics) {
    if (record.metrics.employees) {
      patch.employees = record.metrics.employees;
      patch.provenance!["employees"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
    if (record.metrics.revenue) {
      patch.revenueLatest = record.metrics.revenue;
      patch.provenance!["revenueLatest"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
    if (record.metrics.profit) {
      patch.profitLatest = record.metrics.profit;
      patch.provenance!["profitLatest"] = {
        sourceId: record.sourceId,
        sourceRef: record.sourceRef,
        seenAt: record.lastSeenAt,
        confidence: record.confidence,
      };
    }
  }

  return patch;
}

/**
 * Merge multiple patches by source priority
 */
export function mergePatches(patchesBySource: Array<{ sourceId: SourceId; patch: CompanyPatch }>): CompanyPatch {
  const merged: CompanyPatch = {
    provenance: {},
  };

  // Sort by priority (highest first)
  const sorted = patchesBySource.sort((a, b) => {
    const priorityA = MERGE_PRIORITY[a.sourceId] || 0;
    const priorityB = MERGE_PRIORITY[b.sourceId] || 0;
    return priorityB - priorityA;
  });

  // Merge fields, keeping highest priority source
  for (const { patch } of sorted) {
    for (const [field, value] of Object.entries(patch)) {
      if (field === "provenance") {
        // Merge provenance
        if (!merged.provenance) {
          merged.provenance = {};
        }
        Object.assign(merged.provenance, value as Record<string, unknown>);
      } else if (value !== undefined && value !== null) {
        // Only set if not already set (first/highest priority wins)
        if ((merged as Record<string, unknown>)[field] === undefined) {
          (merged as Record<string, unknown>)[field] = value;
        }
      }
    }
  }

  return merged;
}

