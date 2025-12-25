/**
 * Provider Registry
 * 
 * Central registry for all data providers.
 * Manages provider lifecycle, feature flags, and coordination.
 */

import type { ProviderAdapter } from "./types";
import { DummyBusinessRegistry } from "./dummy/DummyBusinessRegistry";
import { DummyTrafficProvider } from "./dummy/DummyTrafficProvider";
import { kv } from "@vercel/kv";

class ProviderRegistry {
  private providers: Map<string, ProviderAdapter> = new Map();

  constructor() {
    // Register all providers
    this.register(new DummyBusinessRegistry());
    this.register(new DummyTrafficProvider());
  }

  /**
   * Register a provider
   */
  register(provider: ProviderAdapter): void {
    const metadata = provider.getMetadata();
    this.providers.set(metadata.id, provider);
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): ProviderAdapter | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Get all providers
   */
  getAll(): ProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get active providers (enabled via feature flag)
   */
  async getActiveProviders(): Promise<ProviderAdapter[]> {
    const all = this.getAll();
    const active: ProviderAdapter[] = [];

    for (const provider of all) {
      const metadata = provider.getMetadata();
      // Use KV directly since flag names are dynamic
      const flagKey = `flag:PROVIDER_${metadata.id.toUpperCase().replace(/-/g, "_")}`;
      const enabled = await kv.get<boolean>(flagKey).catch(() => true); // Default to enabled if not set
      if (enabled) {
        active.push(provider);
      }
    }

    return active;
  }

  /**
   * Get providers by type
   */
  getByType(type: string): ProviderAdapter[] {
    return this.getAll().filter((p) => p.getMetadata().type === type);
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(providerId: string): Promise<{
    requestsToday: number;
    errorsToday: number;
    costToday: number;
    lastSuccess?: string;
    lastError?: string;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const provider = this.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const requestsKey = `provider:requests:${providerId}:${today}`;
    const errorsKey = `provider:errors:${providerId}`;
    const costKey = `provider:cost:${providerId}:${today}`;
    const lastSuccessKey = `provider:lastSuccess:${providerId}`;
    const lastErrorKey = `provider:lastError:${providerId}`;

    const [requests, errors, cost, lastSuccess, lastError] = await Promise.all([
      kv.get<number>(requestsKey).catch(() => 0) || 0,
      kv.llen(errorsKey).catch(() => 0),
      kv.get<number>(costKey).catch(() => 0) || 0,
      kv.get<string>(lastSuccessKey).catch(() => null),
      kv.get<string>(lastErrorKey).catch(() => null),
    ]);

    return {
      requestsToday: requests,
      errorsToday: errors,
      costToday: cost,
      lastSuccess: lastSuccess || undefined,
      lastError: lastError || undefined,
    };
  }

  /**
   * Record provider request
   */
  async recordRequest(providerId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const key = `provider:requests:${providerId}:${today}`;
    await kv.incr(key).catch(() => null);
    await kv.expire(key, 86400).catch(() => null);
    await kv.set(`provider:lastSuccess:${providerId}`, new Date().toISOString()).catch(() => null);
  }

  /**
   * Record provider error
   */
  async recordError(providerId: string, error: string): Promise<void> {
    const key = `provider:errors:${providerId}`;
    await kv.lpush(key, JSON.stringify({
      error,
      timestamp: new Date().toISOString(),
    })).catch(() => null);
    await kv.ltrim(key, 0, 99).catch(() => null);
    await kv.set(`provider:lastError:${providerId}`, new Date().toISOString()).catch(() => null);
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();

