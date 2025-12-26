/**
 * PROMPT 53: Stub Provider
 * 
 * Reads from a local JSON file for dev/test purposes.
 * 
 * Environment variable: PROVIDER_STUB_FILE (path to JSON file)
 */

import type { IngestionProvider, ProviderCompanyItem, ProviderPageResult, NormalizedCompanyRecord } from "./types";
import { readFileSync } from "fs";
import { join } from "path";

interface StubProviderItem {
  cui: string;
  name: string;
  domain?: string;
  address?: string;
  county?: string;
  industry?: string;
  employees?: number;
  revenue?: number;
  profit?: number;
  currency?: string;
  year?: number;
  url?: string;
  description?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

export class StubProvider implements IngestionProvider {
  id = "provider_stub";
  displayName = "Stub Provider (Dev/Test)";
  
  supports = {
    companies: true,
    financials: true,
    employees: true,
    taxonomy: true,
  };

  rateLimit = {
    rpm: 60,
    concurrency: 1,
  };

  auth = {
    type: "none" as const,
  };

  private items: StubProviderItem[] = [];
  private loaded = false;

  /**
   * Load items from JSON file
   */
  private loadItems(): void {
    if (this.loaded) {
      return;
    }

    const filePath = process.env.PROVIDER_STUB_FILE;
    if (!filePath) {
      console.warn("[stub-provider] PROVIDER_STUB_FILE not set, using empty dataset");
      this.items = [];
      this.loaded = true;
      return;
    }

    try {
      // Support both absolute and relative paths
      const fullPath = filePath.startsWith("/") || filePath.match(/^[A-Z]:/) 
        ? filePath 
        : join(process.cwd(), filePath);
      
      const content = readFileSync(fullPath, "utf-8");
      const data = JSON.parse(content);
      
      // Support both array and object with items array
      if (Array.isArray(data)) {
        this.items = data;
      } else if (data.items && Array.isArray(data.items)) {
        this.items = data.items;
      } else {
        throw new Error("Invalid JSON structure: expected array or object with 'items' array");
      }
      
      this.loaded = true;
      console.log(`[stub-provider] Loaded ${this.items.length} items from ${fullPath}`);
    } catch (error) {
      console.error(`[stub-provider] Failed to load file ${filePath}:`, error);
      this.items = [];
      this.loaded = true;
    }
  }

  async fetchPage(args: { cursor?: string; limit?: number }): Promise<ProviderPageResult> {
    this.loadItems();

    const limit = args.limit || 100;
    const cursor = args.cursor ? parseInt(args.cursor, 10) : 0;
    
    if (isNaN(cursor) || cursor < 0) {
      return { items: [] };
    }

    const start = cursor;
    const end = Math.min(start + limit, this.items.length);
    const pageItems = this.items.slice(start, end);

    const nextCursor = end < this.items.length ? end.toString() : undefined;

    return {
      items: pageItems as ProviderCompanyItem[],
      nextCursor,
    };
  }

  normalize(item: ProviderCompanyItem): NormalizedCompanyRecord | null {
    const stub = item as StubProviderItem;

    // Validate required fields
    if (!stub.cui || !stub.name) {
      return null;
    }

    // Normalize CUI (remove RO prefix if present, ensure uppercase)
    let cui = stub.cui.toString().trim().toUpperCase();
    if (cui.startsWith("RO")) {
      cui = cui.substring(2).trim();
    }

    // Normalize county/industry to slugs (simple lowercase, replace spaces with hyphens)
    const countySlug = stub.county
      ? stub.county.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : undefined;

    const industrySlug = stub.industry
      ? stub.industry.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : undefined;

    return {
      cui,
      name: stub.name.toString().trim(),
      domain: stub.domain?.toString().trim(),
      address: stub.address?.toString().trim(),
      countySlug,
      industrySlug,
      employees: typeof stub.employees === "number" ? stub.employees : undefined,
      revenueLatest: typeof stub.revenue === "number" ? stub.revenue : undefined,
      profitLatest: typeof stub.profit === "number" ? stub.profit : undefined,
      currency: stub.currency?.toString().toUpperCase() || "RON",
      year: typeof stub.year === "number" ? stub.year : new Date().getFullYear(),
      sourceUrl: stub.url?.toString().trim(),
      confidence: 70, // Default confidence for stub provider
      descriptionShort: stub.description?.toString().trim().substring(0, 240),
      phone: stub.phone?.toString().trim(),
      email: stub.email?.toString().trim(),
    };
  }

  async healthCheck(): Promise<boolean> {
    this.loadItems();
    return true; // Always healthy if file loaded (even if empty)
  }
}

