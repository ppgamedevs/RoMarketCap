/**
 * PROMPT 53: Ingestion Provider Registry
 * 
 * Central registry for ingestion providers (bulk data ingestion)
 */

import type { IngestionProvider } from "./types";
import { StubProvider } from "./stub";

class IngestionProviderRegistry {
  private providers: Map<string, IngestionProvider> = new Map();

  constructor() {
    // Register stub provider
    this.register(new StubProvider());
  }

  /**
   * Register a provider
   */
  register(provider: IngestionProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): IngestionProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Get all providers
   */
  getAll(): IngestionProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider IDs
   */
  listProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const ingestionProviderRegistry = new IngestionProviderRegistry();

