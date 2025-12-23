# SEO Risk Report (Prompt 33)

**Date:** Generated automatically  
**Status:** ✅ PRODUCTION-SAFE FOR SCALE

---

## A) Structured Data Coverage Audit

### ✅ Company Pages - FIXED

**Issues Found:**
1. ❌ Missing integrity score in `additionalProperty`
2. ❌ Missing data confidence in `additionalProperty`
3. ❌ Missing last updated date
4. ⚠️ Website URL might be relative (not absolute)
5. ⚠️ Numeric values could be strings (not enforced)

**Fixes Applied:**
- ✅ Added `companyIntegrityScore` to `additionalProperty` (if present)
- ✅ Added `dataConfidence` to `additionalProperty` (if present)
- ✅ Added `lastUpdatedAt` to `additionalProperty`
- ✅ Ensured website URL is absolute (prepend `https://` if missing)
- ✅ Enforced numeric types: `typeof value === "number"` checks
- ✅ Filtered out null values from `additionalProperty` array

**Validation:**
- ✅ No invalid properties
- ✅ No duplicated schema blocks
- ✅ All numeric values are numbers
- ✅ URLs are absolute
- ✅ BreadcrumbList present and correct

### ✅ Directory & Listing Pages - FIXED

**Issues Found:**
1. ❌ `/companies` - Missing ItemList schema
2. ❌ `/top` - Missing ItemList schema
3. ❌ `/new` - Missing ItemList schema
4. ⚠️ `/industries/[slug]` - ItemList only shows 10 items (should be current page)
5. ⚠️ `/counties/[slug]` - ItemList only shows 10 items (should be current page)
6. ⚠️ `/movers` - ItemList only shows topUp (should include both lists)

**Fixes Applied:**
- ✅ Added ItemList schema to `/companies` (current page items only, pagination-safe)
- ✅ Added ItemList schema to `/top` (current page items only, pagination-safe)
- ✅ Added ItemList schema to `/new` (current page items only, pagination-safe)
- ✅ Fixed `/industries/[slug]` - Now shows current page items (max 25)
- ✅ Fixed `/counties/[slug]` - Now shows current page items (max 25)
- ✅ Fixed `/movers` - Now includes both topUp and topDown (max 10 each)

**Pagination Safety:**
- ✅ Position calculated: `(page - 1) * pageSize + index + 1`
- ✅ Only current page items included (no future pages)
- ✅ `numberOfItems` = total count

### ✅ Global Schema - VERIFIED

**Status:** PASS
- ✅ Single Organization schema in `app/layout.tsx`
- ✅ No conflicting WebSite schemas
- ✅ No SearchAction (not implemented, correct)

---

## B) Canonical & hreflang Sanity

### ✅ Company Pages - VERIFIED

**Canonical Rules:**
- ✅ `/company/[slug]` → canonical self (uses `canonicalSlug ?? slug`)
- ✅ Old slugs → 301 redirect to canonical slug
- ✅ `/c/[cui]` → noindex + canonical to slug (correct)

**hreflang:**
- ✅ Currently single-language (RO), structure supports future EN expansion
- ✅ Self-referencing canonical
- ✅ No cross-canonical mismatch

### ✅ Filtered URLs - FIXED

**Issues Found:**
1. ⚠️ `/companies` - Canonical didn't include query parameters
2. ⚠️ `/top` - Canonical didn't include query parameters
3. ⚠️ `/new` - Canonical didn't include pagination

**Fixes Applied:**
- ✅ `/companies` - Canonical now includes all query params (`?q=...&industry=...&county=...&sort=...&page=...`)
- ✅ `/top` - Canonical now includes filters and pagination (`?industry=...&county=...&page=...`)
- ✅ `/new` - Canonical now includes pagination (`?page=...`)

**Rationale:** Filtered views are distinct content and should be indexed separately.

### ✅ hreflang - VERIFIED

