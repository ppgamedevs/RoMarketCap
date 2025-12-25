/**
 * Third-Party Data Provider Adapter System
 * 
 * Pluggable architecture for integrating commercial and open data providers
 * into RoMarketCap, similar to CoinMarketCap's multi-source aggregation model.
 */

export enum ProviderType {
  FREE = "FREE",
  PAID = "PAID",
  INTERNAL = "INTERNAL",
}

export enum ProviderStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ERROR = "ERROR",
  RATE_LIMITED = "RATE_LIMITED",
}

export type ProviderMetadata = {
  id: string;
  name: string;
  type: ProviderType;
  description: string;
  website?: string;
  trustLevel: number; // 0-100, affects confidence weighting
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  costPerRequest?: number;
  costPerMonth?: number;
};

export type CompanyDiscoveryResult = {
  companies: Array<{
    cui: string;
    name: string;
    metadata?: Record<string, unknown>;
  }>;
  hasMore: boolean;
  cursor?: string;
};

export type CompanyEnrichmentResult = {
  cui: string;
  data: {
    website?: string;
    description?: string;
    employees?: number;
    revenue?: number;
    metadata?: Record<string, unknown>;
  };
  confidence: number; // 0-100
  source: string;
};

export type CompanyMetricsResult = {
  cui: string;
  metrics: {
    websiteTraffic?: number;
    socialFollowers?: number;
    mentions?: number;
    fundingSignals?: number;
    metadata?: Record<string, unknown>;
  };
  confidence: number; // 0-100
  source: string;
  timestamp: Date;
};

/**
 * Base interface for all data provider adapters
 */
export interface ProviderAdapter {
  /**
   * Provider metadata
   */
  getMetadata(): ProviderMetadata;

  /**
   * Discover new companies
   * Returns companies that might not be in our database yet
   */
  discoverCompanies(cursor?: string, limit?: number): Promise<CompanyDiscoveryResult>;

  /**
   * Enrich existing company data
   * Adds additional information to a known company
   */
  enrichCompany(cui: string): Promise<CompanyEnrichmentResult | null>;

  /**
   * Get metrics for a company
   * Returns time-series or current metrics (traffic, social, etc.)
   */
  getMetrics(cui: string): Promise<CompanyMetricsResult | null>;

  /**
   * Health check
   * Returns true if provider is available and working
   */
  healthCheck(): Promise<boolean>;
}

