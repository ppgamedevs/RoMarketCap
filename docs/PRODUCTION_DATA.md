# Production Data Setup

**Last Updated:** 2024

---

## Where is Production Data?

**All production data is stored in your Neon PostgreSQL database.**

The database is connected via the `DATABASE_URL` environment variable. All company data, scores, metrics, and user data live in PostgreSQL.

---

## How to Populate Production Data

### Option 1: CSV Import (Recommended for Bulk Data)

**Admin Interface:**
1. Log in as admin
2. Go to `/admin/import`
3. Upload a CSV file with company data

**CSV Format:**
```csv
name,cui,county,city,industry,website,employees,revenueLatest,profitLatest
"Company Name","RO12345678","Bucharest","Bucharest","Software","https://example.com",50,1000000,100000
```

**API Endpoint (Streaming for Large Files):**
- POST `/api/admin/import/stream`
- Upload CSV file
- Processes in batches automatically

**Required Fields:**
- `name` (required)
- `cui` (optional but recommended)
- `county`, `city`, `industry` (optional)
- `website` (optional)

**Optional Fields:**
- `employees`, `revenueLatest`, `profitLatest`
- `foundedYear`, `caenCode`, `description`

---

### Option 2: JSON Seed File

**File Location:** `data/seeds/companies.seed.json`

**Format:**
```json
[
  {
    "name": "Company Name",
    "cui": "RO12345678",
    "county": "Bucharest",
    "city": "Bucharest",
    "caen": "6201",
    "website": "https://example.com"
  }
]
```

**Import Command:**
```bash
npm run ingest:source0
```

This script:
- Reads from `data/seeds/companies.seed.json`
- Creates companies (idempotent - won't duplicate)
- Updates existing companies if data changes
- Tracks import runs in database

---

### Option 3: Development Seed (Sample Data)

**Command:**
```bash
npm run db:seed
```

**What it does:**
- Creates 20 sample Romanian companies (Bitdefender, eMAG, etc.)
- Adds financial snapshots
- Generates ROMC scores
- Creates metrics and forecasts

**Note:** This is for development/testing. Use CSV import or JSON seed for production.

---

### Option 4: Company Submissions (User-Generated)

**Public API:**
- POST `/api/company/[cui]/submit`
- Users can submit company data
- Requires moderation/approval

**Admin Moderation:**
- Go to `/admin/moderation`
- Review pending submissions
- Approve or reject

---

### Option 5: Manual Admin Creation

**Via Database:**
- Use Prisma Studio: `npm run db:studio`
- Or direct SQL queries

**Via Admin Interface:**
- (If admin UI for company creation exists)

---

## Data Sources

### Current Data Sources

1. **ANAF (Romanian Tax Authority)** - Public records
2. **Public Records** - Company registrations
3. **Web Enrichment** - Website scraping, APIs
4. **User Submissions** - Company claims and corrections

### Data Pipeline

```
Import → Scoring → AI Scoring → Forecast → Display
```

1. **Import:** Companies added via CSV/JSON/manual
2. **Scoring:** ROMC scores calculated (via cron or manual)
3. **AI Scoring:** AI-enhanced scores (via cron)
4. **Forecast:** 90/180 day forecasts generated
5. **Display:** Data shown on website

---

## Scoring & Metrics

### Automatic Scoring

**Cron Job:** `/api/cron/recalculate`
- Runs daily (configure in Vercel Cron)
- Recalculates ROMC scores for all companies
- Updates AI scores
- Generates forecasts

**Manual Trigger:**
- POST `/api/admin/score/recompute`
- Or: `npm run score:all`

### What Gets Calculated

- **ROMC Score** (0-100) - Main company score
- **ROMC AI Score** (0-100) - AI-enhanced score
- **Confidence** (0-100) - Data confidence level
- **Valuation Range** - Estimated company value
- **Forecasts** - 90/180 day projections

---

## Database Schema

### Main Tables

- **`companies`** - Company basic info
- **`company_financial_snapshots`** - Historical financial data
- **`company_metrics`** - Current metrics (employees, revenue, etc.)
- **`company_score_snapshots`** - ROMC score history
- **`company_forecasts`** - Future score projections
- **`company_claims`** - User claims (pending/approved)
- **`company_submissions`** - User submissions (pending moderation)

---

## Production Setup Checklist

### 1. Database Setup
- [ ] Neon database created
- [ ] `DATABASE_URL` set in environment
- [ ] Migrations applied: `npm run db:migrate:deploy`

### 2. Initial Data Import
- [ ] Prepare CSV file with company data
- [ ] Or prepare `data/seeds/companies.seed.json`
- [ ] Import via admin interface or script

### 3. Scoring Setup
- [ ] Run initial scoring: `npm run score:all`
- [ ] Set up cron job: `/api/cron/recalculate` (daily)

### 4. Enrichment Setup (Optional)
- [ ] Configure enrichment APIs (if using)
- [ ] Set up cron job: `/api/cron/enrich` (every 6 hours)

---

## Data Import Examples

### CSV Import Example

```csv
name,cui,county,city,industry,website,employees,revenueLatest
"Bitdefender SRL","RO12345678","Bucharest","Bucharest","Cybersecurity","https://bitdefender.com",1500,50000000
"eMAG SRL","RO23456789","Ilfov","Voluntari","E-commerce","https://emag.ro",3000,200000000
```

### JSON Seed Example

```json
[
  {
    "name": "Bitdefender SRL",
    "cui": "RO12345678",
    "county": "Bucharest",
    "city": "Bucharest",
    "caen": "6201",
    "website": "https://bitdefender.com"
  },
  {
    "name": "eMAG SRL",
    "cui": "RO23456789",
    "county": "Ilfov",
    "city": "Voluntari",
    "caen": "4711",
    "website": "https://emag.ro"
  }
]
```

---

## Data Quality

### Source Confidence Levels

- **High (80-100%):** Official sources (ANAF, public records)
- **Medium (50-79%):** Enriched data (web scraping, APIs)
- **Low (<50%):** Estimated or incomplete data

### Data Validation

- **CUI validation:** Checks format (RO + 8 digits)
- **Slug generation:** Automatic from company name
- **Deduplication:** By CUI or domain
- **Canonical slugs:** For redirects and SEO

---

## Maintenance

### Regular Tasks

1. **Daily:** Cron recalculates scores
2. **Every 6 hours:** Enrichment updates (if enabled)
3. **Weekly:** Review pending submissions/claims
4. **Monthly:** Review data quality and confidence scores

### Data Updates

- **Automatic:** Via cron jobs
- **Manual:** Via admin interface
- **User-driven:** Via claims and submissions

---

## Troubleshooting

### No Companies Showing

1. **Check database connection:** Verify `DATABASE_URL`
2. **Check migrations:** Run `npm run db:migrate:deploy`
3. **Import data:** Use CSV import or seed file
4. **Check visibility:** Ensure `isPublic: true` and `visibilityStatus: "PUBLIC"`

### Scores Not Calculating

1. **Run manual scoring:** `npm run score:all`
2. **Check cron job:** Verify `/api/cron/recalculate` is running
3. **Check metrics:** Companies need metrics for scoring

### Data Not Updating

1. **Check enrichment:** Verify enrichment cron is running
2. **Check last updated:** Review `Company.lastUpdatedAt`
3. **Check source confidence:** Low confidence data may not update

---

**This document explains where production data comes from and how to populate it.**

