/**
 * PROMPT 54: Discovery Adapter Interface
 * 
 * Adapters discover companies from various sources (SEAP, EU Funds, etc.)
 * and yield DiscoveredRecord objects for processing.
 */

import { DiscoverySource } from "@prisma/client";

/**
 * Evidence from discovery source
 */
export type DiscoveryEvidence = {
  contractId?: string;
  awardNoticeId?: string;
  fundProjectId?: string;
  supplierName?: string;
  companyName?: string;
  authorityName?: string;
  programName?: string;
  value?: number;
  amount?: number;
  date?: string;
  year?: number;
  url?: string;
  rowHash?: string;
  [key: string]: unknown; // Allow additional fields
};

/**
 * Discovered record from an adapter
 */
export type DiscoveredRecord = {
  cui: string; // Normalized CUI (digits only)
  companyName?: string;
  evidence: DiscoveryEvidence;
  discoveredAt?: Date;
};

/**
 * Discovery adapter interface
 */
export interface DiscoveryAdapter {
  /**
   * Source name (SEAP, EU_FUNDS, etc.)
   */
  name: DiscoverySource;

  /**
   * Discover companies from the source
   * 
   * @param params - Discovery parameters
   * @param params.cursor - Cursor for pagination (line number, offset, etc.)
   * @param params.limit - Max records to discover
   * @returns Async generator of DiscoveredRecord
   */
  discover(params: { cursor?: string; limit?: number }): AsyncGenerator<DiscoveredRecord>;

  /**
   * Health check
   * @returns true if adapter is available
   */
  healthCheck(): Promise<boolean>;
}
