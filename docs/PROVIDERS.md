# Third-Party Data Provider Adapter System

**Status:** Implemented ✅

## Overview

The Provider Adapter System allows RoMarketCap to integrate multiple commercial and open data providers, similar to CoinMarketCap's multi-source aggregation model. This system is designed to be:

- **Pluggable**: Easy to add/remove providers
- **Isolated**: Providers run independently
- **Safe**: Never overwrites verified data
- **Scalable**: Future-proof architecture

## Architecture

### ProviderAdapter Interface

All providers implement the `ProviderAdapter` interface:

```typescript
interface ProviderAdapter {
  getMetadata(): ProviderMetadata;
  discoverCompanies(cursor?: string, limit?: number): Promise<CompanyDiscoveryResult>;
  enrichCompany(cui: string): Promise<CompanyEnrichmentResult | null>;
  getMetrics(cui: string): Promise<CompanyMetricsResult | null>;
  healthCheck(): Promise<boolean>;
}
```

### Provider Types

- **FREE**: Open data sources, no cost
- **PAID**: Commercial APIs with per-request or monthly costs
- **INTERNAL**: Internal data sources (e.g., ANAF verification)

### Base Implementation

`BaseProviderAdapter` provides:
- Rate limiting (per-minute and per-day)
- Cost tracking (for paid providers)
- Error recording
- Success tracking

## Data Handling

### Provenance Storage

All provider data is stored as **provenance**, not ground truth:
- Enrichment data → `CompanyProvenance`
- Never overwrites Company core fields
- Tracks source, confidence, and metadata

### Signal Storage

Metrics are stored as **signals**:
- Traffic, social, mentions → `CompanyIngestSignal`
- Updates `CompanyMetrics` only if confidence is high enough
- Weighted by provider trust level

### Confidence Weighting

Provider data is weighted by:
- **Provider Trust Level** (0-100): How much we trust this provider
- **Provider Confidence** (0-100): Provider's confidence in the data
- **Weighted Confidence** = (Trust × Confidence) / 100

## Example Providers

### DummyBusinessRegistry

**Type:** FREE  
**Trust Level:** 70  
**Purpose:** Mock business registry provider

**Methods:**
- `discoverCompanies()`: Discovers new companies
- `enrichCompany()`: Enriches company data (name, employees, revenue)
- `getMetrics()`: Returns basic metrics

### DummyTrafficProvider

**Type:** PAID  
**Trust Level:** 80  
**Cost:** $0.01/request, $100/month  
**Purpose:** Mock web traffic analytics provider

**Methods:**
- `getMetrics()`: Returns traffic, social, mentions data
- `enrichCompany()`: Returns null (traffic providers don't enrich)

## Controls

### Feature Flags

Each provider has a feature flag:
- Format: `PROVIDER_{PROVIDER_ID}`
- Example: `PROVIDER_DUMMY_BUSINESS_REGISTRY`
- Enable/disable via `/admin/flags`

### Rate Limits

Per-provider rate limits:
- **Per-minute**: Configurable in provider metadata
- **Per-day**: Configurable in provider metadata
- Enforced automatically by `BaseProviderAdapter`

### Cost Tracking

For paid providers:
- Tracks cost per request
- Tracks daily cost
- Stored in KV: `provider:cost:{providerId}:{date}`

## Admin UI

**Route:** `/admin/providers`

**Features:**
- List all providers
- Enable/disable providers
- View stats:
  - Requests today
  - Errors today
  - Cost today (for paid providers)
  - Last success/error
- Test providers (manual enrichment/metrics)

## API Routes

### List Providers
```
GET /api/admin/providers/list
```

### Enrich Company
```
POST /api/admin/providers/{id}/enrich
Body: { cui: "RO12345678" }
```

### Get Metrics
```
POST /api/admin/providers/{id}/metrics
Body: { cui: "RO12345678" }
```

### Cron: Enrich from Providers
```
POST /api/cron/providers/enrich?limit=10&providerId=optional
Headers: x-cron-secret: <CRON_SECRET>
```

## Scoring Integration

### Data Confidence

Provider data boosts confidence:
- Each provider provenance adds 1.5x weight vs regular sources
- Higher trust providers = higher confidence boost
- Calculated in `calculateDataConfidence()`

### ROMC AI Components

Provider metrics feed into:
- **Traffic**: Website traffic from traffic providers
- **Mentions**: Social mentions from various providers
- **Social**: Follower counts from social providers

Metrics are weighted by:
- Provider trust level
- Provider confidence
- Data recency

## Adding a New Provider

1. **Create Provider Class**:
   ```typescript
   import { BaseProviderAdapter } from "../base";
   import type { ProviderMetadata, ProviderType } from "../types";

   export class MyProvider extends BaseProviderAdapter {
     protected metadata: ProviderMetadata = {
       id: "my-provider",
       name: "My Provider",
       type: ProviderType.PAID,
       trustLevel: 75,
       // ... other config
     };

     async enrichCompany(cui: string) { /* ... */ }
     async getMetrics(cui: string) { /* ... */ }
     // ...
   }
   ```

2. **Register Provider**:
   ```typescript
   // In src/lib/providers/registry.ts
   this.register(new MyProvider());
   ```

3. **Add Feature Flag**:
   - Flag name: `PROVIDER_MY_PROVIDER`
   - Enable via `/admin/flags`

4. **Test**:
   - Use `/admin/providers` to test
   - Verify data appears in provenance/signals

## Safety Features

1. **Never Overwrites**: Provider data stored as provenance/signals
2. **Confidence Weighting**: Low-confidence data doesn't update metrics
3. **Rate Limiting**: Prevents API abuse
4. **Cost Tracking**: Monitors spending for paid providers
5. **Error Handling**: Errors logged but don't crash system
6. **Feature Flags**: Can disable providers instantly

## Ingestion Providers (PROMPT 53)

Ingestion providers are for **bulk data ingestion** - they fetch pages of companies and normalize them into our internal schema. This is different from enrichment providers which work on individual companies.

### Architecture

Ingestion providers implement the `IngestionProvider` interface:

```typescript
interface IngestionProvider {
  id: string;
  displayName: string;
  supports: { companies, financials, employees, taxonomy };
  rateLimit: { rpm, concurrency };
  auth: { type, ... };
  fetchPage(args): Promise<{ items, nextCursor? }>;
  normalize(item): NormalizedCompanyRecord | null;
  healthCheck(): Promise<boolean>;
}
```

### How to Add a New Ingestion Provider in 1 File

1. **Create provider file** in `src/lib/providers/ingestion/`:

```typescript
// src/lib/providers/ingestion/myProvider.ts
import type { IngestionProvider, ProviderCompanyItem, ProviderPageResult, NormalizedCompanyRecord } from "./types";

export class MyProvider implements IngestionProvider {
  id = "provider_my";
  displayName = "My Provider";
  supports = { companies: true, financials: true, employees: true, taxonomy: true };
  rateLimit = { rpm: 60, concurrency: 1 };
  auth = { type: "api_key" as const, apiKey: process.env.MY_PROVIDER_API_KEY };

  async fetchPage(args: { cursor?: string; limit?: number }): Promise<ProviderPageResult> {
    // Fetch from API
    const response = await fetch(`https://api.example.com/companies?cursor=${args.cursor}&limit=${args.limit}`, {
      headers: { "Authorization": `Bearer ${this.auth.apiKey}` },
    });
    const data = await response.json();
    
    return {
      items: data.companies,
      nextCursor: data.nextCursor,
    };
  }

  normalize(item: ProviderCompanyItem): NormalizedCompanyRecord | null {
    const raw = item as { cui: string; name: string; ... };
    
    if (!raw.cui || !raw.name) {
      return null;
    }

    return {
      cui: raw.cui,
      name: raw.name,
      domain: raw.domain,
      // ... other fields
      confidence: 80,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.fetchPage({ limit: 1 });
      return result.items.length >= 0; // Just check if API responds
    } catch {
      return false;
    }
  }
}
```

2. **Register in registry** (`src/lib/providers/ingestion/registry.ts`):

```typescript
import { MyProvider } from "./myProvider";

