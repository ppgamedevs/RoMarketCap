# National Ingestion Orchestrator v2

**Status:** Implemented ✅ (PROMPT 55)

## Overview

The Unified Ingestion Orchestrator v2 is a production-grade system that continuously ingests and refreshes Romanian companies using multiple sources (SEAP, EU Funds, ANAF verify, third-party adapters), with correct deduplication, provenance tracking, incremental updates, and safe operational controls.

## Architecture

### Unified Framework

All ingestion sources follow a standard interface:

- **SourceCompanyRecord**: Standard shape for all source data
- **Source Registry**: Central registry for all sources
- **Merge & Dedupe**: Deterministic rules for matching and merging
- **Provenance**: Per-field tracking of data sources
- **Budget Control**: Time and record limits per run
- **Cursor Management**: Resumable, cursor-based processing

### Sources

1. **SEAP** - Public procurement contracts
2. **EU_FUNDS** - EU Funds beneficiaries
3. **ANAF_VERIFY** - ANAF verification (safe mode)
4. **THIRD_PARTY** - Third-party data providers

## Key Features

### Deterministic Merge & Dedupe

- **Primary identity**: CUI (if present)
- **Secondary identity**: domain + county (strict matching)
- **Name-based matching**: Disabled by default (too risky)
- **Priority**: ANAF_VERIFY > EU_FUNDS > SEAP > THIRD_PARTY
- **Respects approved data**: Never overwrites manually approved fields

### Per-Field Provenance

Each field stores:
- `sourceId`: Which source provided the data
- `sourceRef`: External reference (contract ID, project ID, etc.)
- `seenAt`: When the data was seen
- `confidence`: Confidence score (0-100)

Stored in `Company.fieldProvenance` (JSON, capped at 50 fields).

### Budget Control

- **Records limit**: Max records per run (default: 200)
- **Time limit**: Max time per run (default: 25000ms)
- **Per-source budgets**: Each source respects global budget

### Cursor Management

- Cursors stored in KV: `ingest:cursor:SEAP`, `ingest:cursor:EU_FUNDS`, etc.
- Resume from last position
- 7-day TTL

## Database Models

### UnifiedIngestRun

Tracks each ingestion run:
- `sourcesEnabled`: Array of source IDs enabled
- `counters`: Per-source stats (seen, upserted, created, updated, materialChanges, errors)
- `cursorSnapshot`: Cursor state at run start
- `status`: STARTED, COMPLETED, FAILED, PARTIAL

### IngestItemError

Tracks errors per item:
- `sourceId`: Which source
- `sourceRef`: External reference
- `errorCode`: Normalized error code
- `message`: Error message

### Company Extensions

- `fieldProvenance`: Per-field provenance (JSON, capped)
- `lastSeenAtFromSources`: Last time seen by any source

## API Endpoints

### `/api/cron/ingest-v2`

Main ingestion endpoint.

**Query Parameters:**
- `limit`: Max records per source (default: 200, max: 1000)
- `budgetMs`: Max time in ms (default: 25000, max: 300000)
- `dry`: 1 (dry run mode)

**Protection:**
- `CRON_SECRET` header
- Distributed lock `cron:ingest`
- Feature flag `INGEST_ENABLED`

**Response:**
```json
{
  "ok": true,
  "dry": false,
  "sourcesEnabled": ["SEAP", "EU_FUNDS"],
  "results": [...],
  "counters": {
    "SEAP": {
      "seen": 100,
      "upserted": 50,
      "created": 10,
      "updated": 40,
      "materialChanges": 15,
      "errors": 2
    }
  }
}
```

## Feature Flags

- `INGEST_ENABLED`: Global enable/disable
- `INGEST_SEAP`: Enable SEAP source
- `INGEST_EU_FUNDS`: Enable EU Funds source
- `INGEST_ANAF_VERIFY`: Enable ANAF verification
- `INGEST_THIRD_PARTY`: Enable third-party sources

## Admin UI

### `/admin/ingest`

Shows:
- Last 30 ingestion runs
- Per-source counters
- Error summaries
- Cursor states

### `/admin/ingest/[id]`

Details page for a specific run:
- Full counters
- Error list
- Cursor snapshot

## Freshness SLAs

### Company Page

Shows:
- **Source badges**: Which sources last saw this company (SEAP, EU Funds, etc.)
- **Last seen**: Timestamp from sources
- **Manual-only badge**: If company has never been seen by any source

### `/status` Page

Ingestion health block:
- Last ingest run time
- Companies with source seen in last 30 days
- Manual-only companies count
- Top error codes in last 7 days

## Safety Features

1. **Idempotent**: Unique constraints prevent duplicates
2. **Cursor-based**: Resume from last position
3. **Distributed locks**: Prevent concurrent runs
4. **Feature flags**: Instant disable
5. **Budget limits**: Time and record caps
6. **Error tracking**: All errors logged with codes
7. **Dry run**: Test without DB writes
8. **Read-only mode**: Respects global read-only flag

## Environment Variables

```env
# Source URLs (from PROMPT 54)
SEAP_CSV_URL="https://example.com/seap-export.csv"
EU_FUNDS_CSV_URL="https://example.com/eu-funds.csv"
# OR
EU_FUNDS_JSON_URL="https://example.com/eu-funds.json"

# Enable/disable (or use feature flags in KV)
INGEST_ENABLED=1
```

## Integration

### Cron Orchestrator

The orchestrator (`/api/cron/orchestrate`) calls `/api/cron/ingest-v2` if `INGEST_ENABLED` is enabled.

### Scoring & Enrichment

After material changes, companies are queued for:
- Score recomputation (ROMC v1, ROMC AI)
- Integrity updates
- Enrichment (if enabled)

## Testing

### Unit Tests

- `src/lib/ingestion/merge.test.ts`: Merge and dedupe logic
- `src/lib/ingestion/budget.test.ts`: Budget management
- `src/lib/cui/normalize.test.ts`: CUI normalization

### Manual Acceptance

1. **Dry run**: `POST /api/cron/ingest-v2?dry=1` returns summary
2. **Live run**: Creates `UnifiedIngestRun`, advances cursors, updates stats
3. **Company page**: Shows source badges and "last seen" info
4. **Status page**: Shows ingestion health block
5. **Admin UI**: Shows runs, errors, cursors

## Rollback

To disable ingestion:

1. Set feature flag: `INGEST_ENABLED=false` in KV
2. Or set env var: `INGEST_ENABLED=0`
3. System will skip ingestion on next orchestrator run

No data is deleted - ingestion is additive only.

