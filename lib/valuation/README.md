# Valuation & Market Cap Estimation

This module handles company valuation and market capitalization estimation for RoMarketCap.

## Overview

### Market Cap Sources

1. **BVB Listed Companies** (Real data)
   - Market cap from Bucharest Stock Exchange
   - Updated via static seed file (data/seeds/bvb-market-caps.json)
   - 55 companies with actual public market valuations

2. **Private Companies** (Estimated)
   - Revenue-based multiples (primary method)
   - Asset-based valuation (for certain industries)
   - Hybrid approach (revenue + assets weighted)
   - Employee-based estimates (fallback)

## Estimation Methods

### 1. Revenue Multiple Method
Most common approach for private companies.

Estimated Market Cap = Revenue × Industry Multiple

Industry Multiples (Price-to-Sales ratios):
- IT & Software: 3.5x
- Healthcare: 2.8x
- Finance: 2.5x
- Retail: 1.5x
- Manufacturing: 1.2x
- Agriculture: 1.0x

### 2. Hybrid Method
Used for asset-heavy industries (real estate, banking, energy).

Market Cap = (Revenue × Multiple × (1 - w)) + (Assets × 0.7 × w)

Where w is the industry asset weight (0 to 1).

### 3. Asset-Based Method
Fallback when revenue data is unavailable.

Estimated Market Cap = Assets × 0.6

Uses conservative 60% of book value for private companies.

### 4. Minimal Method
Very rough estimate based on employees only.

Estimated Revenue = Employees × 100k EUR
Market Cap = Estimated Revenue × Industry Multiple

## Usage

### Calculate Market Caps for All Companies

Dry run to see what would be updated:
/api/admin/calculate-market-caps?dryRun=true

Actually update the database:
/api/admin/calculate-market-caps

Process in smaller batches:
/api/admin/calculate-market-caps?batchSize=50

### Update BVB Market Caps (Real Data)

Seed actual market caps for BVB listed companies:
/api/admin/seed-bvb-market-caps

## Data Quality

Confidence Levels:
- high: Existing valuation data or hybrid method
- medium: Revenue multiple method with good data
- low: Asset-based or employee-based estimates

## Maintenance

Monthly Tasks:
1. Update data/seeds/bvb-market-caps.json with latest BVB data
2. Run /api/admin/seed-bvb-market-caps to update real market caps
3. Run /api/admin/calculate-market-caps to refresh estimates

Industry Multiples Review:
Review and adjust multiples quarterly based on:
- Romanian market conditions
- Global industry trends
- Actual valuations from deals/IPOs

## Files

- src/lib/valuation/estimateMarketCap.ts - Core estimation logic
- app/api/admin/calculate-market-caps/route.ts - Batch calculation endpoint
- app/api/admin/seed-bvb-market-caps/route.ts - BVB data import
- data/seeds/bvb-market-caps.json - Real BVB market cap data
