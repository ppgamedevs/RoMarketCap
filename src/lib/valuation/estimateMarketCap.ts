/**
 * Market Cap Estimation for Private Companies
 * 
 * Uses industry-specific multiples to estimate market capitalization
 * for companies without public market data.
 */

import { Prisma } from "@prisma/client";

/**
 * Industry-specific revenue multiples (Price-to-Sales ratios)
 * Based on Romanian market conditions and global benchmarks
 */
const INDUSTRY_REVENUE_MULTIPLES: Record<string, number> = {
  // Technology & Software (high multiples)
  "IT Software & Services": 3.5,
  "Internet & E-commerce": 3.0,
  "Telecommunications": 2.0,
  
  // Finance (moderate multiples)
  "Banking & Financial Services": 2.5,
  "Insurance": 2.0,
  "Investment Services": 1.8,
  
  // Healthcare (moderate-high multiples)
  "Healthcare Services": 2.8,
  "Pharmaceuticals": 2.5,
  "Medical Devices": 3.0,
  
  // Retail & Consumer (moderate multiples)
  "Retail": 1.5,
  "Food & Beverage": 1.8,
  "Consumer Products": 2.0,
  "Hospitality & Tourism": 1.5,
  
  // Manufacturing (lower multiples)
  "Manufacturing": 1.2,
  "Automotive": 1.0,
  "Construction Materials": 1.3,
  "Chemicals": 1.5,
  
  // Energy & Utilities (moderate multiples)
  "Energy": 2.0,
  "Utilities": 1.8,
  "Oil & Gas": 1.5,
  
  // Real Estate (asset-based)
  "Real Estate": 1.5,
  "Construction": 1.2,
  
  // Agriculture (lower multiples)
  "Agriculture": 1.0,
  "Food Production": 1.3,
  
  // Default fallback
  "Other": 1.5,
};

/**
 * Asset-based valuation weight by industry
 * Some industries should consider assets more than revenue
 */
const ASSET_WEIGHT_BY_INDUSTRY: Record<string, number> = {
  "Real Estate": 0.8, // 80% assets, 20% revenue
  "Banking & Financial Services": 0.6,
  "Energy": 0.4,
  "Manufacturing": 0.3,
  "Construction": 0.3,
};

/**
 * Get the appropriate revenue multiple for an industry
 */
function getRevenueMultiple(industry: string | null): number {
  if (!industry) return INDUSTRY_REVENUE_MULTIPLES["Other"];
  
  // Try exact match first
  if (industry in INDUSTRY_REVENUE_MULTIPLES) {
    return INDUSTRY_REVENUE_MULTIPLES[industry];
  }
  
  // Try partial match (e.g., "IT" matches "IT Software & Services")
  for (const [key, multiple] of Object.entries(INDUSTRY_REVENUE_MULTIPLES)) {
    if (key.toLowerCase().includes(industry.toLowerCase()) || 
        industry.toLowerCase().includes(key.toLowerCase())) {
      return multiple;
    }
  }
  
  return INDUSTRY_REVENUE_MULTIPLES["Other"];
}

/**
 * Get the asset weight for an industry (0 = revenue-only, 1 = assets-only)
 */
function getAssetWeight(industry: string | null): number {
  if (!industry) return 0;
  
  for (const [key, weight] of Object.entries(ASSET_WEIGHT_BY_INDUSTRY)) {
    if (key.toLowerCase().includes(industry.toLowerCase()) || 
        industry.toLowerCase().includes(key.toLowerCase())) {
      return weight;
    }
  }
  
  return 0; // Default to revenue-based valuation
}

export type MarketCapEstimate = {
  estimatedMarketCap: number;
  method: "revenue_multiple" | "asset_based" | "hybrid" | "existing_valuation" | "minimal";
  confidence: "low" | "medium" | "high";
  details?: {
    revenue?: number;
    revenueMultiple?: number;
    assets?: number;
    assetMultiplier?: number;
    industry?: string;
  };
};

/**
 * Estimate market capitalization for a private company
 */
