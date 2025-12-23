# Marketing Metrics - Single Source of Truth

**Last Updated:** Prompt 36  
**Purpose:** Define and track marketing KPIs that matter for RoMarketCap.ro growth

---

## Core Principle

**We measure what moves the business forward, not vanity metrics.**

If these metrics move up, you're winning:
- ✅ Indexed pages ↑
- ✅ Brand searches ("romarketcap") ↑
- ✅ Claimed companies ↑
- ✅ Watchlists ↑
- ✅ Newsletter subs ↑
- ✅ Premium conversions ↑
- ✅ API key requests ↑

Everything else is secondary.

---

## Metric Definitions

### Traffic Metrics

**Source:** Plausible Analytics API (requires `PLAUSIBLE_API_KEY`)

#### Organic Traffic
- **Definition:** Unique visitors from organic search (non-branded)
- **Period:** 7-day rolling window
- **Calculation:** Current week vs previous week
- **Why it matters:** Measures SEO effectiveness and programmatic SEO success

#### Brand Search Traffic
- **Definition:** Visitors searching for "romarketcap" or direct brand searches
- **Period:** 7-day rolling window
- **Calculation:** Current week vs previous week
- **Why it matters:** Measures brand awareness and word-of-mouth growth

---

### Conversion Metrics

**Source:** Database (PostgreSQL via Prisma)

#### Claimed Companies
- **Definition:** Total number of companies claimed by founders/employees
- **Calculation:**
  - Total: All `CompanyClaim` records
  - This week: Claims created in last 7 days
  - Last week: Claims created 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures founder engagement and data quality improvement

#### Newsletter Subscribers
- **Definition:** Total and active newsletter subscribers
- **Calculation:**
  - Total: All `NewsletterSubscriber` records
  - Active: Subscribers with `status = 'ACTIVE'`
  - This week: Subscribers created in last 7 days
  - Last week: Subscribers created 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures audience growth and email distribution reach

#### Premium Users
- **Definition:** Users with active premium subscriptions
- **Calculation:**
  - Total: Users with `isPremium = true`
  - This week: Users who became premium in last 7 days (`premiumSince >= weekAgo`)
  - Last week: Users who became premium 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures revenue growth and product-market fit

#### API Keys
- **Definition:** Total and active API keys
- **Calculation:**
  - Total: All `ApiKey` records
  - Active: API keys with `active = true`
  - This week: API keys created in last 7 days
  - Last week: API keys created 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures developer adoption and B2B revenue potential

#### Partner Leads
- **Definition:** Total and new partner/investor leads
- **Calculation:**
  - Total: All `PartnerLead` records
  - New: Leads with `status = 'NEW'`
  - This week: Leads created in last 7 days
  - Last week: Leads created 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures B2B interest and partnership opportunities

#### Watchlists
- **Definition:** Total watchlist items (user-company pairs)
- **Calculation:**
  - Total: All `WatchlistItem` records
  - This week: Items created in last 7 days
  - Last week: Items created 7-14 days ago
  - Delta: This week - Last week
- **Why it matters:** Measures user engagement and retention

---

## Event Tracking Consistency

### Required Events (Plausible)

All conversion events must be tracked via `src/lib/analytics.ts`:

#### Newsletter
- ✅ `NewsletterView` - Newsletter page viewed
- ✅ `NewsletterSubscribe` - User submits subscription form
- ✅ `NewsletterConfirm` - User confirms subscription

**Tracking Locations:**
- `app/newsletter/page.tsx` - View tracking
- `app/api/newsletter/subscribe/route.ts` - Subscribe tracking (client-side)
- `app/newsletter/confirm/page.tsx` - Confirm tracking

#### Premium Conversion
- ✅ `PricingView` - Pricing page viewed
- ✅ `PricingCTA` - Upgrade CTA clicked
- ✅ `PremiumClick` - Premium panel unlock clicked
- ✅ `CheckoutStart` - Stripe checkout initiated
- ✅ `CheckoutSuccess` - Stripe checkout completed

**Tracking Locations:**
- `app/pricing/page.tsx` - View and CTA tracking
- `components/company/PremiumPanel.tsx` - Premium click tracking
- `app/api/billing/checkout/route.ts` - Checkout start (client-side)
- `app/api/stripe/webhook/route.ts` - Checkout success (server-side via webhook)

