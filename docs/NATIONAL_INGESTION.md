# National Data Ingestion v1

**Status:** Implemented ✅

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
- `SEAP_CSV_URL`: URL to SEAP CSV file
- `EU_FUNDS_CSV_URL`: URL to EU Funds CSV file

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

## Testing

Run tests:
```bash
npm test
```

Test files:
- `src/lib/ingestion/cuiValidation.test.ts`: CUI validation tests
- `src/lib/ingestion/provenance.test.ts`: Provenance utility tests

## Migration

After updating the schema, run:
```bash
npm run db:migrate:dev
```

Or in production:
```bash
npm run db:migrate:deploy
```

## Next Steps

1. **Configure Data Sources**: Set `SEAP_CSV_URL` and `EU_FUNDS_CSV_URL` environment variables
2. **Enable Feature Flag**: Set `CRON_INGEST_NATIONAL=1` in feature flags
3. **Set Up Cron**: Add to Vercel Cron or similar:
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