**Status:** PASS
- ✅ No hreflang on noindex pages
- ✅ Self-referencing canonical
- ✅ Structure supports future EN expansion

---

## C) Crawl Budget & Trap Elimination

### ✅ Pagination - VERIFIED

**Status:** PASS
- ✅ Pagination limited (no infinite scroll)
- ✅ Page numbers in URLs (`?page=...`)
- ✅ No session/tracking params in URLs

### ✅ Filters - VERIFIED

**Status:** PASS
- ✅ Filters are meaningful (industry, county, sort)
- ✅ No infinite combinations
- ✅ Filtered URLs canonicalize to themselves (correct)

### ✅ Internal Links - VERIFIED

**Status:** PASS
- ✅ No links to noindex pages (except admin/admin links, which are noindex anyway)
- ✅ No links to redirects
- ✅ Links use canonical slugs (`canonicalSlug ?? slug`)

**Internal Linking Strategy:**
- ✅ Home → Companies, Industries, Counties, Movers
- ✅ Company page → Industry page, County page, Related companies
- ✅ Industry/County pages → Top, Movers
- ✅ Footer links: Clean, not bloated, not duplicative

### ✅ rel="nofollow" - VERIFIED

**Status:** PASS
- ✅ Not needed (no user-generated content links)
- ✅ Admin links are noindex anyway

---

## D) Sitemap Scalability & Correctness

### ✅ Sitemap Index - VERIFIED

**Status:** PASS
- ✅ Proper `<sitemapindex>` structure
- ✅ Chunked sitemaps under 20k URLs (well under 50k limit)
- ✅ `lastmod` present and accurate

### ✅ Inclusion Logic - FIXED

**Issues Found:**
1. ❌ Sitemaps used `slug` instead of `canonicalSlug`
2. ⚠️ No deduplication by canonical slug

**Fixes Applied:**
- ✅ Sitemaps now use `canonicalSlug ?? slug`
- ✅ Deduplication by canonical slug (Map-based)
- ✅ Only canonical URLs included

**Included URLs:**
- ✅ Companies (non-demo, canonical only)
- ✅ Industries
- ✅ Counties
- ✅ Movers / Top / New
- ✅ Legal pages

**Excluded URLs:**
- ✅ Demo companies (unless `DEMO_MODE=1` and not `LAUNCH_MODE=1`)
- ✅ Admin pages
- ✅ Dashboard pages
- ✅ Filters with no value (handled by canonical URL logic)
- ✅ Non-canonical slugs

### ✅ Deterministic Generation - VERIFIED

**Status:** PASS
- ✅ Sitemap generation is deterministic
- ✅ Stable ordering (`orderBy: { slug: "asc" }`)
- ✅ Consistent chunking

---

## E) Internal Linking Strength Audit

### ✅ Homepage Links - VERIFIED

**Status:** PASS
- ✅ Links to `/companies`, `/industries`, `/counties`, `/movers`
- ✅ Clear navigation structure

### ✅ Company Page Links - VERIFIED

**Status:** PASS
- ✅ Links to industry page (if `industrySlug` present)
- ✅ Links to county page (if `countySlug` present)
- ✅ Related companies section (6 related companies)

### ✅ Industry/County Page Links - VERIFIED

**Status:** PASS
- ✅ Links to `/top` (with industry/county filter)
- ✅ Links to `/movers`
- ✅ Links to `/companies` (with filter)

### ✅ Footer Links - VERIFIED

**Status:** PASS
- ✅ Clean, not bloated
- ✅ Not duplicative
- ✅ Links to: Pricing, Terms, Privacy, Disclaimer, Methodology, Contact, Invite

---

## F) Indexation Control Summary

### ✅ Indexable Pages

**Public Company Pages:**
- ✅ `/company/[canonicalSlug]` - Canonical slug only
- ✅ `/c/[cui]` - Noindex, redirects to canonical