export function estimateMarketCap(data: {
  industry: string | null;
  revenueLatest: Prisma.Decimal | number | null;
  employees: number | null;
  valuationRangeLow: Prisma.Decimal | number | null;
  valuationRangeHigh: Prisma.Decimal | number | null;
  // Optional financial data
  assetsLatest?: Prisma.Decimal | number | null;
  equityLatest?: Prisma.Decimal | number | null;
}): MarketCapEstimate | null {
  
  // 1. If we have existing valuation range, use midpoint
  if (data.valuationRangeLow && data.valuationRangeHigh) {
    const low = typeof data.valuationRangeLow === 'number' 
      ? data.valuationRangeLow 
      : Number(data.valuationRangeLow);
    const high = typeof data.valuationRangeHigh === 'number' 
      ? data.valuationRangeHigh 
      : Number(data.valuationRangeHigh);
    
    if (low > 0 && high > 0) {
      return {
        estimatedMarketCap: (low + high) / 2,
        method: "existing_valuation",
        confidence: "high",
      };
    }
  }
  
  // 2. Revenue-based valuation (primary method)
  if (data.revenueLatest) {
    const revenue = typeof data.revenueLatest === 'number' 
      ? data.revenueLatest 
      : Number(data.revenueLatest);
    
    if (revenue > 0) {
      const revenueMultiple = getRevenueMultiple(data.industry);
      const assetWeight = getAssetWeight(data.industry);
      
      // Check if we should use hybrid approach (revenue + assets)
      if (assetWeight > 0 && data.assetsLatest) {
        const assets = typeof data.assetsLatest === 'number' 
          ? data.assetsLatest 
          : Number(data.assetsLatest);
        
        if (assets > 0) {
          // Hybrid: weighted average of revenue multiple and asset value
          const revenueValue = revenue * revenueMultiple;
          const assetValue = assets * 0.7; // Conservative 70% of book value
          const estimatedMarketCap = (revenueValue * (1 - assetWeight)) + (assetValue * assetWeight);
          
          return {
            estimatedMarketCap,
            method: "hybrid",
            confidence: "high",
            details: {
              revenue,
              revenueMultiple,
              assets,
              assetMultiplier: 0.7,
              industry: data.industry || "Unknown",
            },
          };
        }
      }
      
      // Pure revenue multiple
      return {
        estimatedMarketCap: revenue * revenueMultiple,
        method: "revenue_multiple",
        confidence: "medium",
        details: {
          revenue,
          revenueMultiple,
          industry: data.industry || "Unknown",
        },
      };
    }
  }
  
  // 3. Asset-based fallback (for companies with assets but no revenue data)
  if (data.assetsLatest) {
    const assets = typeof data.assetsLatest === 'number' 
      ? data.assetsLatest 
      : Number(data.assetsLatest);
    
    if (assets > 0) {
      // Use conservative 60% of book value for private companies
      return {
        estimatedMarketCap: assets * 0.6,
        method: "asset_based",
        confidence: "low",
        details: {
          assets,
          assetMultiplier: 0.6,
          industry: data.industry || "Unknown",
        },
      };
    }
  }
  
  // 4. Minimal estimate based on employees (very rough)
  if (data.employees && data.employees > 0) {
    // Very rough: ~100k EUR revenue per employee, 1.5x multiple
    const estimatedRevenue = data.employees * 100000;
    const multiple = getRevenueMultiple(data.industry);
    
    return {
      estimatedMarketCap: estimatedRevenue * multiple,
      method: "minimal",
      confidence: "low",
      details: {
        revenue: estimatedRevenue,
        revenueMultiple: multiple,
        industry: data.industry || "Unknown",
      },
    };
  }
  
  // No data available to estimate
  return null;
}

/**
 * Batch estimate market caps for multiple companies
 */
export function batchEstimateMarketCaps(
  companies: Array<{
    id: string;
    industry: string | null;
    revenueLatest: Prisma.Decimal | number | null;
    employees: number | null;
    valuationRangeLow: Prisma.Decimal | number | null;
    valuationRangeHigh: Prisma.Decimal | number | null;
    assetsLatest?: Prisma.Decimal | number | null;
    equityLatest?: Prisma.Decimal | number | null;
  }>
): Map<string, MarketCapEstimate> {
  const results = new Map<string, MarketCapEstimate>();
  
  for (const company of companies) {
    const estimate = estimateMarketCap(company);
    if (estimate) {
      results.set(company.id, estimate);
    }
  }
  
  return results;
}
