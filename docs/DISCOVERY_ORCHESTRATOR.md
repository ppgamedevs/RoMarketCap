# National Company Discovery Orchestrator v1

**Status:** Implemented ✅ (PROMPT 54)

## Overview

The Discovery Orchestrator is a continuous pipeline that automatically discovers Romanian companies from public sources (SEAP + EU Funds), normalizes/dedupes them, and verifies + hydrates them via ANAF to create real Company rows.

This implements the "CoinMarketCap-style coverage engine" for Romania - automatically building a national company universe over time.

## Architecture

```
Discover (SEAP/EU Funds) → Validate CUI → Upsert DiscoveredCompany → Verify (ANAF) → Upsert Company → Score → Enrich
```

### Key Principles

1. **Idempotent**: Re-running does not duplicate
2. **Cursor-based**: Resume safely from last position
3. **Distributed locks**: Prevents concurrent runs
4. **Feature-flag controlled**: Can disable instantly
5. **Rate limited + budgeted**: Time/records per run
6. **Verified CUIs only**: Only verified companies become canonical
7. **Strong provenance**: Tracks which source discovered the CUI + evidence

## Database Models

### DiscoveredCompany

Tracks discovered CUIs before verification:

- `cui`: Normalized CUI (digits only)
- `source`: SEAP, EU_FUNDS, MANUAL, THIRD_PARTY
- `status`: NEW, INVALID, VERIFIED, REJECTED, ERROR, DUPLICATE
- `evidenceJson`: Raw evidence (contract ID, award notice, fund project, name, URL, amount, date)
- `linkedCompanyId`: Link to Company if verified/upserted

### IngestRun

Tracks each ingestion run:

- `source`: Discovery source
- `status`: STARTED, COMPLETED, FAILED, PARTIAL
- `cursor`: Persisted cursor for resume
- `statsJson`: Counts (discovered, invalid, duplicates, verified, errors)

## Discovery Adapters

### SEAP Adapter

Discovers companies from SEAP (Sistemul Electronic de Achiziții Publice) CSV exports.

**Environment Variable:**
```env
SEAP_CSV_URL="https://example.com/seap-export.csv"
```

**Features:**
- Streams CSV (no full file load)
- Flexible column mapping (tries multiple CUI column names)
- Extracts supplier name, contract value, authority, date
- Cursor-based (line number)

**CUI Column Candidates:**
- CUI, CUI Furnizor, Cod fiscal, CodFiscal, CIF, CIF/CUI, etc.

### EU Funds Adapter

Discovers companies from EU Funds CSV/JSON exports.

**Environment Variables:**
```env
EU_FUNDS_CSV_URL="https://example.com/eu-funds.csv"
# OR
EU_FUNDS_JSON_URL="https://example.com/eu-funds.json"
```

**Features:**
- Supports both CSV and JSON formats
- Extracts beneficiary CUI, name, project ID, program, amount, date
- Cursor-based pagination

## Verification & Upsert Flow

1. **Select NEW discovered companies** (oldest first)
2. **Verify via ANAF** (safe mode, rate-limited)
3. **If not found/inactive** → Set status INVALID
4. **If found and active**:
   - Upsert Company with:
     - CUI as canonical identifier
     - Name from ANAF (authoritative)
     - Slug/canonicalSlug
     - Minimal metadata
   - Link DiscoveredCompany.linkedCompanyId
   - Set status VERIFIED
   - Create/merge CompanyProvenance with evidence
   - Trigger scoring + AI scoring (budget-limited)

## Cron Route

**Endpoint:** `/api/cron/ingest`

**Query Parameters:**
- `source`: SEAP|EU_FUNDS|ALL (default: ALL)
- `discoverLimit`: Max CUIs to discover (default: 200, max: 1000)
- `verifyLimit`: Max CUIs to verify (default: 20, max: 100)
- `dry`: 1 (dry run mode, no DB writes)