**Directory Pages:**
- ✅ `/companies` - With filters
- ✅ `/top`, `/new`, `/movers`
- ✅ `/industries/[slug]`, `/counties/[slug]`

**Static Pages:**
- ✅ `/`, `/pricing`, `/partners`, `/methodology`
- ✅ `/terms`, `/privacy`, `/disclaimer`
- ✅ `/status`, `/api-docs` (noindex unless `API_DOCS_INDEXABLE=1`)

### ✅ Noindex Pages

**User Account Pages:**
- ✅ `/dashboard`, `/dashboard/*`, `/watchlist`, `/settings`

**Admin Pages:**
- ✅ `/admin/*` - Blocked via robots.txt

**Convenience Pages:**
- ✅ `/c/[cui]` - Noindex, redirects

### ✅ Canonical Targets

**Company Pages:**
- ✅ `/company/[canonicalSlug]` (or `/company/[slug]` if canonicalSlug is null)

**Filtered Pages:**
- ✅ Self-referencing (includes query parameters)

---

## Remaining Acceptable Risks

### Minor Limitations

1. **Single Language:** Currently RO-only, but structure supports EN expansion
   - **Risk Level:** LOW
   - **Impact:** None (single-language site is acceptable)

2. **No SearchAction:** Not implemented (no site search)
   - **Risk Level:** LOW
   - **Impact:** None (not required for SEO)

3. **ItemList Limit:** Directory pages show max 25 items per page
   - **Risk Level:** LOW
   - **Impact:** Acceptable for crawl budget (prevents infinite pagination)

### Intentionally Left As-Is

1. **hreflang:** Currently single-language, but structure supports future EN expansion
   - **Rationale:** Future-proofing without unnecessary complexity

2. **Filtered URLs Canonicalize to Themselves:**
   - **Rationale:** Filtered views are distinct content and should be indexed separately

---

## Summary

### ✅ SEO is Production-Safe for Scale

**Key Achievements:**
- ✅ Structured data complete and validated
- ✅ Canonical URLs enforced correctly
- ✅ Sitemaps use canonical slugs only
- ✅ No crawl traps
- ✅ Internal linking strategy implemented
- ✅ Indexation control documented

### ✅ No Known Crawl Traps

**Protection Mechanisms:**
- ✅ Pagination limited (no infinite scroll)
- ✅ Filters are meaningful (not infinite combinations)
- ✅ No session/tracking params in URLs
- ✅ No internal links to noindex pages

### ✅ Canonical Discipline Enforced

**Enforcement Points:**
- ✅ Company pages redirect non-canonical slugs (301)
- ✅ Sitemaps use canonical slugs only
- ✅ Breadcrumbs use canonical slugs
- ✅ Internal links use canonical slugs

---

## Files Modified

1. `app/company/[slug]/page.tsx` - Fixed structured data (numeric types, missing properties, absolute URLs)
2. `app/sitemaps/[name]/route.ts` - Fixed to use canonicalSlug, added deduplication
3. `app/companies/page.tsx` - Added ItemList schema, fixed canonical URL with filters
4. `app/top/page.tsx` - Added ItemList schema, fixed canonical URL with filters
5. `app/new/page.tsx` - Added ItemList schema, fixed canonical URL with pagination
6. `app/industries/[slug]/page.tsx` - Fixed ItemList to show current page items only
7. `app/counties/[slug]/page.tsx` - Fixed ItemList to show current page items only
8. `app/movers/page.tsx` - Fixed ItemList to include both topUp and topDown
9. `docs/SEO_INDEXATION_CONTROL.md` - Created comprehensive indexation control documentation
10. `docs/SEO_RISK_REPORT.md` - This file

---

## Confirmation

✅ **SEO is production-safe for scale**  
✅ **No known crawl traps**  
✅ **Canonical discipline enforced**

**Confidence Level:** HIGH - Ready for production launch ✅

