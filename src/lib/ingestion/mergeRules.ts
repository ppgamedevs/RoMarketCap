/**
 * PROMPT 56: Merge Engine v1
 * 
 * Deterministic merge rules with provenance tracking
 */

import type { CompanyPatch, FieldProvenance, SourceId } from "./types";
import { Prisma } from "@prisma/client";

/**
 * Source priority (higher = more trusted)
 */
const SOURCE_PRIORITY: Record<SourceId | "USER_APPROVED" | "ENRICHMENT", number> = {
  ANAF_VERIFY: 100, // Highest - verified by ANAF
  EU_FUNDS: 70, // High - official EU data
  SEAP: 60, // Medium-high - official public procurement
  USER_APPROVED: 90, // High - manually approved by users
  THIRD_PARTY: 40, // Lower - third-party sources
  ENRICHMENT: 30, // Lowest - enrichment/scraping
};

/**
 * Confidence thresholds
 */
const CONFIDENCE_THRESHOLDS = {
  MIN_ACCEPT: 40, // Minimum confidence to accept data
  HIGH_CONFIDENCE: 70, // High confidence threshold
  VERIFIED: 90, // Verified data threshold
};

/**
 * Current company state
 */
export type CurrentCompany = {
  id: string;
  name: string | null;
  legalName: string | null;
  domain: string | null;
  address: string | null;
  countySlug: string | null;
  industrySlug: string | null;
  caenCode: string | null;
  employees: number | null;
  revenueLatest: number | null;
  profitLatest: number | null;
  descriptionShort: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: Record<string, string> | null;
  dataConfidence: number | null;
  fieldProvenance: Record<string, FieldProvenance> | null;
  // Check if has approved claims/submissions
  hasApprovedData: boolean;
};

/**
 * Patch metadata
 */
export type PatchMetadata = {
  sourceId: SourceId | "USER_APPROVED" | "ENRICHMENT";
  sourceRef: string;
  confidence: number;
  runId?: string;
};

/**
 * Field change record
 */
export type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  confidence: number;
};

/**
 * Merge result
 */
export type MergeResult = {
  update: Prisma.CompanyUpdateInput;
  changes: FieldChange[];
  provenance: Record<string, FieldProvenance>;
};

/**
 * Merge company patch with current state
 */
