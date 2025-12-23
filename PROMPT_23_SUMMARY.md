# Prompt 23: Production Quality Pack v1 - Implementation Summary

## Status: In Progress

This document tracks the implementation of Prompt 23 features.

## Completed Components

### A) Search Relevance + Dedupe + Canonical Discipline
- ✅ **Search normalization** (`src/lib/search/normalize.ts`): Query normalization with diacritics removal, space collapsing
- ✅ **Search ranking** (`src/lib/search/rank.ts`): Ranking algorithm with exact match, startsWith, contains, token matching, data confidence boost, recency boost
- ✅ **Enhanced /api/search** (`app/api/search/route.ts`): Updated with ranking, CUI/domain search, normalization
- ✅ **Canonical slug support** (`prisma/schema.prisma`): Added `canonicalSlug` field to Company model
- ✅ **Canonical slug utilities** (`src/lib/slug/canonical.ts`): Functions for ensuring unique canonical slugs with collision handling
- ✅ **Company page canonical** (`app/company/[slug]/page.tsx`): Updated to use canonicalSlug
- ✅ **CUI route noindex** (`app/c/[cui]/page.tsx`): Added robots noindex directive

### B) Performance + Caching Plan
- ✅ **KV caching layer** (`src/lib/cache/kv.ts`): Server-side caching with TTL, stale-while-revalidate, versioning
- ✅ **DB indexes** (`prisma/schema.prisma`): Added indexes for:
  - `canonicalSlug`
  - `lastScoredAt`
  - `romcAiScore`
  - `dataConfidence`
  - Composite indexes: `[isPublic, visibilityStatus]`, `[industrySlug, countySlug]`, `[industrySlug, romcAiScore]`, `[countySlug, romcAiScore]`

### C) Observability and Error Tracking
- ✅ **Sentry integration** (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`): Minimal Sentry setup with secret filtering
- ✅ **Structured logging** (`src/lib/logging/logger.ts`): JSON logger with requestId, route, userId, error context

### D) Data Pipeline Correctness
- ✅ **Distributed locks** (`src/lib/locks/distributed.ts`): Lock acquisition, release, withLock helper, retry support
- ✅ **Retry wrapper** (`src/lib/retry/withRetry.ts`): Exponential backoff retry with configurable options
- ✅ **Dead-letter queue** (`src/lib/enrichment/deadletter.ts`): KV-based dead-letter list for failed enrichments (capped at 500)

### E) Health and Status Improvements
- ✅ **Enhanced /api/health** (`app/api/health/route.ts`): Added:
  - Cache health check
  - Lock status for all cron routes
  - Cron stuck detection (2x expected interval)
  - Improved cron health reporting

### F) Cron Route Updates
- ✅ **Recalculate route with locks** (`app/api/cron/recalculate/route.ts`): Wrapped with distributed lock, Sentry error capture

## Pending Components

### A) Canonical Redirects
- ⏳ Redirect route for old slugs (`app/company/[slug]/redirect/route.ts` - created but needs integration)
- ⏳ Update claim/submission approval to update canonical slugs

### B) Caching Integration
- ⏳ Apply caching to company page data
- ⏳ Apply caching to movers/top/new lists
- ⏳ Cache bypass for admins

### C) Cron Routes with Locks
- ⏳ Update `enrich` cron route with locks
- ⏳ Update `weekly-digest` cron route with locks
- ⏳ Update `watchlist-alerts` cron route with locks
- ⏳ Update `billing-reconcile` cron route with locks

### D) Security and Abuse Hardening
- ⏳ Separate rate limiter buckets for expensive endpoints
- ⏳ CSRF protection for state-changing routes

### E) SEO Hygiene
- ⏳ Add lastmod to sitemap
- ⏳ Add breadcrumb structured data for company pages

### F) Tests
- ⏳ Unit tests for search normalization and ranking
- ⏳ Unit tests for slug collision strategy
- ⏳ Unit tests for distributed lock behavior

## Environment Variables

New env vars required:
- `NEXT_PUBLIC_SENTRY_DSN` (optional): Sentry DSN for client-side
- `SENTRY_DSN` (optional): Sentry DSN for server-side

## Migration Notes

1. **Prisma Migration Required**: Run `npx prisma migrate dev` to add `canonicalSlug` field and new indexes
2. **Sentry Setup**: Configure Sentry DSNs if error tracking is desired
3. **Cache Versioning**: Consider setting a cache version env var for cache invalidation

## Next Steps

1. Complete cron route lock integration
2. Integrate caching into public routes
3. Add CSRF protection
4. Add SEO improvements (lastmod, breadcrumbs)
5. Write tests
6. Update README with QA checklist