constructor() {
  this.register(new StubProvider());
  this.register(new MyProvider()); // Add this
}
```

3. **Add environment variables** (`.env.local`):

```env
MY_PROVIDER_API_KEY=your-api-key
MY_PROVIDER_BASE_URL=https://api.example.com
```

4. **Add feature flag** (via `/admin/flags`):
   - Flag name: `PROVIDER_MY` (auto-created, defaults to enabled)

5. **Test**:
   - Use `/admin/providers` to see your provider
   - Click "Run Dry" to test without writing to DB
   - Click "Run Now" to actually ingest data

### Stub Provider

The `provider_stub` reads from a local JSON file for dev/test:

```env
PROVIDER_STUB_FILE=./data/providers/stub-companies.json
```

JSON format:
```json
[
  {
    "cui": "RO12345678",
    "name": "Test Company SRL",
    "domain": "test.com",
    "employees": 50,
    "revenue": 1000000,
    "profit": 100000
  }
]
```

### Ingestion Flow

1. **Cron triggers** `/api/cron/providers` (or manual via admin UI)
2. **Provider fetches page** via `fetchPage()`
3. **Each item normalized** via `normalize()`
4. **Validated** with Zod schema
5. **Upserted** with merge policy (never overwrites high-confidence data)
6. **Provenance stored** in `CompanyProvenance`
7. **Raw snapshot stored** in `ProviderRawSnapshot` (sanitized, 8KB cap)
8. **Cursor updated** for next run

### Merge Policy

The ingestion engine **never overwrites**:
- Manually approved data (claims/submissions)
- High-confidence data (unless provider confidence is higher)

It **always updates**:
- Missing fields
- Low-confidence data (if provider confidence is higher)

### Safety Features

1. **Sanitization**: Raw snapshots whitelist keys, cap at 8KB
2. **Rate Limiting**: Per-provider rate limits enforced
3. **Distributed Locks**: Prevents concurrent runs
4. **Feature Flags**: Can disable instantly
5. **Dry Run**: Test without writing to DB
6. **Error Handling**: Errors logged, don't crash system

## Future Providers

Potential real providers to integrate:
- **SimilarWeb**: Web traffic analytics
- **SEMrush**: SEO and traffic data
- **Crunchbase**: Funding and company data
- **LinkedIn API**: Social and hiring signals
- **ANAF API**: Official Romanian business registry
- **Trade Register APIs**: European business registries

## Example Usage

### Manual Enrichment
```typescript
import { providerRegistry } from "@/src/lib/providers/registry";

const provider = providerRegistry.get("dummy-business-registry");
const result = await provider.enrichCompany("RO12345678");
// Store as provenance
await storeEnrichmentAsProvenance(result, "dummy-business-registry");
```

### Automated Cron
```bash
POST /api/cron/providers/enrich?limit=10
# Processes companies through all active providers
```

## Monitoring

Check provider health:
- `/admin/providers`: View all providers and stats
- KV keys: `provider:errors:{providerId}` for error logs
- KV keys: `provider:cost:{providerId}:{date}` for cost tracking

