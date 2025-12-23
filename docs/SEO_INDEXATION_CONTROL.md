# SEO Indexation Control Summary

**Last Updated:** Prompt 33 - Final SEO Audit

## What We Want Google to Index

### Public Company Pages
- ✅ `/company/[slug]` - Canonical slug only (non-canonical redirects 301)
- ✅ `/c/[cui]` - Noindex, redirects to canonical slug
- **Structured Data:** Organization schema with BreadcrumbList

### Directory & Listing Pages
- ✅ `/companies` - With filters (canonicalize to filtered URL)
- ✅ `/top` - Top companies by ROMC score
- ✅ `/new` - Recently added companies
- ✅ `/movers` - Market movers (30-day changes)
- ✅ `/industries/[slug]` - Industry landing pages
- ✅ `/counties/[slug]` - County landing pages
- **Structured Data:** ItemList schema (current page items only, pagination-safe)

### Static Pages
- ✅ `/` - Homepage
- ✅ `/pricing` - Pricing page
- ✅ `/partners` - Partners page
- ✅ `/methodology` - Methodology explanation
- ✅ `/terms`, `/privacy`, `/disclaimer` - Legal pages
- ✅ `/status` - System status
- ✅ `/api-docs` - API documentation (noindex unless `API_DOCS_INDEXABLE=1`)
- ✅ `/digest` and `/digest/[week]` - Weekly digest issues

### Sitemaps
- ✅ `/sitemap.xml` - Sitemap index
- ✅ `/sitemaps/static.xml` - Static pages
- ✅ `/sitemaps/companies-{N}.xml` - Chunked company sitemaps (20k per chunk)
- **Inclusion Rules:**
  - Only canonical slugs (not old slugs)
  - Exclude demo companies (unless `DEMO_MODE=1` and not `LAUNCH_MODE=1`)
  - Only public, visible companies (`isPublic=true`, `visibilityStatus=PUBLIC`)

## What We Explicitly Do NOT Want Indexed

### User Account Pages
- ❌ `/dashboard` - `robots: { index: false, follow: false }`
- ❌ `/dashboard/alerts` - `robots: { index: false, follow: false }`
- ❌ `/dashboard/comparisons` - `robots: { index: false, follow: false }`
- ❌ `/dashboard/exports` - `robots: { index: false, follow: false }`
- ❌ `/watchlist` - `robots: { index: false, follow: false }`
- ❌ `/settings` - `robots: { index: false, follow: false }`

### Admin Pages
- ❌ `/admin/*` - Blocked via `robots.txt` (`disallow: /admin`)
- ❌ `/api/admin/*` - Blocked via `robots.txt` (`disallow: /api`)

### Convenience/Redirect Pages
- ❌ `/c/[cui]` - `robots: { index: false, follow: true }`, redirects to canonical
- ❌ `/company/[slug]/redirect` - Redirect route (not a page)

### API Routes
- ❌ `/api/*` - Blocked via `robots.txt`

### Auth Pages
- ❌ `/login` - Blocked via `robots.txt`
- ❌ `/account` - Blocked via `robots.txt`

## Canonical URL Rules

### Company Pages
- **Canonical:** `/company/[canonicalSlug]` (or `/company/[slug]` if `canonicalSlug` is null)
- **Non-canonical:** Redirects 301 to canonical slug
- **hreflang:** Currently single-language (RO), structure supports future EN expansion

### Filtered Directory Pages
- **Canonical:** Self-referencing (includes query parameters)
  - `/companies?q=...&industry=...&county=...&sort=...&page=...`
  - `/top?industry=...&county=...&page=...`
  - `/new?page=...`
- **Rationale:** Filtered views are distinct content, should be indexed separately

### Industry/County Pages
- **Canonical:** `/industries/[slug]` or `/counties/[slug]`
- **With pagination:** `/industries/[slug]?page=...` (canonical includes page param)

## Structured Data Rules

