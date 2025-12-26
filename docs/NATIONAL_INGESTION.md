# National Data Ingestion v1

**Status:** Fully Implemented ✅ (Prompt 51 Complete)

All features from Prompt 51 have been implemented, including:
- ✅ Activity signal creation (CONTRACT_WIN, EU_GRANT)
- ✅ Post-ingestion hooks (ROMC scoring, confidence boost, enrichment scheduling)
- ✅ Orchestrator integration
- ✅ Comprehensive tests

## Overview

National Data Ingestion automatically discovers Romanian companies from public data sources:
- **SEAP** (Sistemul Electronic de Achiziții Publice) - Public procurement contracts
- **EU Funds** - EU funding beneficiaries

This allows RoMarketCap to automatically discover tens of thousands of Romanian companies without manual input, similar to how CoinMarketCap discovers new assets.

## Architecture

### Data Flow

```
CSV/JSON Source → Streaming Parser → CUI Validation → Company Upsert → Provenance Tracking
```

### Key Principles

1. **Provenance Sources, Not Ground Truth**: Data from SEAP/EU Funds is treated as evidence, not definitive company data
2. **Non-Destructive**: Never overwrites existing company core fields
3. **Idempotent**: Can be run multiple times safely
4. **Cursor-Based**: Supports large datasets with cursor-based pagination

## Database Schema

### Enhanced CompanyProvenance

The `CompanyProvenance` model tracks:
- `externalId`: External record ID (contract ID, beneficiary ID)
- `firstSeenAt`: First time we saw this record
- `lastSeenAt`: Last time we saw this record
- `contractValue`: Individual contract/project value
- `contractYear`: Year of contract/award
- `contractingAuthority`: Authority/program name
- `totalValue`: Aggregated total value (computed)
- `rawJson`: Full raw record for audit/debugging

### CompanyIngestSignal (Activity Signals)

The `CompanyIngestSignal` model tracks individual contract/grant events:
- `type`: `CONTRACT_WIN` (for SEAP) or `EU_GRANT` (for EU Funds)
- `valueNumeric`: Contract/grant amount
- `observedAt`: Date of the contract/grant (uses year from data)
- Links to company via `companyId`

**Note**: Activity signals are automatically created during ingestion for each contract/grant record.

## Usage

### Manual Ingestion

#### SEAP
```bash
npm run ingest:seap <path-to-seap.csv> [--dry-run]
```

#### EU Funds
```bash
npm run ingest:eu-funds <path-to-eu-funds.csv> [--dry-run]
```

### Automated Cron

The cron route `/api/cron/ingest-national` processes data from configured CSV URLs:

**Environment Variables:**
- `SEAP_DATA_URL` or `SEAP_CSV_URL`: URL to SEAP CSV file (both names supported)
- `EU_FUNDS_DATA_URL` or `EU_FUNDS_CSV_URL`: URL to EU Funds CSV file (both names supported)

**Feature Flag:**
- `CRON_INGEST_NATIONAL`: Enable/disable automated ingestion

**Usage:**
```bash
POST /api/cron/ingest-national?source=SEAP&limit=100&dry=true
Headers: x-cron-secret: <CRON_SECRET>
```

**Parameters:**
- `source`: `SEAP` or `EU_FUNDS` (default: `SEAP`)
- `limit`: Max rows to process (default: 100, max: 1000)
- `dry`: Dry run mode (default: false)
- `cursor`: Resume from cursor position

## CSV Format

### SEAP Format

Expected columns (flexible mapping):
- `nume_firma`, `denumire`, `nume`: Company name
- `cui`: CUI (required)
- `valoare`, `valoare_contract`, `valoare_totala`: Contract value
- `an`, `an_contract`: Contract year
- `autoritate_contractanta`, `nume_autoritate`: Contracting authority
- `id_contract`, `contract_id`, `id`: External contract ID

### EU Funds Format

