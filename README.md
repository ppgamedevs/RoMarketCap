# RoMarketCap.ro

Romania-first market intelligence for private Romanian companies.

Estimates. Informational only. Not financial advice.

## Local development

### Prerequisites

- Node.js (LTS)
- Postgres (recommended: Neon or Supabase)
- Vercel KV (for rate limiting in production)
- GitHub OAuth app (for admin auth)
- Stripe account (for subscriptions)

### 1) Configure environment

- Create `.env` and set:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap, robots, metadataBase)
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL` (recommended locally)
  - `GITHUB_ID`, `GITHUB_SECRET`
  - `ADMIN_EMAILS` (comma-separated allowlist)
  - `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Vercel KV)
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_MONTHLY`

### 2) Generate Prisma client

```bash
npm run db:generate
```

### 3) Apply migrations

If you have a database available locally or via Neon/Supabase:

```bash
npm run db:migrate:dev
```

> Note: This repo also includes an initial SQL migration under `prisma/migrations/` generated from the schema.

### 4) Seed data

```bash
npm run db:seed
```

### 5) Run the app

```bash
npm run dev
```

### Useful routes

- `GET /company`: company directory (RO)
- `GET /company/[slug]`: company detail (RO)
- `GET /en/company`: company directory (EN)
- `GET /en/company/[slug]`: company detail (EN)
- `GET /billing`: billing page (requires login)
- `GET /admin`: admin (requires login + allowlist)
- `GET /sitemap.xml`: sitemap index

## Scripts

- `npm run db:generate`: generate Prisma client
- `npm run db:migrate:dev`: run migrations in dev
- `npm run db:migrate:deploy`: apply migrations in production
- `npm run db:studio`: open Prisma Studio
- `npm run db:seed`: seed sample companies + metrics + score + prediction
- `npm run ingest:source0`: ingest companies from `data/seeds/companies.seed.json` (idempotent)
- `npm run score:all`: recompute romc_v0 scores for all companies

## Manual QA checklist (Prompt 11)

- Language toggle:
  - Switch RO/EN in header, confirm cookie persists across reloads.
  - Optional share: open `/lang?lang=en&next=/company` and confirm EN is active.
- Home and company pages:
  - Home shows RO or EN copy based on cookie.
  - Company page title/description change with language selection.
- Premium gating:
  - Premium section shows paywall if not premium, and shows payload if premium.
- Claim and submit:
  - Claim and submit require login.
  - Submit creates a pending submission.
- Moderation:
  - `/admin/moderation` lists pending claims/submissions.
  - Approve applies allowlisted fields and recomputes ROMC v1.
  - Reject does not change company fields.
- Sitemaps:
  - `/sitemap.xml` is a sitemap index.
  - `/sitemaps/static.xml` and `/sitemaps/companies-1.xml` work.

## Cron jobs (Prompt 13)

### Env vars

- `CRON_SECRET`: shared secret for cron calls. Send it in the request header `x-cron-secret`.

### Recommended Vercel Cron schedules

- Daily (03:00 Europe/Bucharest):
  - `GET /api/cron/recalculate?scope=recent&limit=500`
- Weekly (off-peak):
  - `GET /api/cron/recalculate?scope=all&limit=5000` (run multiple times if needed)

### Local test

- Call with header:
  - `x-cron-secret: <CRON_SECRET>`
- Example:
  - `GET /api/cron/recalculate?scope=recent&limit=50`

### Verification (Prisma Studio)

- `CompanyScoreHistory`: confirm rows are appended (idempotent per day per company for `source="cron"`).
- `CompanyForecast`: confirm 30/90/180 rows exist per company.
- `Company`: confirm `romcAiScore` and `romcAiUpdatedAt` are populated after cron run.

## Launch in 60 Minutes

### Step 1: Environment Setup (10 min)

Set all required environment variables in Vercel:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., `https://romarketcap.ro`)
- `NEXTAUTH_SECRET` - Random secret (generate with `openssl rand -base64 32`)
- `GITHUB_ID`, `GITHUB_SECRET` - GitHub OAuth app credentials
- `ADMIN_EMAILS` - Comma-separated admin email allowlist
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` - Vercel KV credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY` - Stripe credentials
- `RESEND_API_KEY`, `EMAIL_FROM` - Email service credentials
- `CRON_SECRET` - Random secret for cron route protection

