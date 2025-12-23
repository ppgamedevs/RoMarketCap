# Vercel Cron Schedule

This document describes the recommended Vercel cron configuration for RoMarketCap.ro.

## Overview

We use a **cron orchestrator** pattern to:
- Respect feature flags
- Enforce budget controls (batch limits)
- Track execution in KV
- Prevent concurrent runs with distributed locks
- Provide safe error handling

## Recommended Schedule

Add these entries to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/orchestrate",
      "schedule": "0 * * * *"
    }
  ]
}
```

Or configure in Vercel Dashboard → Settings → Cron Jobs:

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/cron/orchestrate` | `0 * * * *` (hourly) | Main orchestrator that runs all cron jobs in sequence |

## Orchestrator Behavior

The orchestrator (`/api/cron/orchestrate`) runs jobs in this order:

1. **Recalculate** (limit: 200 companies)
   - Updates ROMC scores and forecasts
   - Runs if `CRON_RECALCULATE` flag is enabled

2. **Enrich** (limit: 50 companies)
   - Fetches external data (LinkedIn, SimilarWeb, etc.)
   - Runs if `CRON_ENRICH` flag is enabled

3. **Watchlist Alerts** (limit: 200 alerts)
   - Sends email alerts for watchlist items
   - Runs if `ALERTS` flag is enabled

4. **Billing Reconcile** (limit: 500 subscriptions)
   - Syncs Stripe subscriptions with DB
   - Runs if `CRON_BILLING_RECONCILE` flag is enabled

5. **Snapshot** (once per day only)
   - Creates daily system snapshot
   - Runs if `CRON_SNAPSHOT` flag is enabled
   - Only runs once per UTC day (tracked in KV)

6. **Weekly Digest** (once per week only)
   - Generates and sends weekly newsletter
   - Runs if `NEWSLETTER_SENDS` flag is enabled
   - Only runs once per week (tracked in KV)

7. **Claim Drip** (daily)
   - Sends claim drip emails (day 2 and day 5 after claim submission)
   - Runs daily to check for claims that need follow-up emails
   - No feature flag (always enabled)

## Manual Execution

You can also trigger individual cron jobs manually:

```bash
# With CRON_SECRET header
curl -X POST https://your-domain.com/api/cron/recalculate \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Or use orchestrator
curl -X POST https://your-domain.com/api/cron/orchestrate \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

## Monitoring

Check KV keys for last execution timestamps:
- `cron:last:orchestrate` - Last orchestrator run
- `cron:last:recalculate` - Last recalculate run
- `cron:last:enrich` - Last enrich run
- `cron:last:watchlist-alerts` - Last alerts run
- `cron:last:billing-reconcile` - Last billing run
- `cron:last:snapshot` - Last snapshot run
- `cron:last:weekly-digest` - Last digest run
- `cron:last:claim-drip` - Last claim drip run

Stats are stored in:
- `cron:stats:orchestrate` - JSON with execution stats

## Budget Controls

The orchestrator enforces batch limits to prevent quota exhaustion:
- Recalculate: max 200 companies per run
- Enrich: max 50 companies per run
- Watchlist Alerts: max 200 alerts per run
- Billing Reconcile: max 500 subscriptions per run

## Feature Flags

All cron jobs respect feature flags. If a flag is disabled, the orchestrator skips that job.

## Error Handling

- Each job is wrapped in try/catch
- Errors are sent to Sentry
- Critical failures trigger Slack alerts (if configured)
- Orchestrator continues even if one job fails

## Timeouts

Each job has a maximum runtime:
- Recalculate: 30 minutes
- Enrich: 30 minutes
- Watchlist Alerts: 15 minutes
- Billing Reconcile: 30 minutes
- Snapshot: 10 minutes
- Weekly Digest: 15 minutes

## Testing

Before deploying to production:

1. Test orchestrator manually:
   ```bash
   curl -X POST http://localhost:3000/api/cron/orchestrate \
     -H "x-cron-secret: test-secret"
   ```

2. Verify KV keys are updated:
   ```bash
   # In Vercel KV dashboard or via CLI
   ```

3. Check admin ops page: `/admin/ops`

4. Verify feature flags work (disable a flag, run orchestrator, verify job is skipped)