Expected columns (flexible mapping):
- `nume_beneficiar`, `denumire`, `nume`, `beneficiar`: Company name
- `cui`: CUI (required)
- `valoare`, `valoare_proiect`, `valoare_totala`, `suma`: Project value
- `an`, `an_proiect`, `an_contract`: Project year
- `program`, `nume_program`, `fond`: Program name
- `id_proiect`, `proiect_id`, `id`: External project ID

## Admin UI

Access at `/admin/national-ingestion` to view:
- Last run times for each source
- Companies discovered count
- Processing statistics (processed, created, updated, errors)
- Top companies by public money
- Recent errors (last 24h)

## Safety Features

### Rate Limiting
- Max 1000 rows per run
- Configurable via `limit` parameter

### Validation
- Strict CUI validation (RO + 2-10 digits)
- Company name validation (min 2 characters)
- Automatic normalization

### Error Handling
- Errors logged but don't stop processing
- Failed rows tracked in `ImportItem` table
- Recent errors visible in admin UI

### Lock Protection
- Distributed locks prevent concurrent runs
- Lock TTL: 3600 seconds (1 hour)

### Idempotency
- Deduplication by `(sourceName, externalId)` or `(companyId, sourceName, rowHash)`
- Safe to run multiple times

## Post-Ingestion Hooks

After each company is ingested, the following hooks are automatically triggered:

1. **ROMC Score Calculation**
   - Updates ROMC v1 score
   - Updates ROMC AI score
   - Updates score-v0

2. **Data Confidence Boost**
   - Recalculates `dataConfidence` including SEAP/EU_FUNDS provenance
   - National ingestion sources add 1.2x weight to confidence calculation

3. **Enrichment Scheduling**
   - Company marked as public and active
   - Existing enrichment cron will pick it up automatically

4. **Integrity Update**
   - Updates company integrity score
   - Updates risk flags

**Note**: Hooks only run for new companies or when new provenance is created (not on updates).

## Testing

Run tests:
```bash
npm test
```

Test files:
- `src/lib/ingestion/cuiValidation.test.ts`: CUI validation tests
- `src/lib/ingestion/provenance.test.ts`: Provenance utility tests
- `src/lib/ingestion/ingestion.test.ts`: CSV parsing, cursor resume, idempotency tests

## Migration

After updating the schema, run:
```bash
npm run db:migrate:dev
```

Or in production:
```bash
npm run db:migrate:deploy
```

## Orchestrator Integration

National ingestion is integrated into the cron orchestrator (`/api/cron/orchestrate`):
- Runs after enrichment step
- Processes both SEAP and EU_FUNDS sources
- Feature-flag controlled (`CRON_INGEST_NATIONAL`)
- Budget-aware (processes 500 rows per source per run)

## Next Steps

1. **Configure Data Sources**: Set `SEAP_DATA_URL` (or `SEAP_CSV_URL`) and `EU_FUNDS_DATA_URL` (or `EU_FUNDS_CSV_URL`) environment variables
2. **Enable Feature Flag**: Set `CRON_INGEST_NATIONAL=1` in feature flags
3. **Set Up Cron**: 
   - Option A: Use orchestrator (recommended):
     ```
     POST /api/cron/orchestrate
     ```
   - Option B: Direct ingestion:
     ```
     POST /api/cron/ingest-national?source=SEAP&limit=500
     POST /api/cron/ingest-national?source=EU_FUNDS&limit=500
     ```
4. **Monitor**: Check `/admin/national-ingestion` for stats and errors

## Example Output

After ingestion, you'll see:
- Companies automatically created with minimal data (name, CUI)
- Provenance records linking companies to public contracts/funding
- Aggregated total values per company
- Top companies by public money visible in admin UI

Companies discovered this way have:
- `sourceConfidence: 40` (lower than manual imports)
- `isPublic: true`
- `visibilityStatus: "PUBLIC"`

