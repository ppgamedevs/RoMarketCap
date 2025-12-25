/**
 * Dummy Traffic Provider
 * 
 * Mock adapter simulating a web traffic analytics provider.
 * In production, this would connect to real APIs like:
 * - SimilarWeb
 * - SEMrush
 * - Ahrefs
 * - Custom analytics
 */

import { BaseProviderAdapter } from "../base";
import type {
  ProviderMetadata,
  ProviderType,
  CompanyDiscoveryResult,
  CompanyEnrichmentResult,
  CompanyMetricsResult,
} from "../types";

export class DummyTrafficProvider extends BaseProviderAdapter {
  protected metadata: ProviderMetadata = {
    id: "dummy-traffic-provider",
    name: "Dummy Traffic Provider",
    type: ProviderType.PAID, // Simulating paid provider
    description: "Mock web traffic analytics provider for testing",
    trustLevel: 80, // High trust for traffic data
    rateLimitPerMinute: 5,
    rateLimitPerDay: 500,
    costPerRequest: 0.01, // $0.01 per request
    costPerMonth: 100, // $100/month base
  };

  async discoverCompanies(cursor?: string, limit: number = 100): Promise<CompanyDiscoveryResult> {
    // Traffic providers typically don't discover companies
    // They enrich existing ones
    return {
      companies: [],
      hasMore: false,
    };
  }

  async enrichCompany(cui: string): Promise<CompanyEnrichmentResult | null> {
    await this.checkRateLimit();
    await this.trackCost();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Traffic providers mainly provide metrics, not enrichment
    // But they might provide website validation
    await this.recordSuccess("enrichCompany");

    return null; // Traffic providers don't enrich, they provide metrics
  }

  async getMetrics(cui: string): Promise<CompanyMetricsResult | null> {
    await this.checkRateLimit();
    await this.trackCost();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock traffic metrics
    const mockMetrics = {
      websiteTraffic: Math.floor(Math.random() * 100000) + 5000,
      socialFollowers: Math.floor(Math.random() * 50000) + 1000,
      mentions: Math.floor(Math.random() * 500) + 10,
      fundingSignals: Math.random() > 0.95 ? 1 : 0,
      metadata: {
        trafficSource: {
          organic: Math.floor(Math.random() * 60) + 20,
          direct: Math.floor(Math.random() * 30) + 10,
          referral: Math.floor(Math.random() * 20) + 5,
          social: Math.floor(Math.random() * 10) + 2,
        },
        bounceRate: Math.random() * 0.3 + 0.4,
        avgSessionDuration: Math.floor(Math.random() * 300) + 60,
      },
    };

    await this.recordSuccess("getMetrics");

    return {
      cui,
      metrics: mockMetrics,
      confidence: 75, // Higher confidence for paid provider
      source: this.metadata.id,
      timestamp: new Date(),
    };
  }
}

