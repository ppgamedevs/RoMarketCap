# Feature Flags Reference

All feature flags are stored in Vercel KV and cached for 30 seconds. Admin can toggle flags at `/admin/flags`.

## Flag List

### PREMIUM_PAYWALLS
- **Default:** Enabled (fail-open)
- **Description:** Controls premium subscription paywalls
- **When to disable:** Stripe issues, billing problems
- **Impact:** Premium features become free

### FORECASTS
- **Default:** Enabled (fail-open)
- **Description:** Enables forecast API and UI
- **When to disable:** Forecast computation issues
- **Impact:** Forecast endpoints return 503

### ENRICHMENT
- **Default:** Disabled (fail-closed)
- **Description:** Controls company data enrichment
- **When to disable:** External API issues, rate limits
- **Impact:** Enrichment cron stops, no new enrichment data

### ALERTS
- **Default:** Enabled (fail-open)
- **Description:** Controls user alert system
- **When to disable:** Email sending issues
- **Impact:** Watchlist alerts cron stops

### PLACEMENTS
- **Default:** Enabled (fail-open)
- **Description:** Controls sponsor placements
- **When to disable:** Ad issues, compliance
- **Impact:** Placement components return empty

### API_ACCESS
- **Default:** Enabled (fail-open)
- **Description:** Controls API endpoint access
- **When to disable:** API abuse, rate limit issues
- **Impact:** All API endpoints return 503

### NEWSLETTER_SENDS
- **Default:** Disabled (fail-closed)
- **Description:** Controls newsletter email sends
- **When to disable:** Email deliverability issues
- **Impact:** Weekly digest cron stops sending

### CRON_RECALCULATE
- **Default:** Disabled (fail-closed)
- **Description:** Controls score recalculation cron
- **When to disable:** Scoring issues, database problems
- **Impact:** Recalculate cron returns 503

### CRON_ENRICH
- **Default:** Disabled (fail-closed)
- **Description:** Controls enrichment cron
- **When to disable:** Enrichment failures
- **Impact:** Enrich cron returns 503

### CRON_WEEKLY_DIGEST
- **Default:** Enabled (fail-open)
- **Description:** Controls weekly digest cron
- **When to disable:** Email issues
- **Impact:** Weekly digest cron returns 503

### CRON_WATCHLIST_ALERTS
- **Default:** Enabled (fail-open)
- **Description:** Controls watchlist alerts cron
- **When to disable:** Alert issues
- **Impact:** Watchlist alerts cron returns 503

### CRON_BILLING_RECONCILE
- **Default:** Disabled (fail-closed)
- **Description:** Controls billing reconciliation cron
- **When to disable:** Billing issues
- **Impact:** Billing reconcile cron returns 503

### CRON_SNAPSHOT
- **Default:** Enabled (fail-open)
- **Description:** Controls daily snapshot cron
- **When to disable:** Snapshot issues
- **Impact:** Snapshot cron returns 503

### READ_ONLY_MODE
- **Default:** Disabled (fail-open)
- **Description:** Enables read-only mode (blocks all mutations)
- **When to enable:** Maintenance, data migration, critical bugs
- **Impact:** All mutation routes return 503 (admin bypass available)

## Safe Defaults for Launch

**Recommended flag states for production launch:**
- `PREMIUM_PAYWALLS`: Enabled
- `FORECASTS`: Enabled
- `ENRICHMENT`: Enabled (if external APIs are stable)
- `ALERTS`: Enabled
- `PLACEMENTS`: Enabled (if ads configured)
- `API_ACCESS`: Enabled
- `NEWSLETTER_SENDS`: Enabled (if email configured)
- `CRON_RECALCULATE`: Enabled
- `CRON_ENRICH`: Enabled (if enrichment configured)
- `CRON_WEEKLY_DIGEST`: Enabled
- `CRON_WATCHLIST_ALERTS`: Enabled
- `CRON_BILLING_RECONCILE`: Enabled
- `CRON_SNAPSHOT`: Enabled
- `READ_ONLY_MODE`: Disabled

## Kill-Switch Procedures

### Emergency: Disable All Monetization
1. Go to `/admin/flags`
2. Disable: `PREMIUM_PAYWALLS`, `PLACEMENTS`, `API_ACCESS`, `NEWSLETTER_SENDS`
3. Changes take effect within 30 seconds

### Emergency: Freeze System
1. Go to `/admin/flags`
2. Enable: `READ_ONLY_MODE`
3. Disable all cron flags
4. System becomes read-only, no background jobs run

### Emergency: Disable Risky Features
1. Go to `/admin/flags`
2. Disable: `ENRICHMENT`, `CRON_ENRICH`, `CRON_BILLING_RECONCILE`
3. These are fail-closed by default, but verify they're disabled

## Flag Cache

Flags are cached for 30 seconds. To force immediate refresh:
- Clear KV cache: `DEL flag:version:*` (via KV CLI)
- Or wait 30 seconds for natural expiration

## Audit Logging

All flag toggles are logged to `AdminAuditLog` with:
- Action: `FLAG_TOGGLE`
- EntityType: `FEATURE_FLAG`
- EntityId: flag name
- Metadata: flag, value, previousValue

