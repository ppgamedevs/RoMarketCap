# Runbook: Incident Response

This document provides step-by-step procedures for common operational incidents.

## Billing Degraded

**Symptoms:**
- `/api/health` shows `billing.degraded: true`
- Premium users not getting entitlements
- Stripe webhook failures

**Response:**
1. Check `/admin/ops` for billing stats
2. Review `/admin/billing` for reconciliation errors
3. Manually trigger: `POST /api/cron/billing-reconcile?limit=100`
4. Check Stripe dashboard for webhook delivery failures
5. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe webhook configuration
6. If persistent, disable premium paywalls temporarily: `/admin/flags` → disable `PREMIUM_PAYWALLS`

## Cron Stuck

**Symptoms:**
- Cron last run timestamp is stale (>2x expected interval)
- Lock contention errors in logs
- Health endpoint shows cron as stuck

**Response:**
1. Check `/admin/ops` for cron status
2. Verify lock is not held: Check KV for `lock:cron:*` keys
3. If lock is stale (>1 hour old), manually release:
   ```bash
   # Via KV CLI or admin panel
   DEL lock:cron:recalculate
   ```
4. Re-run cron manually with dry-run first: `/admin/launch-checklist` → "Run Recalculate Dry Run"
5. If persistent, disable cron via feature flag: `/admin/flags` → disable `CRON_RECALCULATE`

## Lock Contention

**Symptoms:**
- Multiple cron runs returning 202 "locked"
- High lock contention count in `/admin/ops`
- Cron jobs not completing

**Response:**
1. Check `/admin/ops` for lock contention metrics
2. Review cron schedules in Vercel (ensure no overlap)
3. Increase cron TTL if jobs legitimately take longer
4. Consider splitting large cron jobs into smaller batches
5. If critical, manually release locks and re-run

## Enrichment Failures

**Symptoms:**
- Enrichment cron failing
- Companies missing enrichment data
- High error rate in enrichment stats

**Response:**
1. Check `/admin/ops` → Enrichment panel
2. Review last enrich timestamp
3. Check external API rate limits (if applicable)
4. Run dry-run: `/admin/launch-checklist` → "Run Enrichment Dry Run"
5. If persistent, disable enrichment: `/admin/flags` → disable `ENRICHMENT`
6. Review enrichment logs for specific failure patterns

## Database Connection Issues

**Symptoms:**
- Health endpoint shows `dbOk: false`
- Prisma query errors
- Timeout errors

**Response:**
1. Check `DATABASE_URL` in Vercel env vars
2. Verify database is accessible (not paused/stopped)
3. Check connection pool limits
4. Review database logs for connection errors
5. If persistent, enable read-only mode: `/admin/flags` → enable `READ_ONLY_MODE`

## KV Cache Issues

**Symptoms:**
- Health endpoint shows `kvOk: false`
- Cache misses
- Rate limiting failures

**Response:**
1. Check `KV_REST_API_URL` and `KV_REST_API_TOKEN` in Vercel env vars
2. Verify Vercel KV is bound to project
3. Check KV usage limits
4. Clear stale cache keys if needed
5. Review KV logs for errors

## Feature Flag Emergency

**Symptoms:**
- Feature causing issues
- Need to disable quickly

**Response:**
1. Go to `/admin/flags`
2. Toggle the problematic feature flag
3. Changes take effect within 30 seconds (cache TTL)
4. For immediate effect, clear KV cache: `DEL flag:version:*`

## Read-Only Mode

**When to enable:**
- Database maintenance
- Data migration
- Critical bug in mutation code

**How to enable:**
1. Go to `/admin/flags`
2. Enable `READ_ONLY_MODE`
3. Banner appears on all pages
4. All mutations blocked (except admin actions)

**How to disable:**
1. Go to `/admin/flags`
2. Disable `READ_ONLY_MODE`
3. System returns to normal operation

## Emergency Rollback

**If data corruption or critical bug:**

1. Enable read-only mode immediately
2. Review `/admin/snapshots` for recent snapshots
3. Identify snapshot before issue
4. Contact database admin for point-in-time recovery
5. Or restore from backup if available

## Contact

For critical issues:
- Check Sentry for error details
- Review audit logs: `/admin/audit`
- Check Slack notifications (if configured)

