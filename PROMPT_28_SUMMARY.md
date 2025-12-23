# Prompt 28 Implementation Summary

## What Changed

### A) Data Bootstrapping Pipeline v1

**New Prisma Models:**
- `ImportJob` - Tracks CSV import jobs with status, progress, errors
- `ImportRowError` - Records validation errors per row
- `CompanyProvenance` - Tracks data source and import metadata per company

**New Files:**
- `src/lib/import/csvStream.ts` - CSV parsing, validation, row hashing
- `app/api/admin/import/stream/route.ts` - Streaming CSV import API (POST)
- `app/(admin)/admin/import-jobs/page.tsx` - Admin UI for import jobs
- `app/(admin)/admin/import-jobs/ImportJobsClient.tsx` - Client component for import UI

**Features:**
- Streams large CSVs (>200k rows) without loading into memory
- Zod validation per row
- Deduplication by CUI (preferred) or domain
- Batch processing (100 rows per batch)
- Distributed lock prevents concurrent imports
- Admin auth + rate limiting
- Idempotent upserts by CUI

### B) Production Cron Schedule + Orchestrator

**New Files:**
- `docs/CRON_SCHEDULE.md` - Complete cron documentation
- `app/api/cron/orchestrate/route.ts` - Cron orchestrator route

**Features:**
- Single orchestrator route runs all cron jobs in sequence
- Budget controls (batch limits per job)
- Respects feature flags (skips disabled jobs)
- Tracks execution in KV (`cron:last:orchestrate`, `cron:stats:orchestrate`)
- Once-per-day/week enforcement for snapshot/digest
- Error handling with Sentry + Slack alerts

**Recommended Schedule:**
- `/api/cron/orchestrate` - Hourly (`0 * * * *`)

### C) Freshness Indicators

**New Files:**
- `src/lib/freshness/badge.ts` - Freshness classification logic
- `src/lib/freshness/aggregates.ts` - Sitewide freshness aggregates (cached 10min)
- `components/company/FreshnessIndicator.tsx` - Company page freshness UI

**Updated Files:**
- `app/company/[slug]/page.tsx` - Added FreshnessIndicator component
- `app/status/page.tsx` - Added "Data Freshness" section with aggregates

**Features:**
- Freshness badges: Fresh (<7 days), Stale (7-30), Old (>30)
- Shows: Last scored, Last enriched, Data confidence, Integrity score
- Sitewide aggregates: % companies scored/enriched within 7/30 days
- Bilingual (RO/EN)

### D) Revenue Day-1 Switch Verification

**New Files:**
- `app/(admin)/admin/revenue-check/page.tsx` - Revenue check admin page
- `app/(admin)/admin/revenue-check/RevenueCheckClient.tsx` - Client component
- `app/api/admin/revenue/test-checkout/route.ts` - Test checkout endpoint

**Features:**
- Verification checklist (Stripe config, price ID, webhook secret, billing cron)
- Quick toggles for paywalls/placements
- Test checkout link generation
- Audit logging for all actions

### E) Launch Mode Behavior

**New Files:**
- `src/lib/launch/mode.ts` - Launch mode utilities

**Updated Files:**
- `components/layout/DemoBanner.tsx` - Hides banner in launch mode
- `app/api/admin/demo/seed/route.ts` - Blocks in launch mode
- `app/api/admin/demo/clear/route.ts` - Blocks in launch mode
- `app/api/health/route.ts` - Reports launch mode status
- `app/sitemap.xml/route.ts` - Uses `getEffectiveDemoMode()`
- `app/sitemaps/[name]/route.ts` - Uses `getEffectiveDemoMode()`
- `src/lib/db/companyQueries.ts` - Uses `getEffectiveDemoMode()`

**Features:**
- `LAUNCH_MODE=1` forces `DEMO_MODE=0` behavior
- Hides demo banner always
- Disallows seed/clear demo endpoints
- Ensures robots.txt is indexable (unless READ_ONLY_MODE)
- Ensures sitemaps exclude demo companies
- Ensures canonical slug redirects (already implemented)

### F) Tests + Verification

**New Test Files:**
- `src/lib/freshness/badge.test.ts` - Freshness classification tests
- `src/lib/launch/mode.test.ts` - Launch mode behavior tests
- `src/lib/import/csvStream.test.ts` - CSV parsing and validation tests

**All Tests Pass:** ✅ 128 tests passing

**Build Status:** ✅ Build successful

## Required Migrations

Run Prisma migration to add new models:

```bash
npx prisma migrate dev --name add_import_pipeline
```

This will create:
- `import_jobs` table
- `import_row_errors` table
- `company_provenance` table

## Manual QA Steps

1. **CSV Import:**
   - Go to `/admin/import-jobs`
   - Upload a test CSV with columns: name, cui, county, city
   - Verify job status updates
   - Check errors are recorded correctly

2. **Cron Orchestrator:**
   - Set up Vercel cron: `/api/cron/orchestrate` hourly
   - Verify KV keys are updated (`cron:last:orchestrate`)
   - Check `/admin/ops` for orchestrator stats
   - Disable a feature flag, verify job is skipped

3. **Freshness Indicators:**
   - Visit a company page, verify freshness badge appears
   - Visit `/status`, verify "Data Freshness" section shows aggregates
   - Check bilingual strings (RO/EN)

4. **Revenue Check:**
   - Go to `/admin/revenue-check`
   - Verify checklist shows correct status
   - Toggle paywalls/placements
   - Send test checkout link, verify Stripe checkout opens

5. **Launch Mode:**
   - Set `LAUNCH_MODE=1` in env vars
   - Verify demo banner is hidden
   - Verify demo seed/clear endpoints return 403
   - Verify sitemaps exclude demo companies
   - Verify `/api/health` reports `launchMode: true`

## Expected Env Vars

**New:**
- `LAUNCH_MODE` - Set to `1` to enable launch mode (optional)

**Existing (unchanged):**
- All existing env vars remain the same
- `DEMO_MODE` - Still works, but overridden by `LAUNCH_MODE=1`

## Documentation Updates

- `README.md` - Updated with:
  - Cron orchestrator recommendation
  - Data bootstrapping pipeline section
  - Freshness indicators section
  - Revenue check section
  - Launch mode section
- `docs/CRON_SCHEDULE.md` - New file with complete cron documentation

## Next Steps

1. Run Prisma migration
2. Set up Vercel cron for orchestrator (or individual routes)
3. Test CSV import with real data
4. Verify freshness indicators on production data
5. Test revenue check flow end-to-end
6. Set `LAUNCH_MODE=1` before production launch

