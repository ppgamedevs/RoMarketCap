# Universe Index Builder (PROMPT 57)

**Status:** Implemented ✅

## Overview

The Universe Index Builder creates "skeleton companies" with minimal public data (CUI, name, county, CAEN code, status) that can be indexed and searched, but don't appear in rankings until they have more data.

Similar to CoinMarketCap's token universe: thousands of tokens indexed, but only a subset have market cap and appear in rankings.

## Architecture

### Skeleton Companies

**Required fields only:**
- CUI (unique identifier)
- legalName
- countySlug (optional)
- caenCode (optional)
- foundedAt (optional)

**No financials required:**
- No revenue/profit/employees
- No scoring on creation
- No enrichment

**Universe tracking:**
- `universeSource`: SEAP | EU_FUNDS | ANAF | USER | THIRD_PARTY
- `universeConfidence`: 0-100
- `universeVerified`: boolean
- `isSkeleton`: true (marks as minimal data)

### Promotion Logic

A skeleton company becomes "active" when:
- Has financial data (revenueLatest or employees)
- Has been enriched (lastEnrichedAt)
- Has been claimed (isClaimed)
- Has ROMC AI score (romcAiScore)

Promotion happens automatically via `checkSkeletonPromotion()`.

## Ranking Exclusion

Skeleton companies are excluded from:
- Top lists (`/top`)
- Movers (`/movers`)
- ROMC AI calculations
- Ranking queries (via `rankingGuard`)

But they are:
- Indexed in sitemaps
- Searchable
- Visible on company pages
- May have `noindex` meta tag if confidence < 50

## Usage

### Manual Ingestion

```bash
curl -X POST "http://localhost:3000/api/cron/universe-ingest?source=SEAP&limit=1000&dry=1" \
  -H "x-cron-secret: your-secret"
```

### Automated Cron

The cron route `/api/cron/universe-ingest` processes data from configured sources:

**Environment Variables:**
- `SEAP_CSV_URL`: URL to SEAP CSV file
- `EU_FUNDS_CSV_URL`: URL to EU Funds CSV file

**Feature Flag:**
- `FLAG_UNIVERSE_INGEST`: Enable/disable universe ingestion (default: disabled, fail-closed)

**Usage:**
```bash
POST /api/cron/universe-ingest?source=SEAP&limit=1000&dry=true
Headers: x-cron-secret: <CRON_SECRET>
```

**Parameters:**
- `source`: `SEAP` or `EU_FUNDS` (optional, processes all if not specified)
- `limit`: Max companies to process (default: 1000, max: 5000)
- `dry`: Dry run mode (default: false)

## Admin UI

Access at `/admin/universe` to view:
- Total companies
- Active scored companies
- Skeleton companies
- Sources breakdown (SEAP, EU Funds, ANAF, User, Third Party)
- Actions to trigger ingestion

## Sitemap Integration

Skeleton companies are included in sitemaps (`/sitemaps/companies-*.xml`), but may have `noindex` meta tag if:
- `isSkeleton = true`
- `universeConfidence < 50` (or `dataConfidence < 50`)

This allows indexing while preventing low-quality pages from ranking.

## SEO Impact

**Expected scale:**
- Skeleton companies: 100,000 - 500,000
- Active scored: 5,000 - 20,000
- Premium-grade: 1,000 - 3,000

**Benefits:**
- Massive SEO boost (hundreds of thousands of indexed pages)
- Press citations ("index of X companies")
- Investor discovery ("under-the-radar" companies)
- Founder engagement (claim their page)
- Legal safety (only public minimal data)

## Safety

- **No sensitive data**: Only CUI, name, county, CAEN code, status
- **No financials**: No revenue/profit/employees on creation
- **Public sources only**: SEAP, EU Funds, ANAF (all public)
- **Fail-closed**: Feature flag defaults to disabled
- **Rate limited**: 1000 companies per run, 60s time budget
- **Idempotent**: Re-running doesn't duplicate

## Tests

See:
- `src/lib/universe/skeleton.test.ts` - Skeleton creation and promotion
- `src/lib/ranking/rankingGuard.test.ts` - Ranking exclusion

## Integration

The orchestrator (`/api/cron/orchestrate`) can call `/api/cron/universe-ingest` if `FLAG_UNIVERSE_INGEST` is enabled.

## Rollback

To disable universe ingestion:
1. Set feature flag: `FLAG_UNIVERSE_INGEST=false` in KV
2. Or via admin UI: `/admin/flags`
3. System will skip universe ingestion on next orchestrator run

No data is deleted - skeleton companies remain but won't be updated.

