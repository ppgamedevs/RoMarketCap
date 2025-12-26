/**
 * ANAF (Agenția Națională de Administrare Fiscală) Verification Connector
 * 
 * SAFE MODE: Conservative rate limiting, aggressive caching, no retry storms
 */

import { kv } from "@vercel/kv";
import { normalizeCUI } from "../ingestion/cuiValidation";

export type ANAFVerificationResult = {
  isActive: boolean;
  isVatRegistered: boolean;
  lastReportedYear: number | null;
  verifiedAt: Date;
  rawResponse: unknown;
  errorMessage?: string;
  verificationStatus: "SUCCESS" | "ERROR" | "PENDING";
};

// PROMPT 52: Rate limiting: 1 request per second
const RATE_LIMIT_MS = 1000;
// Aggressive caching: 90 days default
const DEFAULT_CACHE_TTL_DAYS = 90;
const CACHE_TTL_SECONDS = DEFAULT_CACHE_TTL_DAYS * 24 * 60 * 60;

// ANAF API endpoint (public, read-only)
// Note: This is a placeholder - replace with actual ANAF API endpoint if available
const ANAF_API_BASE = process.env.ANAF_API_URL || "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva";

/**
 * Get cache key for a CUI
 */
function getCacheKey(cui: string): string {
  const normalized = normalizeCUI(cui);
  return `anaf:verification:${normalized}`;
}

/**
 * Check if we should skip verification (rate limit)
 */
async function checkRateLimit(): Promise<boolean> {
  const lastRequestKey = "anaf:last_request";
  const lastRequest = await kv.get<number>(lastRequestKey).catch(() => null);
  
  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < RATE_LIMIT_MS) {
      return false; // Rate limited
    }
  }
  
  await kv.set(lastRequestKey, Date.now(), { ex: 60 }).catch(() => null);
  return true;
}

/**
 * Fetch verification from cache
 */
export async function getCachedVerification(cui: string): Promise<ANAFVerificationResult | null> {
  const cacheKey = getCacheKey(cui);
  const cached = await kv.get<string>(cacheKey).catch(() => null);
  
  if (!cached) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(cached);
    return {
      ...parsed,
      verifiedAt: new Date(parsed.verifiedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Cache verification result
 */
async function cacheVerification(cui: string, result: ANAFVerificationResult): Promise<void> {
  const cacheKey = getCacheKey(cui);
  const serialized = JSON.stringify({
    ...result,
    verifiedAt: result.verifiedAt.toISOString(),
  });
  
  await kv.set(cacheKey, serialized, { ex: CACHE_TTL_SECONDS }).catch(() => null);
}

/**
 * Verify company with ANAF API
 * 
 * SAFE MODE:
 * - Checks rate limit before making request
 * - Checks cache first
 * - No retries on failure
 * - Returns error gracefully
 */
export async function verifyCompanyANAF(cui: string): Promise<ANAFVerificationResult> {
  const normalized = normalizeCUI(cui);
  if (!normalized) {
    return {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date(),
      rawResponse: null,
      errorMessage: "Invalid CUI",
      verificationStatus: "ERROR",
    };
  }

  // Check cache first
  const cached = await getCachedVerification(normalized);
  if (cached) {
    return cached;
  }

  // Check rate limit
  const canProceed = await checkRateLimit();
  if (!canProceed) {
    return {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date(),
      rawResponse: null,
      errorMessage: "Rate limit exceeded",
      verificationStatus: "PENDING",
    };
  }

  // Make API request
  try {
    // ANAF API expects JSON array with CUI
    const requestBody = JSON.stringify([{ cui: normalized, data: new Date().toISOString().split("T")[0] }]);
    
    const response = await fetch(ANAF_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "RoMarketCap/1.0",
      },
      body: requestBody,
      // Conservative timeout
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      throw new Error(`ANAF API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json().catch(() => null);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid ANAF API response");
    }

    const result = data[0];
    
    // Parse ANAF response
    // Note: Adjust parsing based on actual ANAF API response format
    const isActive = result.valid === true || result.valid === "true" || result.status === "ACTIV";
    const isVatRegistered = result.tva === true || result.tva === "true" || result.platitor === true;
    const lastReportedYear = result.dataInceputTva ? new Date(result.dataInceputTva).getFullYear() : null;

    const verificationResult: ANAFVerificationResult = {
      isActive,
      isVatRegistered,
      lastReportedYear,
      verifiedAt: new Date(),
      rawResponse: result,
      verificationStatus: "SUCCESS",
    };

    // Cache result
    await cacheVerification(normalized, verificationResult);

    return verificationResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Don't cache errors - allow retry after cache expires
    return {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date(),
      rawResponse: null,
      errorMessage,
      verificationStatus: "ERROR",
    };
  }
}

/**
 * Check if verification is stale (older than TTL)
 */
export function isVerificationStale(verifiedAt: Date, ttlDays: number = DEFAULT_CACHE_TTL_DAYS): boolean {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() - verifiedAt.getTime() > ttlMs;
}