**Optional:**
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` - Analytics domain
- `NEXT_PUBLIC_LAUNCH_OFFER_TEXT` - Launch offer banner text
- `EMAIL_ADMIN` - Admin notification email
- `NEXT_PUBLIC_PLACEMENTS_JSON` - Sponsor placements JSON
- `ROMC_SUPPORT_EMAIL` - Support email (defaults to EMAIL_FROM)
- `GOOGLE_SITE_VERIFICATION` - Google Search Console verification
- `BING_SITE_VERIFICATION` - Bing Webmaster verification
- `DEMO_MODE` - Set to `1` to enable demo mode (shows demo banner, includes demo companies)
- `LAUNCH_MODE` - Set to `1` to enforce strict production behavior (disables demo mode, blocks demo operations, ensures canonical enforcement)

### Step 2: Database Setup (5 min)

1. Run migrations: `npx prisma migrate deploy`
2. Verify connection: Check `/api/health` shows `dbOk: true`

### Step 3: Stripe Configuration (10 min)

1. Create Stripe product and price
2. Set `STRIPE_PRICE_ID_MONTHLY` to your price ID
3. Configure webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Set `STRIPE_WEBHOOK_SECRET` from webhook configuration
5. Test webhook: Trigger a test subscription

### Step 4: Launch Checklist (15 min)

1. Go to `/admin/launch-checklist` (requires admin login)
2. Review all checklist items
3. Fix any FAIL items
4. Address WARN items as needed
5. Run test actions:
   - "Run Recalculate Dry Run"
   - "Run Enrichment Dry Run"
   - "Send Test Email"

### Step 5: Feature Flags (5 min)

1. Go to `/admin/flags`
2. Verify recommended flags are enabled:
   - `PREMIUM_PAYWALLS`: Enabled
   - `FORECASTS`: Enabled
   - `ENRICHMENT`: Enabled (if configured)
   - `ALERTS`: Enabled
   - `API_ACCESS`: Enabled
   - `NEWSLETTER_SENDS`: Enabled (if configured)
   - All cron flags: Enabled

### Step 6: Vercel Cron Setup (10 min)

Add cron jobs in Vercel dashboard:

- `/api/cron/recalculate?scope=recent&limit=500` - Daily at 02:15 Europe/Bucharest
- `/api/cron/enrich?limit=100` - Every 6 hours
- `/api/cron/weekly-digest` - Weekly Monday 08:00 Europe/Bucharest
- `/api/cron/watchlist-alerts` - Hourly
- `/api/cron/billing-reconcile?limit=100` - Daily at 03:00 Europe/Bucharest
- `/api/cron/snapshot` - Daily at 04:00 Europe/Bucharest

All cron routes require header: `x-cron-secret: <CRON_SECRET>`

### Step 7: Final Verification (5 min)

1. Check `/api/health` - All systems green
2. Check `/sitemap.xml` - Sitemap index loads
3. Check `/robots.txt` - Points to sitemap
4. Test premium flow: `/pricing` → `/billing` → Subscribe
5. Test admin: `/admin` → Verify access

**You're ready to launch!** 🚀

## Launch checklist (Prompt 14)

### Env vars

**Required:**
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_ID`, `GITHUB_SECRET`
- `ADMIN_EMAILS`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `CRON_SECRET`

**Optional:**
- `EMAIL_ADMIN` - Admin notification email
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (and `NEXT_PUBLIC_PLAUSIBLE_SRC`)
- `NEXT_PUBLIC_LAUNCH_OFFER_TEXT`
- `NEXT_PUBLIC_PLACEMENTS_JSON` - Sponsor placements JSON
- `ROMC_SUPPORT_EMAIL` - Support email (defaults to EMAIL_FROM)
- `GOOGLE_SITE_VERIFICATION` (meta tag)
- `BING_SITE_VERIFICATION` (meta tag)
- `GOOGLE_SITE_VERIFICATION_FILE` (HTML file body served at `/google-site-verification`)
- `DEMO_MODE` - Set to `1` to enable demo mode
- `SLACK_WEBHOOK_URL` - For critical cron failures

### Stripe

- Configure webhook to `/api/stripe/webhook`
- Confirm `User.isPremium` toggles when subscription is active

### Resend

- Verify you can send a transactional email (claim submit, submission submit)

### Cron

- Add Vercel Cron hitting `/api/cron/recalculate?scope=recent&limit=200`
- Use header `x-cron-secret: <CRON_SECRET>`

### SEO