#### Company Claims
- ✅ `CompanyView` - Company page viewed
- ✅ Claim submission - Tracked via `CompanyView` with props

**Tracking Locations:**
- `components/analytics/TrackCompanyView.tsx` - Company view tracking
- `app/api/company/[cui]/claim/route.ts` - Claim submission (client-side)

#### API & Partner Leads
- ✅ `PartnerLeadSubmit` - Partner lead form submitted

**Tracking Locations:**
- `app/api/partners/lead/route.ts` - Lead submission (client-side)

#### User Engagement
- ✅ `WatchlistAdd` - Company added to watchlist
- ✅ `WatchlistView` - Watchlist page viewed
- ✅ `DashboardView` - Dashboard page viewed
- ✅ `AlertRuleCreate` - Alert rule created
- ✅ `ComparisonSave` - Comparison saved
- ✅ `ExportDownload` - Export downloaded

**Tracking Locations:**
- `app/api/watchlist/toggle/route.ts` - Watchlist add (client-side)
- `app/watchlist/page.tsx` - Watchlist view tracking
- `components/analytics/TrackDashboardView.tsx` - Dashboard view tracking
- `app/api/dashboard/alerts/rules/route.ts` - Alert rule create (client-side)
- `app/api/dashboard/comparisons/route.ts` - Comparison save (client-side)
- `app/api/dashboard/exports/route.ts` - Export download (client-side)

---

## Dashboard Access

**URL:** `/admin/marketing`

**Requirements:**
- Admin session required
- Plausible traffic metrics require `PLAUSIBLE_API_KEY` env var
- Database metrics always available

**Refresh Rate:** Auto-refreshes every 60 seconds

---

## API Endpoint

**GET** `/api/admin/marketing/metrics`

**Response:**
```json
{
  "ok": true,
  "metrics": {
    "organicTraffic": {
      "current": 1234,
      "previous": 1000,
      "delta": 234,
      "deltaPercent": 23.4
    },
    "brandSearchTraffic": {
      "current": 56,
      "previous": 45,
      "delta": 11,
      "deltaPercent": 24.4
    },
    "claimedCompanies": {
      "total": 150,
      "thisWeek": 12,
      "lastWeek": 8,
      "delta": 4,
      "deltaPercent": 50.0
    },
    // ... other metrics
  }
}
```

---

## Verification Checklist

### Event Tracking
- [ ] All newsletter CTAs tracked (`NewsletterSubscribe`)
- [ ] All pricing CTAs tracked (`PricingCTA`, `CheckoutStart`)
- [ ] All premium panel clicks tracked (`PremiumClick`)
- [ ] All claim submissions tracked (via `CompanyView` props)
- [ ] All partner lead submissions tracked (`PartnerLeadSubmit`)
- [ ] All watchlist additions tracked (`WatchlistAdd`)

### Dashboard
- [ ] `/admin/marketing` page loads
- [ ] All metrics display correctly
- [ ] WoW deltas calculate correctly
- [ ] Plausible stats load (if API key configured)
- [ ] Database metrics always available

### Data Consistency
- [ ] Database counts match admin pages
- [ ] Weekly deltas are accurate
- [ ] Monthly deltas are accurate (MoM comparison)

---

## Future Enhancements

1. **MoM Comparison:** Add monthly comparison view
2. **Conversion Funnels:** Track conversion rates (e.g., view → subscribe → premium)
3. **Attribution:** Track source of conversions (organic, referral, direct)
4. **Cohort Analysis:** Track retention by signup week/month
5. **A/B Testing:** Track variant performance for CTAs

---

## Notes

- **Plausible API:** Requires `PLAUSIBLE_API_KEY` env var. If not set, traffic metrics show 0.
- **Database Metrics:** Always available, calculated in real-time from database.
- **Caching:** Metrics endpoint is not cached (`cache: "no-store"`).
- **Performance:** Database queries are optimized with indexes on `createdAt` fields.

---

**See Also:**
- `src/lib/marketing/metrics.ts` - Metric calculation logic
- `src/lib/marketing/plausible.ts` - Plausible API integration
- `app/(admin)/admin/marketing/page.tsx` - Dashboard UI
- `src/lib/analytics.ts` - Event tracking definitions

