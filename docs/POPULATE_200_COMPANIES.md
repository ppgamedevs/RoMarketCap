# Guide: Populate 200 Quality Companies

This guide walks you through populating the database from 91 to 200+ quality companies.

## Prerequisites

1. ✅ Database migration completed (`/api/admin/add-company-market-cap-history?secret=temp-migration-2024`)
2. ✅ Seed files created:
   - `data/seeds/medium-companies-romania.json` (~110 companies)
   - `data/seeds/medium-companies-revenue.json` (revenue data)

## Step-by-Step Process

### Step 1: Seed Medium Companies

**URL:** `/api/admin/seed-medium-companies`

This will:
- Create/update ~110 medium companies (rank 100-200)
- Set `isPublic: true`, `isSkeleton: false`
- Set `dataConfidence: 70`
- Apply post-ingestion hooks (scoring)

**Expected Result:** ~110 companies created/updated

### Step 2: Seed Revenue Data

**URL:** `/api/admin/seed-medium-companies-revenue`

This will:
- Update companies with revenue and employee data
- Enables market cap calculation

**Expected Result:** Revenue data added to medium companies

### Step 3: Calculate Market Caps

**URL:** `/api/admin/calculate-market-caps`

This will:
- Calculate estimated market caps for all companies with revenue
- Uses revenue multiples based on industry
- Works for both major and medium companies

**Expected Result:** Market caps calculated for companies with revenue

### Step 4: Boost Confidence Scores

**URL:** `/api/admin/boost-major-companies-confidence`

This will:
- Boost confidence to 70% for companies with revenue > 1M RON
- Includes both major (>1B) and medium (1M-1B) companies

**Expected Result:** Confidence scores boosted for quality companies

### Step 5: Clear Market Cache

**URL:** `/api/admin/clear-market-cache`

This will:
- Clear cached market data
- Force homepage to refresh with new companies

**Expected Result:** Homepage shows 200+ companies

### Step 6: Verify Results

**Check Homepage:**
- Visit `/` or `/market`
- Should show 200+ companies
- Companies should be sorted by market cap

**Check Company Count:**
```sql
SELECT COUNT(*) FROM companies WHERE is_public = true AND is_skeleton = false;
```

**Expected:** ~200 companies

## Populating Stock Price (Price per Share)

Stock prices are populated by the BVB sync cron job. To populate them manually:

### Option 1: Run BVB Sync (Recommended)

**URL:** `/api/cron/sync-bvb`

**Headers:**
```
x-cron-secret: <your-cron-secret>
```

Or if no secret configured, just visit the URL.

This will:
- Fetch all BVB listed companies
- Get stock prices from Yahoo Finance API
- Update `stockPrice` and `marketCap` fields
- Create `CompanyMarketCapHistory` records

**Expected Result:** Stock prices populated for all BVB listed companies

### Option 2: Run Intraday Sync (For BET Index Only)

**URL:** `/api/cron/sync-bvb-intraday`

**Headers:**
```
x-cron-secret: <your-cron-secret>
```

This syncs BET index companies (20 companies) more frequently.

**Note:** Requires feature flag `BVB_INTRADAY_SYNC_ENABLED` to be enabled.

## Verifying Stock Price Display

After running BVB sync:

1. Visit a BVB listed company page (e.g., `/company/banca-transilvania-5022670`)
2. Check for "Acțiuni" / "Stock Information" section
3. Should show:
   - Price per share (Preț per acțiune)
   - Market Cap
   - Stock Symbol

**If stock price is missing:**
- Check if company has `isListed: true`
- Check if company has `stockSymbol` set
- Verify BVB sync ran successfully
- Check company page shows `company.stockPrice` in the query

## Troubleshooting

### Companies Not Showing on Homepage

1. Check `isPublic: true` and `isSkeleton: false`
2. Check `dataConfidence >= 70` (or adjust filter)
3. Clear market cache: `/api/admin/clear-market-cache`
4. Verify companies have market caps

### Stock Price Not Showing

1. Verify company is marked as `isListed: true`
2. Check `stockSymbol` is set
3. Run BVB sync: `/api/cron/sync-bvb`
4. Check if Yahoo Finance API returned data
5. Verify `stockPrice` field exists in database (migration ran)

### Revenue Data Missing

1. Verify seed file has correct CUIs
2. Check revenue seed endpoint ran successfully
3. Verify companies exist before seeding revenue

## Quick Checklist

- [ ] Migration run: `/api/admin/add-company-market-cap-history?secret=temp-migration-2024`
- [ ] Seed medium companies: `/api/admin/seed-medium-companies`
- [ ] Seed revenue data: `/api/admin/seed-medium-companies-revenue`
- [ ] Calculate market caps: `/api/admin/calculate-market-caps`
- [ ] Boost confidence: `/api/admin/boost-major-companies-confidence`
- [ ] Clear cache: `/api/admin/clear-market-cache`
- [ ] Run BVB sync: `/api/cron/sync-bvb` (for stock prices)
- [ ] Verify homepage shows 200+ companies
- [ ] Verify stock prices show on listed company pages

## Expected Final State

- **200+ companies** in database
- All companies have:
  - Real names (not placeholders)
  - Revenue data (from seed)
  - Employee count (from seed)
  - Market cap estimates (calculated)
  - High confidence scores (70%+)
- BVB listed companies have:
  - `isListed: true`
  - `stockSymbol` set
  - `stockPrice` populated
  - `marketCap` from Yahoo Finance
- Companies sorted correctly by market cap on homepage
