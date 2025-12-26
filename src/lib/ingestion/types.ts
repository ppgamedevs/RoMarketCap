/**
 * PROMPT 55: Unified Ingestion Framework Types
 * 
 * Standard types for all ingestion sources
 */

/**
 * Source IDs
 */
export type SourceId = "SEAP" | "EU_FUNDS" | "ANAF_VERIFY" | "THIRD_PARTY";

/**
 * Contacts information
 */
export type Contacts = {
  email?: string;
  phone?: string;
  website?: string;
  socials?: Record<string, string>;
};

/**
 * Metrics from source
 */
export type SourceMetrics = {
  revenue?: number;
  profit?: number;
  employees?: number;
  currency?: string;
  year?: number;
};

/**
 * Standard SourceCompanyRecord shape
 */
export type SourceCompanyRecord = {
  sourceId: SourceId;
  sourceRef: string; // External reference (contract ID, project ID, etc.)
  cui: string | null; // Normalized CUI (digits only) or null
  name: string | null;
  countySlug?: string;
  industrySlug?: string;
  domain?: string;
  address?: string;
  contacts?: Contacts;
  metrics?: SourceMetrics;
  lastSeenAt: Date;
  confidence: number; // 0-100
  raw: Record<string, unknown>; // Capped raw payload
};

/**
 * Company identity candidate for matching
 */
export type CompanyIdentityCandidate = {
  cui?: string;
  canonicalSlug?: string;
  domain?: string;
  county?: string;
};

/**
 * Field provenance entry
 */
export type FieldProvenance = {
  sourceId: SourceId;
  sourceRef: string;
  seenAt: Date;
  confidence: number;
};

/**
 * Company patch (partial update)
 */
export type CompanyPatch = {
  cui?: string;
  name?: string;
  legalName?: string;
  domain?: string;
  address?: string;
  countySlug?: string;
  industrySlug?: string;
  employees?: number;
  revenueLatest?: number;
  profitLatest?: number;
  currency?: string;
  descriptionShort?: string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: Record<string, string>;
  // Provenance per field
  provenance?: Record<string, FieldProvenance>;
};

/**
 * Merge priority (higher = more trusted)
 */
export const MERGE_PRIORITY: Record<SourceId, number> = {
  ANAF_VERIFY: 100, // Highest - verified by ANAF
  EU_FUNDS: 70, // High - official EU data
  SEAP: 60, // Medium-high - official public procurement
  THIRD_PARTY: 40, // Lower - third-party sources
};

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  MIN_ACCEPT: 30, // Minimum confidence to accept data
  HIGH_CONFIDENCE: 70, // High confidence threshold
  VERIFIED: 90, // Verified data threshold
};

