# ANAF Verification Connector (SAFE MODE)

**Status:** Implemented ✅

## Overview

The ANAF Verification Connector verifies the existence and legal status of companies already discovered in RoMarketCap. It operates in **SAFE MODE** with conservative rate limiting, aggressive caching, and no retry storms.

## Purpose

- Verify existence and legal status of companies already discovered
- **NOT** bulk scraping
- **NOT** aggressive crawling
- Increase trust and confidence without creating legal or operational risk

## Features

### A) Connector Behavior

**Input:** CUI (Cod Unic de Înregistrare)

**Output:**
- `isActive`: Company is active in ANAF (yes/no)
- `isVatRegistered`: VAT registered (yes/no)
- `lastReportedYear`: Last reported year (if available)
- `verifiedAt`: Verification timestamp
- `verificationStatus`: SUCCESS, ERROR, or PENDING

### B) Safety Rules

- **Rate Limiting**: Extremely conservative (1 request per 2 seconds)
- **Caching**: Aggressive (90 days default, configurable 30-365 days)
- **No Retry Storms**: Errors are not retried automatically
- **Feature Flag Controlled**: `CRON_VERIFY_ANAF` flag enables/disables
- **Read-Only Mode Compliant**: Respects read-only mode

### C) Data Handling

- Stores verification results in `CompanyVerification` table
- **Never overwrites** Company core fields automatically
- Uses verification only for:
  - Confidence score (boosts confidence if verified and active)
  - Risk flags (adds flags if inactive or verification failed)
  - UI indicators (verification badge)

### D) Cron Route

**Endpoint:** `/api/cron/verify-anaf`

**Features:**
- Processes only companies:
  - Missing verification OR
  - Verification older than TTL (default 90 days)
- Cursor-based processing
- Lock-protected (prevents concurrent runs)
- Dry-run supported

**Usage:**
```bash
POST /api/cron/verify-anaf?limit=10&dry=true&ttlDays=90
Headers: x-cron-secret: <CRON_SECRET>
```

**Parameters:**
- `limit`: Max companies to verify (default: 10, max: 50)
- `dry`: Dry run mode (default: false)
- `cursor`: Resume from cursor position
- `ttlDays`: Cache TTL in days (default: 90, min: 30, max: 365)

### E) UI

**Company Page:**
- Shows ANAF verification badge
- Includes last verified date
- Degrades gracefully if unavailable
- Shows verification status (active/inactive, VAT registered, etc.)

**Badge States:**
- ✅ **Verified & Active**: Green badge with checkmark
- ❌ **Inactive**: Red badge with X
- ⏳ **Pending**: Gray badge with clock
- ⚠️ **Error**: Red badge with alert

### F) Legal Posture

- **Instantly Disableable**: Feature flag can disable immediately
- **Clear Separation**: 
  - Public signals (from SEAP, EU Funds)
  - Verified signals (from ANAF)
- **Read-Only Compliant**: Respects read-only mode

## Database Schema

### CompanyVerification Model

```prisma
model CompanyVerification {
  id                String   @id @default(cuid())
  companyId         String   @unique
  isActive          Boolean  // Company is active in ANAF
  isVatRegistered   Boolean  // VAT registered (yes/no)
  lastReportedYear  Int?     // Last reported year if available
  verifiedAt        DateTime // Verification timestamp
  source            String   @default("ANAF")
  rawResponse       Json?    // Full API response for audit
  errorMessage      String?  // Error if verification failed
  verificationStatus String  // SUCCESS, ERROR, PENDING
}
```

## Configuration

### Environment Variables

```env
# ANAF API URL (optional, has default)
ANAF_API_URL=https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva

# Cron secret (required for cron routes)
CRON_SECRET=your-secret-here
```

### Feature Flags

Enable/disable via `/admin/flags`:
- `CRON_VERIFY_ANAF`: Enable/disable automated verification

## Usage

### Manual Verification

```typescript
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";

const result = await verifyCompanyANAF("RO12345678");
// Returns: { isActive, isVatRegistered, lastReportedYear, verifiedAt, ... }
```

### Automated Cron

Set up in Vercel Cron or similar:
```
POST /api/cron/verify-anaf?limit=10
Headers: x-cron-secret: <CRON_SECRET>
```

Recommended schedule: **Daily at 03:00** (after other cron jobs)

## Confidence Score Impact

Verification affects confidence score:
- **Active + Verified**: +10 confidence
- **Active + VAT Registered**: +5 additional confidence
- **Inactive**: -20 confidence
- **Verification Failed**: No change (but adds risk flag)

## Risk Flags

Verification can add risk flags:
- `VERIFICATION_FAILED`: Verification API call failed
- `INACTIVE_IN_ANAF`: Company is inactive in ANAF

## Safety Features

1. **Rate Limiting**: 1 request per 2 seconds (very conservative)
2. **Caching**: 90 days default (aggressive caching)
3. **No Retries**: Errors are logged but not retried
4. **Lock Protection**: Prevents concurrent runs
5. **Feature Flag**: Can be disabled instantly
6. **Read-Only Mode**: Respects read-only mode

## Monitoring

Check verification status:
- Company page: Shows verification badge
- Admin: Check `/admin/national-ingestion` for stats (if integrated)

## Legal Compliance

- Uses public ANAF API (read-only)
- No bulk scraping
- Conservative rate limiting
- Aggressive caching to minimize API calls
- Instantly disableable via feature flag

## Next Steps

1. **Run Migration**: `npm run db:migrate:dev`
2. **Enable Feature Flag**: Set `CRON_VERIFY_ANAF=1` in feature flags
3. **Set Up Cron**: Add to Vercel Cron:
   ```
   POST /api/cron/verify-anaf?limit=10
   ```
4. **Monitor**: Check company pages for verification badges

## Example Output

After verification, company page shows:
- ✅ **ANAF Verified** badge (if active)
- VAT registration status
- Last reported year
- Verification date

Confidence score is boosted if company is verified and active.

