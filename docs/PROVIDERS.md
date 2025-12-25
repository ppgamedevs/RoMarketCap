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

