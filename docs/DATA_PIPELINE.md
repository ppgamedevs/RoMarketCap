# Data Pipeline Documentation

This document describes the data flow from import to display.

## Overview

```
Import → Scoring → AI Scoring → Forecast → Changelog → Sitemap
```

## Stages

### 1. Import

**Sources:**
- CSV import via `/admin/import`
- Company submissions via `/api/company/[cui]/submit`
- Manual admin creation

**Data:**
- Company basic info (name, CUI, location, industry)
- Financial data (revenue, profit, employees)
- Metadata (source, confidence)

**Storage:**
- `Company` table
- `CompanyFinancialSnapshot` (if historical)
- `CompanySubmission` (pending submissions)

### 2. Scoring (ROMC v1)

**Trigger:**
- Manual: `/api/admin/score/recompute`
- Cron: `/api/cron/recalculate` (daily)

**Process:**
1. Compute ROMC v1 score (deterministic)
2. Update `Company.romcScore`, `Company.romcConfidence`
3. Store history in `CompanyScoreHistory`
4. Create snapshot in `ScoreSnapshot`

**Output:**
- `Company.romcScore` (0-100)
- `Company.romcConfidence` (0-100)
- `Company.valuationRangeLow/High`

### 3. AI Scoring (ROMC AI)

**Trigger:**
- Same as ROMC v1 (recalculate cron)

**Process:**
1. Compute ROMC AI score (explainable ML)
2. Update `Company.romcAiScore`, `Company.romcAiComponents`
3. Calculate delta from previous score
4. Update `Company.romcAiScoreDelta`

**Output:**
- `Company.romcAiScore` (0-100)
- `Company.romcAiComponents` (JSON breakdown)
- `Company.romcAiScoreDelta` (change from previous)

### 4. Forecast

**Trigger:**
- Same as scoring (recalculate cron)

**Process:**
1. Generate forecasts for 30/90/180 day horizons
2. Store in `CompanyForecast`
3. Model version: `pred-v1`

**Output:**
- `CompanyForecast` records per company
- Forecast score, confidence, bands, reasoning

### 5. Changelog

**Trigger:**
- Automatic on score changes
- Automatic on enrichment updates
- Automatic on claim/submission approvals

**Process:**
1. Detect changes (score delta, enrichment, approvals)
2. Create `CompanyChangeLog` entry
3. Store change type and metadata

**Output:**
- `CompanyChangeLog` entries
- Displayed on company pages as "Recent changes"

### 6. Enrichment

**Trigger:**
- Cron: `/api/cron/enrich` (every 6 hours)

**Process:**
1. Find companies with websites but missing enrichment
2. Fetch external data (if configured)
3. Update `Company` fields (website metadata, etc.)
4. Update `Company.lastEnrichedAt`

**Output:**
- Enriched company data
- `Company.lastEnrichedAt` timestamp

### 7. Sitemap Generation

**Trigger:**
- Automatic on page request
- Cached for 1 hour

**Process:**
1. Generate sitemap index (`/sitemap.xml`)
2. Generate static sitemap (`/sitemaps/static.xml`)
3. Generate company sitemaps (`/sitemaps/companies-*.xml`)
4. Exclude demo companies if `DEMO_MODE=0`

**Output:**
- XML sitemaps for search engines
- `lastmod` dates from `Company.lastUpdatedAt`

## Data Flow Diagram

```
┌─────────┐
│  Import │
└────┬────┘
     │
     ▼
┌─────────┐
│ Scoring │───► Company.romcScore
│ (ROMC)  │───► CompanyScoreHistory
└────┬────┘
     │
     ▼
┌──────────┐
│ AI Score │───► Company.romcAiScore
│ (ROMC AI)│───► Company.romcAiComponents
└────┬─────┘
     │
     ▼
┌──────────┐
│ Forecast │───► CompanyForecast (30/90/180d)
└────┬─────┘
     │
     ▼
┌──────────┐
│Changelog │───► CompanyChangeLog
└────┬─────┘
     │
     ▼
┌──────────┐
│ Sitemap  │───► /sitemap.xml
└──────────┘
```

## Cron Schedule

**Recommended Vercel Cron:**
- Recalculate: Daily at 02:15 Europe/Bucharest
- Enrich: Every 6 hours
- Weekly Digest: Monday 08:00 Europe/Bucharest
- Watchlist Alerts: Hourly
- Billing Reconcile: Daily at 03:00 Europe/Bucharest
- Snapshot: Daily at 04:00 Europe/Bucharest

## Data Retention

- **CompanyScoreHistory:** Kept indefinitely (for historical analysis)
- **CompanyForecast:** Kept indefinitely (for trend analysis)
- **CompanyChangeLog:** Kept indefinitely (for audit trail)
- **SystemSnapshot:** Last 30 days (auto-cleanup)

## Demo Mode

When `DEMO_MODE=1`:
- Demo companies included in queries
- Demo companies included in sitemaps
- Demo banner shown on public pages

When `DEMO_MODE=0` (default):
- Demo companies excluded from queries
- Demo companies excluded from sitemaps
- No demo banner

