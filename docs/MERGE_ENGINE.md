# Merge Engine v1

**Status:** Implemented ✅ (PROMPT 56)

## Overview

The Merge Engine ensures deterministic, provenance-aware merging of company data from multiple sources. It prevents data corruption, respects user-approved data, and maintains a complete audit trail.

## Merge Policies

### Field-Specific Rules

1. **Name**: Prefer official/verified sources > user-approved > third-party > scraped website
2. **Address**: Prefer official/verified sources > third-party
3. **IndustrySlug/CAEN**: Prefer official/verified sources
4. **Domain**: Prefer existing non-empty domain; else accept new if valid and not blacklisted
5. **Numeric Finance Fields** (revenue/profit/employees): Prefer official/verified or "most recent year"
6. **DescriptionShort/Socials/Email/Phone**: Can merge from enrichment if empty

### Source Priority

- `ANAF_VERIFY`: 100 (Highest - verified by ANAF)
- `USER_APPROVED`: 90 (High - manually approved)
- `EU_FUNDS`: 70 (High - official EU data)
- `SEAP`: 60 (Medium-high - official public procurement)
- `THIRD_PARTY`: 40 (Lower - third-party sources)
- `ENRICHMENT`: 30 (Lowest - enrichment/scraping)

### Confidence Thresholds

- **MIN_ACCEPT**: 40 (minimum confidence to accept data)
- **HIGH_CONFIDENCE**: 70
- **VERIFIED**: 90

## Usage

```typescript
import { mergeCompanyPatch } from "@/src/lib/ingestion/mergeRules";

const result = mergeCompanyPatch(currentCompany, patch, {
  sourceId: "SEAP",
  sourceRef: "contract-123",
  confidence: 60,
});

// result.update: Prisma.CompanyUpdateInput
// result.changes: FieldChange[]
// result.provenance: Record<string, FieldProvenance>
```

## Safety Rules

1. **Never overwrite user-approved data** unless new source is verified (ANAF_VERIFY)
2. **Respect confidence thresholds** - low confidence data is rejected
3. **Preserve existing non-empty fields** unless new source has higher priority
4. **Record all changes** in `CompanyChangeLog` for audit trail
5. **Store provenance** per field in `Company.fieldProvenance`

## Provenance Tracking

Each field stores:
- `sourceId`: Which source provided the data
- `sourceRef`: External reference (contract ID, project ID, etc.)
- `seenAt`: When the data was seen
- `confidence`: Confidence score (0-100)

Stored in `Company.fieldProvenance` (JSON, capped at 50 fields).

## Tests

See `src/lib/ingestion/mergeRules.test.ts` for comprehensive test coverage.

