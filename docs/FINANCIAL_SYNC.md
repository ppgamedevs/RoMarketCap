# ANAF Financial Sync (PROMPT 58)

**Status:** Implemented ✅

## Overview

The ANAF Financial Sync system automatically enriches Company financial metrics from official public financial statements services. It operates in **SAFE MODE** with controlled batch size, strict rate limits, idempotent writes, full audit trail, dry-run support, and immediate kill-switch via feature flags.

## Purpose

- Fetch public annual financial indicators for companies by CUI
- Sync runs in safe mode: controlled batch size, strict rate limits, idempotent writes
- Persist results into Company denormalized fields: `revenueLatest`, `profitLatest`, `employees`
- Store provenance and `lastFinancialSyncAt`
- Provide admin UI and endpoints for manual sync and monitoring

## Features

### A) Data Model

**Company fields added:**
- `lastFinancialSyncAt`: DateTime? - Last time financials were synced
- `financialSyncVersion`: Int (default: 1) - Version of sync logic used
- `financialSource`: Json? - Metadata: {year, source, fetchedAt, confidence}

**CompanyFinancialSnapshot extended:**
- `employees`: Int? - Employee count from financial statements
- `checksum`: String? - SHA256 hash for idempotency
- `fetchedAt`: DateTime - When data was fetched from source

**New model: FinancialSyncJob**
- Tracks sync runs: mode (DRY_RUN/LIVE), limit, cursor, okCount, failCount, status

### B) Connector Library

**Files:**
- `src/lib/connectors/anaf/types.ts` - Type definitions
- `src/lib/connectors/anaf/wsClient.ts` - ANAF web service client with retries, timeouts, size limits
- `src/lib/connectors/anaf/parse.ts` - Parse ANAF response into normalized format
- `src/lib/connectors/anaf/syncFinancials.ts` - Main sync logic with idempotency
- `src/lib/connectors/anaf/financialDeadletter.ts` - Dead-letter queue for failures

**Safety features:**
- Rate limiting: 1 request per 2 seconds (very conservative)
- Timeout: 10 seconds
- Max response size: 1MB
- Retries: 3 attempts with exponential backoff
- Idempotency: Checksum-based to prevent duplicate writes

### C) Feature Flags

- `FINANCIAL_SYNC_ENABLED` (default: disabled, fail-closed)
- `FINANCIAL_SYNC_CRON_ENABLED` (default: disabled, fail-closed)
- `FINANCIAL_SYNC_ADMIN_ENABLED` (default: enabled for admins)

### D) API Routes

**Admin endpoints:**
- `POST /api/admin/financial/sync` - Sync single company by CUI
  - Body: `{ cui: string, dryRun?: boolean, years?: number[] }`
- `POST /api/admin/financial/sync-batch` - Batch sync
  - Body: `{ limit?: number, onlyMissing?: boolean, maxAgeDays?: number, dryRun?: boolean }`
- `GET /api/admin/financial/jobs` - Get recent sync jobs
- `GET /api/admin/financial/deadletter` - Get dead-letter entries

**Cron endpoint:**
- `POST /api/cron/financial-sync?limit=10&dry=1`
  - Protected by `CRON_SECRET` header
  - Integrated into cron orchestrator

### E) Admin UI

**Page:** `/admin/financial`

**Features:**
- Single CUI sync form (dry-run toggle, years input)
- Batch sync controls (limit, onlyMissing, maxAgeDays, dry-run)
- Recent sync jobs table (from FinancialSyncJob)
- Dead-letter queue viewer (count + last 20 items)

### F) Public UI

**Company page:**
- Added `FinancialsCard` component showing:
  - Latest year financial data (revenue, profit, employees)
  - Source: "Public financial statements (ANAF)"
  - Last sync date
  - Graceful degradation if no data

### G) Safety Features

1. **Rate Limiting**: 1 request per 2 seconds (very conservative)
2. **Caching**: Checksum-based idempotency prevents duplicate writes
3. **Dead-Letter Queue**: Failed syncs stored for retry
4. **Feature Flags**: Can be disabled instantly
5. **Read-Only Mode**: Respects `READ_ONLY_MODE` flag
6. **Distributed Locks**: Prevents concurrent batch syncs
7. **Dry-Run Support**: Test syncs without DB writes

