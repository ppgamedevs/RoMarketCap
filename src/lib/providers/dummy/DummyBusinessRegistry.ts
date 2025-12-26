/**
 * Dummy Business Registry Provider
 * 
 * Mock adapter simulating a business registry data provider.
 * In production, this would connect to real APIs like:
 * - ANAF API
 * - Trade Register APIs
 * - Commercial registries
 */

import { BaseProviderAdapter } from "../base";
import {
  ProviderType,
  type ProviderMetadata,
  type CompanyDiscoveryResult,
  type CompanyEnrichmentResult,
  type CompanyMetricsResult,
} from "../types";

export class DummyBusinessRegistry extends BaseProviderAdapter {
  protected metadata: ProviderMetadata = {
    id: "dummy-business-registry",
    name: "Dummy Business Registry",
    type: ProviderType.FREE,
    description: "Mock business registry provider for testing",
    trustLevel: 70, // Medium-high trust
    rateLimitPerMinute: 10,
    rateLimitPerDay: 1000,
  };

  async discoverCompanies(cursor?: string, limit: number = 100): Promise<CompanyDiscoveryResult> {
    await this.checkRateLimit();
    await this.trackCost();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock data - in production, this would call the real API
    const mockCompanies = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      cui: `RO${String(10000000 + (cursor ? parseInt(cursor) : 0) + i).padStart(8, "0")}`,
      name: `Mock Company ${(cursor ? parseInt(cursor) : 0) + i + 1} SRL`,
      metadata: {
        registrationDate: new Date(2020 + i, 0, 1).toISOString(),
        status: i % 3 === 0 ? "ACTIVE" : "INACTIVE",
      },
    }));

    await this.recordSuccess("discoverCompanies");

    return {
      companies: mockCompanies,
      hasMore: (cursor ? parseInt(cursor) : 0) + limit < 1000,
      cursor: String((cursor ? parseInt(cursor) : 0) + limit),
    };
  }

  async enrichCompany(cui: string): Promise<CompanyEnrichmentResult | null> {
    await this.checkRateLimit();
    await this.trackCost();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Mock enrichment data
    const mockData = {
      website: `https://www.example-${cui.slice(-4)}.ro`,
      description: `Mock description for company with CUI ${cui}`,
      employees: Math.floor(Math.random() * 1000) + 10,
      revenue: Math.floor(Math.random() * 10000000) + 100000,
      metadata: {
        registrationDate: new Date(2020, 0, 1).toISOString(),
        legalForm: "SRL",
        address: "Mock Address, Bucharest",
      },
    };

    await this.recordSuccess("enrichCompany");

    return {
      cui,
      data: mockData,
      confidence: 65, // Medium confidence for dummy data
      source: this.metadata.id,
    };
  }

  async getMetrics(cui: string): Promise<CompanyMetricsResult | null> {
    await this.checkRateLimit();
    await this.trackCost();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Mock metrics
    const mockMetrics = {
      websiteTraffic: Math.floor(Math.random() * 50000) + 1000,
      socialFollowers: Math.floor(Math.random() * 10000) + 100,
      mentions: Math.floor(Math.random() * 100) + 5,
      fundingSignals: Math.random() > 0.9 ? 1 : 0,
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    };

    await this.recordSuccess("getMetrics");

    return {
      cui,
      metrics: mockMetrics,
      confidence: 60, // Medium confidence for dummy data
      source: this.metadata.id,
      timestamp: new Date(),
    };
  }
}