### Company Pages
- **Organization schema:** Required
  - Numeric values must be numbers (not strings)
  - URLs must be absolute
  - Includes: ROMC score, Confidence, ROMC AI, Integrity Score, Data Confidence, Valuation range, Last scored/enriched/changed
- **BreadcrumbList:** Required
  - Home → Companies → Industry (optional) → County (optional) → Company

### Directory Pages
- **ItemList schema:** Required
  - Only current page items (pagination-safe)
  - Position calculated: `(page - 1) * pageSize + index + 1`
  - Maximum 25 items per page
  - `numberOfItems` = total count

### Global Schema
- **Organization schema:** Single instance in `app/layout.tsx`
  - No conflicting WebSite schemas
  - No SearchAction (not implemented)

## Sitemap Rules

### Chunking
- **Max URLs per sitemap:** 20,000 (well under 50k limit)
- **Chunk naming:** `companies-{N}.xml` (1-indexed)

### Inclusion Criteria
- ✅ Public companies only (`isPublic=true`, `visibilityStatus=PUBLIC`)
- ✅ Canonical slugs only (`canonicalSlug ?? slug`)
- ✅ Exclude demo companies (unless `DEMO_MODE=1` and not `LAUNCH_MODE=1`)
- ✅ Deduplicate by canonical slug

### Exclusion Criteria
- ❌ Demo companies (when `DEMO_MODE=0` or `LAUNCH_MODE=1`)
- ❌ Admin pages
- ❌ Dashboard/settings pages
- ❌ API routes
- ❌ Non-canonical slugs

## Crawl Budget Protection

### No Crawl Traps
- ✅ Pagination limited (no infinite scroll)
- ✅ Filters are meaningful (not infinite combinations)
- ✅ Session/tracking params not in URLs
- ✅ No internal links to noindex pages (except admin/admin links)

### Internal Linking Strategy
- ✅ Home → Companies, Industries, Counties, Movers
- ✅ Company page → Industry page, County page, Related companies
- ✅ Industry/County pages → Top, Movers
- ✅ Footer links: Clean, not bloated, not duplicative

### rel="nofollow" Usage
- ✅ Not needed (no user-generated content links)
- ✅ Admin links are noindex anyway

## Canonical Discipline

### Enforcement
- ✅ Company pages redirect non-canonical slugs (301)
- ✅ Sitemaps use canonical slugs only
- ✅ Breadcrumbs use canonical slugs
- ✅ Internal links use canonical slugs (via `canonicalSlug ?? slug`)

### hreflang
- ✅ Currently single-language (RO default)
- ✅ Structure supports future EN expansion
- ✅ No hreflang on noindex pages
- ✅ Self-referencing canonical

## Launch Mode Behavior

When `LAUNCH_MODE=1`:
- ✅ Forces `DEMO_MODE=0` behavior
- ✅ Ensures robots.txt is indexable (unless `READ_ONLY_MODE` is set)
- ✅ Ensures sitemaps exclude demo companies
- ✅ Ensures `/api-docs` noindex unless `API_DOCS_INDEXABLE=1`
- ✅ Ensures `/company/[slug]` always redirects to `canonicalSlug`

## Verification Checklist

- [x] All company pages use canonical slugs
- [x] Sitemaps use canonical slugs only
- [x] Filtered URLs canonicalize to themselves
- [x] Directory pages have ItemList schema (pagination-safe)
- [x] Company pages have Organization + BreadcrumbList schemas
- [x] Numeric values in schema are numbers (not strings)
- [x] URLs in schema are absolute
- [x] Admin/dashboard pages are noindex
- [x] Demo companies excluded from sitemaps
- [x] No crawl traps (pagination limited, filters meaningful)
- [x] Internal linking strategy implemented
- [x] Canonical discipline enforced

## Known Limitations

1. **Single Language:** Currently RO-only, but structure supports EN expansion
2. **No SearchAction:** Not implemented (no site search)
3. **ItemList Limit:** Directory pages show max 25 items per page (acceptable for crawl budget)

## Production Safety

✅ **SEO is production-safe for scale**
✅ **No known crawl traps**
✅ **Canonical discipline enforced**