## Configuration

### Environment Variables

```env
# ANAF Financial Statements Endpoint (PROMPT 59)
# NOTE: This is currently a PLACEHOLDER endpoint (VAT service).
# Update when the official financial statements endpoint is available.
ANAF_FINANCIALS_ENDPOINT=https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva

# Legacy support (deprecated, use ANAF_FINANCIALS_ENDPOINT)
ANAF_WS_BILANT_URL=https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva

# Cron secret (required for cron routes)
CRON_SECRET=your-secret-here
```

**⚠️ IMPORTANT - Endpoint Configuration (PROMPT 59):**

- **Current endpoint is a PLACEHOLDER**: The default endpoint points to the ANAF VAT service, not the financial statements service.
- **Expected endpoint**: The official "Serviciu web pentru obtinerea informatiilor publice din situatiile financiare" endpoint.
- **How to override**: Set `ANAF_FINANCIALS_ENDPOINT` environment variable when the official endpoint is available.
- **Safety**: The system logs a warning when using the placeholder endpoint.
- **Rate limiting**: Conservative (1 request per 2 seconds) to remain polite.
- **Best-effort**: This is a best-effort sync until the official endpoint is confirmed and configured.

### Feature Flags

Enable/disable via `/admin/flags`:
- `FINANCIAL_SYNC_ENABLED`: Enable/disable feature
- `FINANCIAL_SYNC_CRON_ENABLED`: Enable/disable automated cron
- `FINANCIAL_SYNC_ADMIN_ENABLED`: Enable/disable admin endpoints

## Usage

### Manual Sync (Admin)

```bash
# Single company
POST /api/admin/financial/sync
Body: { "cui": "RO12345678", "dryRun": false }

# Batch sync
POST /api/admin/financial/sync-batch
Body: { "limit": 10, "onlyMissing": true, "dryRun": false }
```

### Automated Cron

Set up in Vercel Cron or similar:
```
POST /api/cron/financial-sync?limit=10
Headers: x-cron-secret: <CRON_SECRET>
```

Recommended schedule: **Daily at 04:00** (after other cron jobs)

## Data Flow

1. **Fetch**: Call ANAF web service with CUI
2. **Parse**: Normalize response into structured data
3. **Validate**: Clamp absurd values, compute confidence
4. **Checksum**: Generate stable hash for idempotency
5. **Upsert**: Update `CompanyFinancialSnapshot` per year
6. **Denormalize**: Update Company `revenueLatest`, `profitLatest`, `employees`
7. **Log**: Create `CompanyChangeLog` entry with before/after summary

## Limitations

### ANAF Web Service Format

The actual ANAF financial statements API response format may vary. The parser handles:
- Single year data in root object
- Array of years
- Nested structures with "situatii_financiare" or similar
- Missing fields gracefully
- Multiple field name variations (cifra_afaceri, venituri, CA, etc.)

**Field name variations handled:**
- Revenue: `cifra_afaceri`, `venituri`, `CA`, `cifraAfaceri`, `venituriTotal`, `revenue`
- Profit: `profit`, `pierdere`, `profitNet`, `pierdereNeta`, `netIncome`
- Employees: `angajati`, `numar_angajati`, `numAngajati`, `employees`, `employeeCount`

**Confidence scoring:**
- Revenue present: +40
- Profit present: +30
- Employees present: +30
- Max: 100

## Monitoring

- **Admin UI**: `/admin/financial` shows jobs and dead-letter queue
- **Company Page**: Shows financials card with sync status
- **KV Stats**: `cron:last:financial-sync`, `cron:stats:financial-sync`

## Next Steps

1. **Run Migration**: `npm run db:migrate:dev`
2. **Enable Feature Flags**: Set flags in `/admin/flags`
3. **Set Up Cron**: Add to Vercel Cron or similar
4. **Monitor**: Check admin UI and company pages

## Legal Compliance

- Uses public ANAF web service (read-only)
- No scraping of protected systems
- Conservative rate limiting
- Aggressive idempotency to minimize API calls
- Instantly disableable via feature flags

