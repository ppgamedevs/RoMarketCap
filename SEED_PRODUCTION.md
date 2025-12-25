# Seed Production Data - Instructions

## Step 1: Set Up Environment

Make sure your `.env` file has your Neon database URL:

```env
DATABASE_URL="your-neon-database-url-here"
```

## Step 2: Run Ingestion

Once your `.env` is configured with the Neon `DATABASE_URL`, run:

```bash
npm run ingest:source0
```

This will:
- Read from `data/seeds/companies.seed.json`
- Create/update companies in your Neon database
- Track import runs
- Show progress (created/updated/skipped/failed)

## Step 3: Calculate Scores

After importing companies, calculate ROMC scores:

```bash
npm run score:all
```

This will:
- Calculate ROMC scores for all companies
- Generate forecasts
- Update metrics

## What's in the Seed File

I've created a seed file with **50 well-known Romanian companies** including:
- Tech companies (Bitdefender, UiPath, Endava, etc.)
- Retail (eMAG, Altex, Dedeman, etc.)
- Logistics (FAN Courier, Sameday, etc.)
- Healthcare (MedLife, Regina Maria)
- Telecom (Orange, Vodafone, Digi)
- And more across various industries and counties

**Note:** The CUIs in the seed file are placeholder values (RO12345678 format). You should replace them with real CUIs from ANAF or your data sources.

## Next Steps

1. **Update CUIs:** Replace placeholder CUIs with real ones from ANAF
2. **Add more companies:** Expand the seed file with your actual company data
3. **Run ingestion:** `npm run ingest:source0`
4. **Calculate scores:** `npm run score:all`
5. **Verify:** Check `/companies` page to see imported companies

## Alternative: CSV Import

If you have a CSV file with real company data:

1. Go to `/admin/import` (as admin)
2. Upload your CSV file
3. Companies will be imported automatically

CSV format:
```csv
name,cui,county,city,industry,website,employees,revenueLatest
"Company Name","RO12345678","Bucharest","Bucharest","Software","https://example.com",50,1000000
```

