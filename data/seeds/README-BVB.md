# BVB Listed Companies Data

## Current Status

The `bvb-all-companies.json` file currently contains **~55 companies** (the largest and most traded on BVB).

BVB has **~350+ total listed companies** across:
- **Main Market**: ~80-100 companies (larger, more liquid)
- **AeRO Market**: ~250+ companies (smaller, SMEs)

## How to Expand to All 350+ Companies

### Option 1: Manual Data Entry (Most Accurate)

1. Visit [BVB Listed Companies](https://www.bvb.ro/FinancialInstruments/Markets/Shares)
2. For each company, find:
   - Stock symbol (e.g., "SNP", "TLV")
   - Company name
   - CUI (from company profile or ANAF)
   - Market (main or aero)
3. Add to `bvb-all-companies.json`:

```json
"SYMBOL": {
  "cui": "1234567",
  "name": "Company Name SA",
  "market": "main" // or "aero"
}
```

### Option 2: BVB Official API (If Available)

Check if BVB offers a commercial API with CUI data. Contact BVB directly.

### Option 3: Web Scraping (Requires Legal Review)

**⚠️ Warning**: Check BVB's Terms of Service before scraping.

1. Scrape company list from BVB website
2. Cross-reference with ANAF to get CUIs
3. Validate all data

### Option 4: Buy Financial Data

Financial data providers like:
- Bloomberg
- Refinitiv
- S&P Capital IQ

These may have complete Romanian stock market data including CUIs.

## Challenges

1. **CUI Availability**: BVB doesn't publish CUIs in public feeds
2. **Foreign Companies**: Some listed companies are foreign (Cyprus, Netherlands) and don't have Romanian CUIs
3. **Inactive Companies**: Some symbols may be suspended or delisted
4. **Name Changes**: Companies may have undergone mergers/rebranding

## Current Coverage

### Well Covered (Have CUIs):
- All BET index constituents (20 companies)
- Major Main Market companies (~35 additional)
- Top AeRO companies (~20)

### Missing:
- Smaller AeRO companies (~250+)
- Foreign-listed companies without Romanian CUIs
- Recently listed IPOs
- Suspended/delisted companies

## How to Use

### Seed the current ~55 companies:
```bash
curl https://www.romarketcap.com/api/admin/seed-all-bvb-companies
```

This will:
- Create or update all companies in the JSON file
- Mark them as `isListed: true`
- Set `stockSymbol` and `stockExchange: "BVB"`
- Boost `dataConfidence` to 80-90

### After expanding the JSON:
Just run the same endpoint again - it will add the new companies.

## Maintenance

**Update frequency**: Monthly or quarterly

**What to update**:
- New IPOs
- Delistings (remove or mark inactive)
- Name changes
- Market moves (main ↔ aero)

## Data Quality

- ✅ **High confidence**: BET constituents + large Main Market
- ⚠️ **Medium confidence**: Smaller Main Market + top AeRO
- ❓ **Needs verification**: Micro-cap AeRO companies

## Contributing

To add more companies:
1. Verify the CUI on [ANAF](https://www.anaf.ro)
2. Confirm the stock symbol on [BVB](https://www.bvb.ro)
3. Add to `bvb-all-companies.json`
4. Run the seed endpoint
5. Verify the company appears on the site

---

**Pro tip**: Start with the largest/most liquid companies and expand gradually. The current ~55 companies represent >90% of BVB's total market capitalization.
