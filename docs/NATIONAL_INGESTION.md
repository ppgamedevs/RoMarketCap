# National Ingestion Pipeline (PROMPT 61)

**Status:** ✅ Implemented

## Overview

The National Ingestion Pipeline is an automated system that continuously ingests Romanian companies from multiple public sources (SEAP, EU funds, providers, ANAF verification) to build a comprehensive "All Companies in Romania" index, similar to CoinMarketCap's asset ingestion loop.

## Architecture

### Core Components

1. **Sources** (`src/lib/ingestion/national/sources.ts`)
   - Fetches CUIs from all enabled sources (SEAP, EU funds, providers)
   - Normalizes and deduplicates by CUI
   - Returns CUIs with provenance metadata

2. **Normalize** (`src/lib/ingestion/national/normalize.ts`)
   - CUI normalization and validation
   - Strict CUI format checking

3. **Upsert** (`src/lib/ingestion/national/upsert.ts`)
   - Batch upserts companies with minimal required fields
   - Creates/updates CompanyProvenance records
   - Processes in batches of 50 to avoid timeouts

4. **Checkpoint** (`src/lib/ingestion/national/checkpoint.ts`)
   - KV-based cursor management
   - Last run stats tracking
   - Resumable ingestion support

5. **Run** (`src/lib/ingestion/national/run.ts`)
   - Orchestrates one ingestion batch
   - Creates NationalIngestJob records
   - Handles errors and deadletter

### Database Models

**NationalIngestJob:**
- Tracks ingestion runs: status, mode (DRY_RUN/LIVE), limit, cursor, discovered, upserted, errors
- Status: STARTED, COMPLETED, FAILED, PARTIAL

**NationalIngestError:**
- Records per-error details: cui, sourceType, sourceRef, reason, rawPayload
- Linked to NationalIngestJob

## API Routes

### Cron Route

**POST** `/api/cron/national-ingest`

**Query Parameters:**
- `limit`: Max CUIs to process (default: 500, max: 1000)
- `dry`: Set to "1" for dry run (no DB writes)

**Protection:**
- `CRON_SECRET` header required
- Feature flag: `NATIONAL_INGESTION_CRON_ENABLED`
- Distributed lock: `cron:national-ingest`

**Example:**
```bash
POST /api/cron/national-ingest?limit=500
Headers: x-cron-secret: <CRON_SECRET>
```

### Admin Routes

**GET** `/api/admin/national-ingestion/stats`
- Returns last run, recent jobs, checkpoint stats, error summary

**POST** `/api/admin/national-ingestion/trigger`
- Triggers manual run (dry or live)
- Body: `{ limit: number, dry: boolean }`

**POST** `/api/admin/national-ingestion/reset-cursor`
- Resets ingestion cursor (admin confirm required)

## Admin UI

**Page:** `/admin/national-ingestion`

**Features:**
- View last run status and stats
- View checkpoint (cursor, last run time, discovered/upserted/errors)
- Trigger dry run or live run with configurable limit
- Reset cursor (with confirmation)
- View recent jobs (last 20)
- View error summary (last 7 days)

## Feature Flags

- `NATIONAL_INGESTION_ENABLED`: Enable/disable feature (default: disabled, fail-closed)
- `NATIONAL_INGESTION_CRON_ENABLED`: Enable/disable cron job (default: disabled, fail-closed)
- `NATIONAL_INGESTION_ADMIN_ENABLED`: Enable/disable admin UI (default: enabled)

## Health Indicators

The `/api/health` endpoint includes:

```json
{
  "nationalIngest": {
    "nationalIngestLastRun": "2024-01-01T00:00:00Z",
    "nationalIngestDegraded": false,
    "discoveredLastRun": 100,
    "upsertedLastRun": 50,
    "errorCountLastRun": 0,
    "lastJobStatus": "COMPLETED"
  }
}
```

## Cron Schedule

Recommended schedule in `vercel.json`:

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

The orchestrator runs national ingestion hourly (limit: 500) if `NATIONAL_INGESTION_CRON_ENABLED` is enabled.

## Workflow

1. **Fetch CUIs** from all enabled sources (SEAP, EU funds, providers)
2. **Normalize** CUIs (remove RO prefix, validate format)
3. **Deduplicate** by CUI (keep highest confidence)
4. **Upsert companies** with minimal fields:
   - CUI (primary key)
   - Name (if available)
   - Slug (generated from name or CUI)
   - Provenance records
5. **Update checkpoint** (cursor, stats)
6. **Create job record** with stats and errors

## Idempotency

- CUI-based upserts ensure no duplicates
- Cursor-based pagination allows resumable ingestion
- Provenance records track source per company
- Errors are recorded but don't block ingestion

## Performance

- Batch processing (50 companies per transaction)
- Cursor-based pagination (no full table scans)
- KV caching of stats
- Designed to handle 50k+ CUIs over time

## Safety

- Feature flags (fail-closed by default)
- Distributed locks prevent concurrent runs
- Read-only mode check
- Dry-run support for testing
- Error tracking and deadletter

## Next Steps

After ingestion, companies are eligible for:
- Scoring (via `/api/cron/recalculate`)
- Enrichment (via `/api/cron/enrich`)
- Financial sync (via `/api/cron/financial-sync`)

These run in subsequent cron cycles (not inline) to keep latency low.

## Testing

Run unit tests:
```bash
npm test -- src/lib/ingestion/national
```

Manual QA:
1. Run dry run: `POST /api/cron/national-ingest?limit=50&dry=1`
2. Verify discovered CUIs and planned upserts (no DB writes)
3. Run live: `POST /api/cron/national-ingest?limit=50`
4. Check `/admin/national-ingestion` for stats
5. Verify `/api/health` shows national ingestion status