- Check `/sitemap.xml` and `/sitemaps/static.xml` include:
  - `/pricing`, `/terms`, `/privacy`, `/disclaimer`, `/methodology`
  - `/companies`, `/industries`, `/counties`, `/movers`

## Data Bootstrapping Pipeline (Prompt 28)

Import initial company datasets via CSV:

1. Go to `/admin/import-jobs`
2. Upload a CSV file with columns: `name`, `cui`, `domain`, `county`, `city`, `address`, `industry`, `website`, etc.
3. The import processes rows in batches with validation and deduplication
4. Check job status and errors in the admin UI

The import system:
- Streams large CSVs (>200k rows) without loading into memory
- Validates rows with Zod schemas
- Deduplicates by CUI (preferred) or domain
- Records provenance (source, import date, row hash)
- Supports resume on failure (re-run from scratch)

See `src/lib/import/csvStream.ts` for CSV schema details.

## Freshness Indicators (Prompt 28)

Company pages and `/status` now show:
- **Last scored** - When ROMC score was last computed
- **Last enriched** - When company data was last enriched
- **Data confidence** - Confidence score (0-100)
- **Integrity score** - Company integrity score (0-100)
- **Freshness badge** - Fresh (<7 days), Stale (7-30), Old (>30)

The `/status` page shows aggregate freshness:
- % companies scored within 7/30 days
- % companies enriched within 30 days

## Revenue Day-1 Switch (Prompt 28)

Verify paywalls and placements are ready:

1. Go to `/admin/revenue-check`
2. Review checklist (Stripe config, price ID, webhook secret, billing cron)
3. Toggle paywalls/placements on/off
4. Send test checkout link to verify purchase flow

## Launch Mode (Prompt 28)

Set `LAUNCH_MODE=1` to enforce strict production behavior:
- Forces `DEMO_MODE=0` (hides demo banner, excludes demo companies)
- Blocks demo seed/clear operations
- Ensures canonical slug redirects
- Ensures sitemaps exclude demo companies
- Ensures robots.txt is indexable (unless `READ_ONLY_MODE` is set)

## Post-launch weekly ops

- Review `/admin/moderation` queue daily
- Monitor cron responses and errors
- Run CSV import as needed from `/admin/import-jobs`
- Check `/admin/revenue-check` before enabling paywalls
- Spot check top pages: `/companies`, `/industries/*`, `/counties/*`, `/movers`

## Vercel Cron recommended schedules (production)

**Recommended: Use the cron orchestrator** (see `docs/CRON_SCHEDULE.md`)

Add a single cron job:
- `/api/cron/orchestrate` - **hourly** (`0 * * * *`)

The orchestrator runs all cron jobs in sequence with budget controls and feature flag checks:
- Recalculate (limit: 200)
- Enrich (limit: 50)
- Watchlist Alerts (limit: 200)
- Billing Reconcile (limit: 500)
- Snapshot (once per day)
- Weekly Digest (once per week)

**Alternative: Individual cron routes** (if you prefer manual control)

All cron routes require header `x-cron-secret: CRON_SECRET`.

- `/api/cron/recalculate?scope=recent&limit=500`
  - **daily** at 02:15 Europe/Bucharest
- `/api/cron/enrich?limit=100`
  - **every 6 hours**
- `/api/cron/weekly-digest`
  - **weekly** Monday 08:00 Europe/Bucharest
- `/api/cron/watchlist-alerts`
  - **hourly**
- `/api/cron/billing-reconcile?limit=100`
  - **daily** at 03:00 Europe/Bucharest (reconcile premium entitlements from Stripe)
- `/api/cron/snapshot`
  - **daily** at 04:00 Europe/Bucharest

Notes:
- Cron routes are idempotent and store cursors / last-run timestamps in KV (`cron:last:*`, `cron:cursor:*`).
- Prefer smaller limits and higher frequency over huge batches to reduce timeouts.
- All cron routes use distributed locks to prevent concurrent execution (returns 202 "locked" if already running).
- The orchestrator respects feature flags and skips disabled jobs.

## Rate Limits (Prompt 23 V2)

### Standard Endpoints
- Anonymous: 20 requests/minute
- Authenticated: 120 requests/minute
- Premium: 240 requests/minute

### Expensive Endpoints
The following endpoints use stricter rate limits:
- `/api/company/[cui]/premium`
- `/api/company/[cui]/forecast`
- `/api/company/[cui]/report`
- `/api/search`

**Expensive endpoint limits:**
- Anonymous: 5 requests/minute
- Authenticated: 30 requests/minute
- Premium: 60 requests/minute

