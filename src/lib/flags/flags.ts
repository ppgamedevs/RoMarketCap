import { kv } from "@vercel/kv";
import { cache } from "react";

/**
 * Feature flags for kill-switch system.
 * All flags default to ENABLED (fail-open) unless marked as risky.
 * Risky flags default to DISABLED (fail-closed).
 */

export type FeatureFlag =
  | "PREMIUM_PAYWALLS"
  | "FORECASTS"
  | "ENRICHMENT"
  | "ALERTS"
  | "PLACEMENTS"
  | "API_ACCESS"
  | "NEWSLETTER_SENDS"
  | "CRON_RECALCULATE"
  | "CRON_ENRICH"
  | "CRON_WEEKLY_DIGEST"
  | "CRON_WATCHLIST_ALERTS"
  | "CRON_BILLING_RECONCILE"
  | "CRON_SNAPSHOT"
  | "CRON_PROVIDERS_ENRICH"
  | "CRON_INGEST_NATIONAL"
  | "CRON_VERIFY_ANAF"
  | "FLAG_INGEST_NATIONAL"
  | "FLAG_UNIVERSE_INGEST"
  | "INGEST_ENABLED"
  | "READ_ONLY_MODE"
  | "FINANCIAL_SYNC_ENABLED" // PROMPT 58: Financial sync feature
  | "FINANCIAL_SYNC_CRON_ENABLED" // PROMPT 58: Financial sync cron
  | "FINANCIAL_SYNC_ADMIN_ENABLED" // PROMPT 58: Financial sync admin endpoints
  | "MERGE_CANDIDATES_ENABLED" // PROMPT 60: Merge candidates feature
  | "MERGE_CANDIDATES_CRON_ENABLED" // PROMPT 60: Merge candidates cron
  | "MERGE_ADMIN_ENABLED" // PROMPT 60: Merge admin UI
  | "NATIONAL_INGESTION_ENABLED" // PROMPT 61: National ingestion feature
  | "NATIONAL_INGESTION_CRON_ENABLED" // PROMPT 61: National ingestion cron
  | "NATIONAL_INGESTION_ADMIN_ENABLED"; // PROMPT 61: National ingestion admin UI

/**
 * Flags that default to DISABLED (fail-closed) for safety.
 */
const RISKY_FLAGS: Set<FeatureFlag> = new Set([
  "ENRICHMENT",
  "CRON_ENRICH",
  "CRON_RECALCULATE",
  "CRON_BILLING_RECONCILE",
  "NEWSLETTER_SENDS",
  "FLAG_INGEST_NATIONAL", // PROMPT 56: Fail-closed for safety
  "FLAG_UNIVERSE_INGEST", // PROMPT 57: Fail-closed for safety
  "FINANCIAL_SYNC_ENABLED", // PROMPT 58: Fail-closed for safety
  "FINANCIAL_SYNC_CRON_ENABLED", // PROMPT 58: Fail-closed for safety
  "MERGE_CANDIDATES_ENABLED", // PROMPT 60: Fail-closed for safety
  "MERGE_CANDIDATES_CRON_ENABLED", // PROMPT 60: Fail-closed for safety
  "NATIONAL_INGESTION_ENABLED", // PROMPT 61: Fail-closed for safety
  "NATIONAL_INGESTION_CRON_ENABLED", // PROMPT 61: Fail-closed for safety
]);

/**
 * Default value for a flag (true = enabled, false = disabled).
 */
function getDefaultValue(flag: FeatureFlag): boolean {
  return !RISKY_FLAGS.has(flag);
}

/**
 * Get flag value from KV with caching.
 * Cache TTL: 30 seconds.
 */
export const getFlag = cache(async (flag: FeatureFlag): Promise<boolean> => {
  try {
    const key = `flag:${flag}`;
    const value = await kv.get<boolean>(key);
    if (value === null) {
      // Not set in KV, return default
      return getDefaultValue(flag);
    }
    return value;
  } catch (error) {
    console.error(`[flags] Error reading flag ${flag}:`, error);
    // On error, return default (fail-safe)
    return getDefaultValue(flag);
  }
});

/**
 * Set flag value in KV.
 * Admin-only operation.
 */
export async function setFlag(flag: FeatureFlag, value: boolean): Promise<void> {
  try {
    const key = `flag:${flag}`;
    await kv.set(key, value);
    // Invalidate cache by setting a version marker
    await kv.set(`flag:version:${flag}`, Date.now());
  } catch (error) {
    console.error(`[flags] Error setting flag ${flag}:`, error);
    throw error;
  }
}

/**
 * Get all flags with their current values.
 */
export async function getAllFlags(): Promise<Record<FeatureFlag, boolean>> {
  const flags: FeatureFlag[] = [
    "PREMIUM_PAYWALLS",
    "FORECASTS",
    "ENRICHMENT",
    "ALERTS",
    "PLACEMENTS",
    "API_ACCESS",
    "NEWSLETTER_SENDS",
    "CRON_RECALCULATE",
    "CRON_ENRICH",
    "CRON_WEEKLY_DIGEST",
    "CRON_WATCHLIST_ALERTS",
    "CRON_BILLING_RECONCILE",
    "CRON_SNAPSHOT",
    "CRON_PROVIDERS_ENRICH",
    "CRON_INGEST_NATIONAL",
    "CRON_VERIFY_ANAF",
    "FLAG_INGEST_NATIONAL",
    "FLAG_UNIVERSE_INGEST",
    "INGEST_ENABLED",
    "READ_ONLY_MODE",
    "FINANCIAL_SYNC_ENABLED",
    "FINANCIAL_SYNC_CRON_ENABLED",
    "FINANCIAL_SYNC_ADMIN_ENABLED",
    "MERGE_CANDIDATES_ENABLED",
    "MERGE_CANDIDATES_CRON_ENABLED",
    "MERGE_ADMIN_ENABLED",
    "NATIONAL_INGESTION_ENABLED",
    "NATIONAL_INGESTION_CRON_ENABLED",
    "NATIONAL_INGESTION_ADMIN_ENABLED",
  ];

  const results = await Promise.all(flags.map(async (flag) => [flag, await getFlag(flag)] as const));
  return Object.fromEntries(results) as Record<FeatureFlag, boolean>;
}

/**
 * Check if a flag is enabled (with cache bypass for admin operations).
 */
export async function isFlagEnabled(flag: FeatureFlag, bypassCache = false): Promise<boolean> {
  if (bypassCache) {
    try {
      const key = `flag:${flag}`;
      const value = await kv.get<boolean>(key);
      return value ?? getDefaultValue(flag);
    } catch {
      return getDefaultValue(flag);
    }
  }
  return getFlag(flag);
}

