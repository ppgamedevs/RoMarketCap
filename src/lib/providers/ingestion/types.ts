/**
 * PROMPT 53: Provider Ingestion Interface
 * 
 * This interface is for bulk ingestion providers that can fetch pages of companies
 * and normalize them into our internal schema.
 */

export type ProviderSupports = {
  companies: boolean;
  financials: boolean;
  employees: boolean;
  taxonomy: boolean;
};

export type ProviderRateLimit = {
  rpm: number; // Requests per minute
  concurrency: number; // Max concurrent requests
};

export type ProviderAuth = {
  type: "api_key" | "bearer" | "basic" | "none";
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
};

/**
 * Raw item from provider (before normalization)
 */
export type ProviderCompanyItem = {
  [key: string]: unknown; // Provider-specific structure
};

/**
 * Normalized company record (our internal schema)
 */
export type NormalizedCompanyRecord = {
  // Required
  cui: string;
  name: string;
  
  // Optional core fields
  domain?: string;
  address?: string;
  countySlug?: string;
  industrySlug?: string;
  
  // Optional metrics
  employees?: number;
  revenueLatest?: number;
  profitLatest?: number;
  currency?: string;
  year?: number;
  
  // Optional metadata
  sourceUrl?: string;
  confidence?: number; // 0-100
  tags?: string[];
  descriptionShort?: string;
  socials?: Record<string, string>;
  phone?: string;
  email?: string;
};

/**
 * Provider page result
 */
export type ProviderPageResult = {
  items: ProviderCompanyItem[];
  nextCursor?: string;
};

/**
 * Ingestion Provider Interface
 * 
 * Providers that support bulk ingestion implement this interface.
 */
export interface IngestionProvider {
  /**
   * Provider ID (e.g., "provider_stub", "provider_x")
   */
  id: string;

  /**
   * Display name for UI
   */
  displayName: string;

  /**
   * What data types this provider supports
   */
  supports: ProviderSupports;

  /**
   * Rate limiting configuration
   */
  rateLimit: ProviderRateLimit;

  /**
   * Authentication configuration
   */
  auth: ProviderAuth;

  /**
   * Fetch a page of companies from the provider
   * 
   * @param args - Fetch arguments
   * @param args.cursor - Cursor for pagination (optional)
   * @param args.limit - Max items to fetch (optional)
   * @returns Page of items and optional next cursor
   */
  fetchPage(args: { cursor?: string; limit?: number }): Promise<ProviderPageResult>;

  /**
   * Normalize a provider item into our internal schema
   * 
   * @param item - Raw item from provider
   * @returns Normalized record or null if invalid
   */
  normalize(item: ProviderCompanyItem): NormalizedCompanyRecord | null;

  /**
   * Health check
   * @returns true if provider is available
   */
  healthCheck(): Promise<boolean>;
}