**Protection:**
- `CRON_SECRET` header check
- Distributed lock `lock:cron:ingest`
- Feature flag `INGEST_ENABLED` (fail closed)

**Usage:**
```bash
POST /api/cron/ingest?source=SEAP&discoverLimit=200&verifyLimit=20
Headers: x-cron-secret: <CRON_SECRET>
```

## Admin UI

**Page:** `/admin/ingest`

**Features:**
- View discovery queue metrics (NEW, VERIFIED, INVALID, ERROR, etc.)
- View last 20 ingestion runs
- Buttons:
  - "Run SEAP Discover (Dry)" - Test without DB writes
  - "Run SEAP Discover+Verify" - Full run
  - "Run EU Funds Discover (Dry)"
  - "Run EU Funds Discover+Verify"
  - "Verify Next 50" - Verify next batch of NEW companies

## Normalization

CUI normalization handles various formats:
- `RO12345678` → `12345678`
- `1234 5678` (with spaces) → `12345678`
- `1234.5678` (with dots) → `12345678`

Validation:
- 2-10 digits
- Rejects all-same-digit (e.g., "11111111")
- Format validation only (not checksum - ANAF confirms existence)

## Safety Features

1. **Idempotent**: Unique constraint on `(cui, source)` prevents duplicates
2. **Cursor-based**: Resume from last position
3. **Distributed locks**: Prevents concurrent runs
4. **Feature flags**: Can disable instantly
5. **Rate limiting**: Budgeted verification (max per run)
6. **Error handling**: Errors logged, don't crash system
7. **Dry run**: Test without DB writes

## SEO & Ranking Impact

After companies are upserted:
- Appear in `/companies` directory
- Included in sitemaps (unless DEMO_MODE)
- Company pages show provenance sources "SEAP / EU Funds" in Data Sources
- Trigger scoring and enrichment pipelines

## Environment Variables

Add to `.env.local`:

```env
# Required for SEAP discovery
SEAP_CSV_URL="https://example.com/seap-export.csv"

# Required for EU Funds discovery (one of)
EU_FUNDS_CSV_URL="https://example.com/eu-funds.csv"
# OR
EU_FUNDS_JSON_URL="https://example.com/eu-funds.json"

# Enable/disable (or use feature flag INGEST_ENABLED in KV)
INGEST_ENABLED=1
```

## Testing

### Manual Acceptance Checklist

1. **Set SEAP_CSV_URL** to a test CSV file URL
2. **Call dry run:**
   ```bash
   POST /api/cron/ingest?source=SEAP&discoverLimit=50&verifyLimit=10&dry=1
   ```
   - Should return summary without DB writes
3. **Call without dry:**
   ```bash
   POST /api/cron/ingest?source=SEAP&discoverLimit=50&verifyLimit=10
   ```
   - Should create DiscoveredCompany rows
4. **Verification step:**
   - If ANAF stub returns found for some CUIs
   - Company rows should be created
   - Slugs should be set
   - Companies should appear in `/companies`
5. **Sitemaps** should include these companies once they exist

## Integration with Existing Systems

- **National Ingestion (Prompt 51)**: Uses same SEAP/EU Funds sources but different flow (direct ingestion vs discovery → verification)
- **ANAF Verification (Prompt 52)**: Used for verification step
- **Scoring**: Triggered after company upsert
- **Enrichment**: Companies marked for enrichment
- **Provenance**: Stored in CompanyProvenance with discovery source

## Next Steps

1. **Run Migration**: `npm run db:migrate:dev`
2. **Set Environment Variables**: Configure SEAP_CSV_URL and/or EU_FUNDS_CSV_URL
3. **Enable Feature Flag**: Set `INGEST_ENABLED=1` in KV or env
4. **Test Dry Run**: Use `/admin/ingest` to test discovery
5. **Run Full Ingestion**: Start discovering and verifying companies
6. **Monitor**: Check `/admin/ingest` for metrics and runs

