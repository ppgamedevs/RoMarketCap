/**
 * PROMPT 55: Source Registry and Factory
 * 
 * Central registry for all ingestion sources
 */

import type { SourceId, SourceCompanyRecord } from "./types";
import { SEAPAdapter } from "@/src/lib/ingest/adapters/seap";
import { EUFundsAdapter } from "@/src/lib/ingest/adapters/euFunds";
import { SEAPXlsxSource } from "./national/sources/seapXlsx";
import { DataGovXlsxSource } from "./national/sources/datagovXlsx";
import { DiscoverySource } from "@prisma/client";

/**
 * Source adapter interface
 */
export interface IngestionSource {
  /**
   * Source ID
   */
  sourceId: SourceId;

  /**
   * Fetch a batch of records
   * 
   * @param cursor - Cursor for pagination
   * @param limit - Max records to fetch
   * @returns Array of SourceCompanyRecord
   */
  fetchBatch(cursor?: string, limit?: number, options?: { forceReprocess?: boolean }): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * SEAP Source Adapter
 */
class SEAPSource implements IngestionSource {
  sourceId: SourceId = "SEAP";
  private adapter = new SEAPAdapter();

  async fetchBatch(cursor?: string, limit = 100, _options?: { forceReprocess?: boolean }): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    const records: SourceCompanyRecord[] = [];
    let lastCursor: string | undefined = cursor;

    for await (const discovered of this.adapter.discover({ cursor, limit })) {
      records.push({
        sourceId: "SEAP",
        sourceRef: discovered.evidence.contractId || discovered.evidence.rowHash || `seap-${discovered.cui}`,
        cui: discovered.cui,
        name: discovered.companyName || null,
        countySlug: undefined, // SEAP doesn't typically have county
        industrySlug: undefined,
        domain: undefined,
        address: undefined,
        contacts: undefined,
        metrics: discovered.evidence.value
          ? {
              revenue: discovered.evidence.value,
              currency: "RON",
              year: discovered.evidence.year,
            }
          : undefined,
        lastSeenAt: discovered.discoveredAt || new Date(),
        confidence: 60, // Medium-high confidence for SEAP
        raw: discovered.evidence as Record<string, unknown>,
      });

      lastCursor = String(records.length + (cursor ? parseInt(cursor, 10) : 0));
    }

    return {
      records,
      nextCursor: records.length >= limit ? lastCursor : undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }
}

/**
 * EU Funds Source Adapter
 */
class EUFundsSource implements IngestionSource {
  sourceId: SourceId = "EU_FUNDS";
  private adapter = new EUFundsAdapter();

  async fetchBatch(cursor?: string, limit = 100, _options?: { forceReprocess?: boolean }): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    const records: SourceCompanyRecord[] = [];
    let lastCursor: string | undefined = cursor;

    for await (const discovered of this.adapter.discover({ cursor, limit })) {
      records.push({
        sourceId: "EU_FUNDS",
        sourceRef: discovered.evidence.fundProjectId || discovered.evidence.rowHash || `eu-${discovered.cui}`,
        cui: discovered.cui,
        name: discovered.companyName || null,
        countySlug: undefined,
        industrySlug: undefined,
        domain: undefined,
        address: undefined,
        contacts: undefined,
        metrics: discovered.evidence.value
          ? {
              revenue: discovered.evidence.value,
              currency: "EUR",
              year: discovered.evidence.year,
            }
          : undefined,
        lastSeenAt: discovered.discoveredAt || new Date(),
        confidence: 70, // High confidence for EU Funds
        raw: discovered.evidence as Record<string, unknown>,
      });

      lastCursor = String(records.length + (cursor ? parseInt(cursor, 10) : 0));
    }

    return {
      records,
      nextCursor: records.length >= limit ? lastCursor : undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }
}

/**
 * ANAF Verify Source (stub for now - uses existing verification)
 */
class ANAFVerifySource implements IngestionSource {
  sourceId: SourceId = "ANAF_VERIFY";

  async fetchBatch(cursor?: string, limit = 100, _options?: { forceReprocess?: boolean }): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    // ANAF verification is done per-company, not batch discovery
    // This source is used for verification step, not discovery
    return { records: [], nextCursor: undefined };
  }

  async healthCheck(): Promise<boolean> {
    return true; // ANAF connector handles health checks
  }
}

/**
 * Source Registry
 */
class SourceRegistry {
  private sources: Map<SourceId, IngestionSource> = new Map();

  constructor() {
    this.register(new SEAPSource());
    this.register(new EUFundsSource());
    this.register(new ANAFVerifySource());
    this.register(new SEAPXlsxSource());
    this.register(new DataGovXlsxSource());
  }

  /**
   * Register a source
   */
  register(source: IngestionSource): void {
    this.sources.set(source.sourceId, source);
  }

  /**
   * Get a source by ID
   */
  get(sourceId: SourceId): IngestionSource | null {
    return this.sources.get(sourceId) || null;
  }

  /**
   * Get all sources
   */
  getAll(): IngestionSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get enabled sources (check feature flags and environment variables)
   */
  async getEnabled(): Promise<IngestionSource[]> {
    const { kv } = await import("@vercel/kv");
    const enabled: IngestionSource[] = [];

    for (const source of this.getAll()) {
      // Check feature flag
      const flagKey = `flag:INGEST_${source.sourceId}`;
      const enabledFlag = await kv.get<boolean>(flagKey).catch(() => null);
      if (enabledFlag === false) {
        // Explicitly disabled via feature flag
        continue;
      }

      // ANAF_VERIFY is for verification only, not discovery - skip it
      if (source.sourceId === "ANAF_VERIFY") {
        continue;
      }

      // Check if source has required environment variables
      let hasConfig = true;
      if (source.sourceId === "SEAP") {
        hasConfig = !!(process.env.SEAP_CSV_URL || process.env.SEAP_DATA_URL);
      } else if (source.sourceId === "EU_FUNDS") {
        hasConfig = !!(process.env.EU_FUNDS_CSV_URL || process.env.EU_FUNDS_JSON_URL || process.env.EU_FUNDS_DATA_URL);
      } else if (source.sourceId === "SEAP_XLSX") {
        hasConfig = !!process.env.SEAP_XLSX_URL;
      } else if (source.sourceId === "DATAGOV_SEAP") {
        // PROMPT 62: DATAGOV_SEAP uses DATAGOV_RESOURCE_URLS or default URL
        hasConfig = true; // Always enabled (has default URL)
      }

      if (hasConfig) {
        enabled.push(source);
      } else {
        console.warn(`[source-registry] Source ${source.sourceId} disabled: missing environment variables`);
      }
    }

    return enabled;
  }
}

export const sourceRegistry = new SourceRegistry();

