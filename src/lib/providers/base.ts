/**
 * Base implementation for provider adapters
 * Provides common functionality like rate limiting, error handling, etc.
 */

import type { ProviderAdapter, ProviderMetadata, CompanyDiscoveryResult, CompanyEnrichmentResult, CompanyMetricsResult } from "./types";
import { kv } from "@vercel/kv";

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected abstract metadata: ProviderMetadata;

  abstract discoverCompanies(cursor?: string, limit?: number): Promise<CompanyDiscoveryResult>;
  abstract enrichCompany(cui: string): Promise<CompanyEnrichmentResult | null>;
  abstract getMetrics(cui: string): Promise<CompanyMetricsResult | null>;

  getMetadata(): ProviderMetadata {
    return this.metadata;
  }

  /**
   * Check rate limit before making request
   */
  protected async checkRateLimit(): Promise<boolean> {
    const metadata = this.getMetadata();
    const providerId = metadata.id;

    // Check per-minute limit
    if (metadata.rateLimitPerMinute) {
      const key = `provider:rate:${providerId}:minute`;
      const count = await kv.get<number>(key).catch(() => 0) || 0;
      if (count >= metadata.rateLimitPerMinute) {
        return false;
      }
      await kv.incr(key).catch(() => null);
      await kv.expire(key, 60).catch(() => null);
    }

    // Check per-day limit
    if (metadata.rateLimitPerDay) {
      const key = `provider:rate:${providerId}:day`;
      const count = await kv.get<number>(key).catch(() => 0) || 0;
      if (count >= metadata.rateLimitPerDay) {
        return false;
      }
      await kv.incr(key).catch(() => null);
      await kv.expire(key, 86400).catch(() => null);
    }

    return true;
  }

  /**
   * Track cost for paid providers
   */
  protected async trackCost(requests: number = 1): Promise<void> {
    const metadata = this.getMetadata();
    if (metadata.type !== "PAID" || !metadata.costPerRequest) {
      return;
    }

    const providerId = metadata.id;
    const today = new Date().toISOString().slice(0, 10);
    const key = `provider:cost:${providerId}:${today}`;
    const cost = requests * (metadata.costPerRequest || 0);

    await kv.incrbyfloat(key, cost).catch(() => null);
    await kv.expire(key, 86400 * 7).catch(() => null); // Keep for 7 days
  }

  /**
   * Record provider error
   */
  protected async recordError(error: Error): Promise<void> {
    const providerId = this.getMetadata().id;
    const key = `provider:errors:${providerId}`;
    await kv.lpush(key, JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    })).catch(() => null);
    await kv.ltrim(key, 0, 99).catch(() => null); // Keep last 100 errors
    await kv.expire(key, 86400 * 7).catch(() => null);
  }

  /**
   * Record successful operation
   */
  protected async recordSuccess(operation: string): Promise<void> {
    const providerId = this.getMetadata().id;
    const key = `provider:success:${providerId}:${operation}`;
    await kv.incr(key).catch(() => null);
    await kv.expire(key, 86400).catch(() => null);
  }

  /**
   * Health check - default implementation
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple operation to check if provider is available
      const canProceed = await this.checkRateLimit();
      return canProceed;
    } catch {
      return false;
    }
  }
}