export function mergeCompanyPatch(
  current: CurrentCompany,
  patch: CompanyPatch,
  patchMeta: PatchMetadata,
): MergeResult {
  const update: Prisma.CompanyUpdateInput = {};
  const changes: FieldChange[] = [];
  const provenance: Record<string, FieldProvenance> = { ...(current.fieldProvenance || {}) };

  const currentPriority = getSourcePriority(current, "name");
  const patchPriority = SOURCE_PRIORITY[patchMeta.sourceId] || 0;

  // Merge name
  if (patch.name) {
    const shouldUpdate = shouldUpdateField(
      "name",
      current.name,
      patch.name,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
      current.hasApprovedData,
    );
    if (shouldUpdate) {
      update.name = patch.name;
      if (!current.hasApprovedData) {
        update.legalName = patch.name;
      }
      changes.push({
        field: "name",
        oldValue: current.name,
        newValue: patch.name,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["name"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge address (prefer official/verified sources)
  if (patch.address) {
    const shouldUpdate = shouldUpdateField(
      "address",
      current.address,
      patch.address,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
      current.hasApprovedData,
    );
    if (shouldUpdate) {
      update.address = patch.address;
      changes.push({
        field: "address",
        oldValue: current.address,
        newValue: patch.address,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["address"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge industrySlug/caen (prefer official/verified)
  if (patch.industrySlug) {
    const shouldUpdate = shouldUpdateField(
      "industrySlug",
      current.industrySlug,
      patch.industrySlug,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
      current.hasApprovedData,
    );
    if (shouldUpdate) {
      update.industrySlug = patch.industrySlug;
      changes.push({
        field: "industrySlug",
        oldValue: current.industrySlug,
        newValue: patch.industrySlug,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["industrySlug"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge countySlug
  if (patch.countySlug) {
    const shouldUpdate = shouldUpdateField(
      "countySlug",
      current.countySlug,
      patch.countySlug,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
      current.hasApprovedData,
    );
    if (shouldUpdate) {
      update.countySlug = patch.countySlug;
      changes.push({
        field: "countySlug",
        oldValue: current.countySlug,
        newValue: patch.countySlug,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["countySlug"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge domain (prefer existing non-empty; else accept new if valid and not blacklisted)
  if (patch.domain) {
    if (!current.domain || patchPriority > currentPriority) {
      // Only update if current is empty or new source has higher priority
      update.domain = patch.domain;
      changes.push({
        field: "domain",
        oldValue: current.domain,
        newValue: patch.domain,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["domain"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge numeric finance fields (prefer official/verified or most recent)
  if (patch.revenueLatest != null) {
    const shouldUpdate = shouldUpdateNumericField(
      current.revenueLatest,
      patch.revenueLatest,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
    );
    if (shouldUpdate) {
      update.revenueLatest = patch.revenueLatest;
      changes.push({
        field: "revenueLatest",
        oldValue: current.revenueLatest,
        newValue: patch.revenueLatest,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["revenueLatest"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  if (patch.profitLatest != null) {
    const shouldUpdate = shouldUpdateNumericField(
      current.profitLatest,
      patch.profitLatest,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
    );
    if (shouldUpdate) {
      update.profitLatest = patch.profitLatest;
      changes.push({
        field: "profitLatest",
        oldValue: current.profitLatest,
        newValue: patch.profitLatest,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["profitLatest"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  if (patch.employees != null) {
    const shouldUpdate = shouldUpdateNumericField(
      current.employees,
      patch.employees,
      currentPriority,
      patchPriority,
      patchMeta.confidence,
      current.dataConfidence || 0,
    );
    if (shouldUpdate) {
      update.employees = patch.employees;
      changes.push({
        field: "employees",
        oldValue: current.employees,
        newValue: patch.employees,
        source: patchMeta.sourceId,
        confidence: patchMeta.confidence,
      });
      provenance["employees"] = {
        sourceId: patchMeta.sourceId as SourceId,
        sourceRef: patchMeta.sourceRef,
        seenAt: new Date(),
        confidence: patchMeta.confidence,
      };
    }
  }

  // Merge descriptionShort/socials/email/phone (can merge from enrichment if empty)
  if (patch.descriptionShort && !current.descriptionShort) {
    update.descriptionShort = patch.descriptionShort;
    changes.push({
      field: "descriptionShort",
      oldValue: current.descriptionShort,
      newValue: patch.descriptionShort,
      source: patchMeta.sourceId,
      confidence: patchMeta.confidence,
    });
    provenance["descriptionShort"] = {
      sourceId: patchMeta.sourceId as SourceId,
      sourceRef: patchMeta.sourceRef,
      seenAt: new Date(),
      confidence: patchMeta.confidence,
    };
  }

  if (patch.email && !current.email) {
    update.email = patch.email;
    changes.push({
      field: "email",
      oldValue: current.email,
      newValue: patch.email,
      source: patchMeta.sourceId,
      confidence: patchMeta.confidence,
    });
    provenance["email"] = {
      sourceId: patchMeta.sourceId as SourceId,
      sourceRef: patchMeta.sourceRef,
      seenAt: new Date(),
      confidence: patchMeta.confidence,
    };
  }

  if (patch.phone && !current.phone) {
    update.phone = patch.phone;
    changes.push({
      field: "phone",
      oldValue: current.phone,
      newValue: patch.phone,
      source: patchMeta.sourceId,
      confidence: patchMeta.confidence,
    });
    provenance["phone"] = {
      sourceId: patchMeta.sourceId as SourceId,
      sourceRef: patchMeta.sourceRef,
      seenAt: new Date(),
      confidence: patchMeta.confidence,
    };
  }

  if (patch.socials && !current.socials) {
    update.socials = patch.socials as Prisma.InputJsonValue;
    changes.push({
      field: "socials",
      oldValue: current.socials,
      newValue: patch.socials,
      source: patchMeta.sourceId,
      confidence: patchMeta.confidence,
    });
    provenance["socials"] = {
      sourceId: patchMeta.sourceId as SourceId,
      sourceRef: patchMeta.sourceRef,
      seenAt: new Date(),
      confidence: patchMeta.confidence,
    };
  }

  // Always update fieldProvenance
  update.fieldProvenance = provenance as Prisma.InputJsonValue;

  // Update dataConfidence if patch has higher confidence
  if (patchMeta.confidence > (current.dataConfidence || 0)) {
    update.dataConfidence = Math.min(100, patchMeta.confidence);
  }

  return {
    update,
    changes,
    provenance,
  };
}

/**
 * Get source priority for a field from current company
 */
function getSourcePriority(current: CurrentCompany, field: string): number {
  const fieldProv = current.fieldProvenance?.[field];
  if (fieldProv) {
    return SOURCE_PRIORITY[fieldProv.sourceId] || 0;
  }
  // If has approved data, assume high priority
  if (current.hasApprovedData) {
    return SOURCE_PRIORITY["USER_APPROVED"];
  }
  return 0;
}

/**
 * Determine if field should be updated
 */
function shouldUpdateField(
  field: string,
  currentValue: unknown,
  newValue: unknown,
  currentPriority: number,
  newPriority: number,
  newConfidence: number,
  currentConfidence: number,
  hasApprovedData: boolean,
): boolean {
  // Never overwrite if has approved data and new source is not verified
  if (hasApprovedData && newPriority < SOURCE_PRIORITY["USER_APPROVED"]) {
    return false;
  }

  // If current is empty, accept if confidence is high enough
  if (currentValue === null || currentValue === undefined || currentValue === "") {
    return newConfidence >= CONFIDENCE_THRESHOLDS.MIN_ACCEPT;
  }

  // If new source has higher priority, accept
  if (newPriority > currentPriority) {
    return true;
  }

  // If same priority but higher confidence, accept
  if (newPriority === currentPriority && newConfidence > currentConfidence) {
    return true;
  }

  return false;
}

/**
 * Determine if numeric field should be updated
 */
function shouldUpdateNumericField(
  currentValue: number | null,
  newValue: number,
  currentPriority: number,
  newPriority: number,
  newConfidence: number,
  currentConfidence: number,
): boolean {
  // If current is null, accept if confidence is high enough
  if (currentValue === null) {
    return newConfidence >= CONFIDENCE_THRESHOLDS.MIN_ACCEPT;
  }

  // Prefer official/verified sources
  if (newPriority > currentPriority) {
    return true;
  }

  // If same priority but higher confidence, accept
  if (newPriority === currentPriority && newConfidence > currentConfidence) {
    return true;
  }

  return false;
}