All rate-limited responses include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` headers.

## User Intelligence Dashboard + Retention Engine (Prompt 20)

### Dashboard
- `/dashboard` (auth-required): Shows watchlist summary, recent alerts, account status, quick actions
- `/dashboard/alerts`: Manage custom alert rules
- `/dashboard/comparisons`: Save and manage company comparisons (2-5 CUIs)
- `/dashboard/exports`: Export watchlist/comparisons as CSV/JSON (Premium only)

### Alert Rules
- Users can create custom alert rules for ROMC AI, Valuation, or Risk metrics
- Rules can scope to Company, Industry, or County
- Operators: GT, LT, PCT_CHANGE (PCT_CHANGE requires historical data, simplified in v1)
- Cron `/api/cron/watchlist-alerts` evaluates both legacy score change alerts and custom rules

### Company Change Log
- Automatically logs: score changes, forecast changes, enrichment updates, claim/submission approvals
- Shown on company pages as "Recent changes" section
- Persisted in `CompanyChangeLog` table

### Saved Comparisons
- Users can save comparison sets (2-5 CUIs) with a name
- Accessible from dashboard and `/compare` page
- Future: alerts on ranking changes (not implemented in v1)

### Export Engine
- Premium-only CSV/JSON exports for watchlist and comparisons
- Rate-limited (premium tier)
- Safe headers (Content-Disposition, Content-Type)

## Manual test checklist (Prompt 17)

### Cookie consent

- First visit: banner shows.
- Decline: banner hides, Plausible script is not injected.
- Accept: banner hides, page reloads, Plausible script is injected, events fire.

### Placements

- Set `NEXT_PUBLIC_PLACEMENTS_JSON` with at least one item and confirm it renders on:
  - `/companies`
  - `/company/[slug]`
  - `/movers`
  - `/pricing`
- Click link has `rel="nofollow noopener noreferrer sponsored"`.

### Partners leads

- Submit `/partners` form:
  - Creates `PartnerLead` row.
  - Sends admin email to `EMAIL_ADMIN` (or first in `ADMIN_EMAILS`) and confirmation email to user.
- Honeypot blocks (400), cooldown blocks repeats (429).
- Admin can view `/admin/leads` and change status.

### Admin audit

- Approve/reject claim/submission, create/toggle API key, import CSV, enrich, recompute.
- Verify `/admin/audit` shows entries.

### Company trust

- Company page shows last scored + last enriched.
- "Report an issue" mailto uses `ROMC_SUPPORT_EMAIL` or derives from `EMAIL_FROM`.

## Billing Reliability + Account Settings (Prompt 22)

### Billing Reconciliation
- Cron route `/api/cron/billing-reconcile` reconciles premium entitlements from Stripe
- Runs daily to catch missed webhooks
- Webhook idempotency: events tracked in KV with 30-day TTL
- Health endpoint includes billing status and last reconcile time

### Account Settings
- `/settings` (auth-required, noindex): Account info, notifications, GDPR export, delete account
- GDPR export: `/api/settings/export` returns JSON with all user data (no secrets)
- Delete account: `/api/settings/delete` with cooldown (24h), anonymizes data for audit integrity
- Notifications: Toggle watchlist alerts, weekly digest, partner offers

### PCT_CHANGE Alert Operator
- Fully implemented using `CompanyScoreHistory` for baseline lookup
- Supports lookback period (1-90 days, default 7)
- Works for ROMC_AI, VALUATION, and RISK metrics
- Percent change formula: `(current - baseline) / max(1, abs(baseline)) * 100`

### Admin Billing Audit
- `/admin/billing`: Shows billing-related audit events and reconciliation status
- Displays last reconcile run, stats, and recent webhook/reconcile events

## Manual QA checklist (Prompt 18 launch)

- `/admin/launch` shows all required env checks green in production.
- `/api/health` returns `{ ok: true }`, `dbOk: true`, `kvOk: true` and does not leak secrets.
- `/status` loads and is cached (60s) while `/api/health` is `no-store`.
- Search Console: verify meta tag is present when `GOOGLE_SITE_VERIFICATION` is set.
- Robots: `/lang`, `/login`, `/billing`, `/watchlist`, `/admin/*` are `noindex`.
- Cron: Vercel Cron jobs configured with `x-cron-secret` header and endpoints succeed.
- Stripe: webhook endpoint set and subscription upgrades flip premium access.
- Resend: emails deliver (newsletter confirm, partners lead, moderation events).
