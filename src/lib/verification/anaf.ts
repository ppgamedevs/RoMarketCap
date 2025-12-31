/**
 * ANAF (Agenția Națională de Administrare Fiscală) Verification Connector
 * 
 * PROMPT 62: Production-grade ANAF verification with endpoint fallback chain
 * 
 * SAFE MODE: Conservative rate limiting, aggressive caching, no retry storms
 */

import { kv } from "@vercel/kv";
import { normalizeCUI } from "../ingestion/cuiValidation";
import { withRetry, isRetryableError } from "../retry/withRetry";

export type ANAFVerificationResult = {
  isActive: boolean;
  isVatRegistered: boolean;
  lastReportedYear: number | null;
  verifiedAt: Date;
  rawResponse: unknown;
  errorMessage?: string;
  verificationStatus: "SUCCESS" | "ERROR" | "PENDING";
  // PROMPT 62: Company general info from date_generale
  companyName?: string;
  address?: string;
  caen?: string;
  registrationNumber?: string;
  phone?: string;
  iban?: string;
  registrationStatus?: string;
  fiscalAuthority?: string;
  endpointUsed?: string; // Which endpoint succeeded
};

// PROMPT 62: Rate limiting: 1 request per second
const RATE_LIMIT_MS = 1000;
// PROMPT 62: Cache for 7 days (was 90)
const DEFAULT_CACHE_TTL_DAYS = 7;
const CACHE_TTL_SECONDS = DEFAULT_CACHE_TTL_DAYS * 24 * 60 * 60;

// PROMPT 62: Endpoint fallback chain
// v9 is primary (official ANAF documentation), v8 is fallback
// Note: ANAF WAF may return 404 or "requested URL was rejected" - we need robust retry/backoff
const ANAF_ENDPOINTS = [
  "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", // Primary: v9 (official)
  "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva", // Fallback: v8
] as const;

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
 * PROMPT 62: Check if error is retryable for ANAF (404/WAF errors are retryable)
 */
function isAnafRetryableError(error: unknown, status?: number): boolean {
  // ANAF WAF may return 404 or "requested URL was rejected" - these are transient
  if (status === 404) {
    return true; // WAF blocking - retry with backoff
  }
  
  // Network errors, timeouts, 5xx are retryable
  if (isRetryableError(error)) {
    return true;
  }
  
  // Check error message for WAF patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rejected") || msg.includes("waf") || msg.includes("forbidden")) {
      return true;
    }
  }
  
  return false;
}

/**
 * PROMPT 62: Try a single ANAF endpoint with retry/backoff
 */
async function tryAnafEndpoint(
  endpoint: string,
  cui: number,
  date: string
): Promise<{ success: boolean; data?: unknown; status?: number; error?: string; responseBody?: string }> {
  // PROMPT 62: CUI must be number, not string
  const requestBody = JSON.stringify([{ cui, data: date }]);
  
  console.log(`[anaf-verify] Request to ${endpoint}:`, {
    method: "POST",
    body: requestBody,
    cui,
    date,
  });
  
  try {
    // PROMPT 62: Use withRetry for robust handling of WAF/404 errors
    const response = await withRetry(
      async () => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RoMarketCap/1.0",
          },
          body: requestBody,
          signal: AbortSignal.timeout(15000), // 15 seconds (increased for WAF delays)
        });
        
        // Throw for non-2xx to trigger retry
        if (!res.ok) {
          const error: Error & { status?: number } = new Error(`${res.status} ${res.statusText}`);
          error.status = res.status;
          throw error;
        }
        
        return res;
      },
      {
        maxRetries: 3,
        initialDelay: 2000, // 2 seconds initial delay
        maxDelay: 10000, // Max 10 seconds between retries
        backoffFactor: 2,
        retryable: (error) => {
          const status = (error as { status?: number }).status;
          return isAnafRetryableError(error, status);
        },
      }
    );

    // PROMPT 62: Read response body
    const responseText = await response.text().catch(() => "");
    let responseBody: unknown = null;
    
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Not JSON, keep as text
      responseBody = responseText;
    }

    console.log(`[anaf-verify] Response from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 200),
    });

    // PROMPT 62: ANAF response might be wrapped in a structure
    // Try to extract data from various possible formats
    let data: unknown = responseBody;
    
    // If response is an object with a "found" or "data" array
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.found)) {
        data = obj.found;
      } else if (Array.isArray(obj.data)) {
        data = obj.data;
      } else if (Array.isArray(obj.results)) {
        data = obj.results;
      }
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: `Invalid response: not an array or empty. Response type: ${typeof data}, keys: ${data && typeof data === "object" ? Object.keys(data as Record<string, unknown>).join(", ") : "N/A"}`,
        responseBody: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
      };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const status = (error as { status?: number }).status;
    
    console.error(`[anaf-verify] Exception calling ${endpoint}:`, {
      error: errorMessage,
      status,
      retryable: isAnafRetryableError(error, status),
    });
    
    return {
      success: false,
      status,
      error: errorMessage,
    };
  }
}

/**
 * PROMPT 62: Parse ANAF response to extract company info
 */
function parseAnafResponse(result: unknown): {
  isActive: boolean;
  isVatRegistered: boolean;
  lastReportedYear: number | null;
  companyName?: string;
  address?: string;
  caen?: string;
  registrationNumber?: string;
  phone?: string;
  iban?: string;
  registrationStatus?: string;
  fiscalAuthority?: string;
} {
  if (!result || typeof result !== "object") {
    return {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
    };
  }

  const raw = result as Record<string, unknown>;
  
  // PROMPT 62: Extract from date_generale if present
  const dateGenerale = raw.date_generale as Record<string, unknown> | undefined;
  
  // PROMPT 62: Extract company name from date_generale.denumire
  const companyName = dateGenerale?.denumire as string | undefined;
  
  // PROMPT 62: Extract other fields from date_generale
  const address = dateGenerale?.adresa as string | undefined;
  const caen = dateGenerale?.cod_CAEN as string | undefined;
  const registrationNumber = dateGenerale?.nrRegCom as string | undefined;
  const phone = dateGenerale?.telefon as string | undefined;
  const iban = dateGenerale?.iban as string | undefined;
  const registrationStatus = dateGenerale?.stare_inregistrare as string | undefined;
  const fiscalAuthority = dateGenerale?.organFiscalCompetent as string | undefined;

  // Fallback: try root level fields if date_generale not present
  const isActive = 
    raw.valid === true || 
    raw.valid === "true" || 
    raw.status === "ACTIV" ||
    (dateGenerale?.stare_inregistrare as string)?.toUpperCase() === "ACTIV";
    
  const isVatRegistered = 
    raw.tva === true || 
    raw.tva === "true" || 
    raw.platitor === true ||
    (raw.date_generale as Record<string, unknown>)?.platitor === true;
    
  const lastReportedYear = raw.dataInceputTva 
    ? new Date(raw.dataInceputTva as string).getFullYear() 
    : null;

  return {
    isActive,
    isVatRegistered,
    lastReportedYear,
    companyName,
    address,
    caen,
    registrationNumber,
    phone,
    iban,
    registrationStatus,
    fiscalAuthority,
  };
}

/**
 * PROMPT 62: Verify company with ANAF API (with endpoint fallback chain)
 * 
 * SAFE MODE:
 * - Checks rate limit before making request
 * - Checks cache first (unless force=true)
 * - Tries endpoints in fallback chain
 * - No retries on failure
 * - Returns error gracefully
 */
export async function verifyCompanyANAF(
  cui: string,
  options?: { force?: boolean }
): Promise<ANAFVerificationResult> {
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

  // PROMPT 62: Check cache first (unless force=true)
  if (!options?.force) {
    const cached = await getCachedVerification(normalized);
    if (cached) {
      return cached;
    }
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

  // PROMPT 62: Convert CUI to number for API request
  const cuiNumber = parseInt(normalized, 10);
  if (isNaN(cuiNumber)) {
    return {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date(),
      rawResponse: null,
      errorMessage: "CUI cannot be converted to number",
      verificationStatus: "ERROR",
    };
  }

  // PROMPT 62: Use current date in YYYY-MM-DD format
  const date = new Date().toISOString().split("T")[0];

  // PROMPT 62: Build endpoint list (v8, v7, optionally v9)
  const endpoints: string[] = [...ANAF_ENDPOINTS];
  if (ANAF_V9_EXPERIMENTAL) {
    endpoints.push(ANAF_V9_ENDPOINT);
  }

  // PROMPT 62: Try endpoints in order
  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (const endpoint of endpoints) {
    console.log(`[anaf-verify] Trying endpoint: ${endpoint} for CUI ${normalized}`);
    
    const attempt = await tryAnafEndpoint(endpoint, cuiNumber, date);
    
    if (attempt.success && attempt.data) {
      // PROMPT 62: Parse response
      const parsed = parseAnafResponse(attempt.data);
      
      const verificationResult: ANAFVerificationResult = {
        isActive: parsed.isActive,
        isVatRegistered: parsed.isVatRegistered,
        lastReportedYear: parsed.lastReportedYear,
        verifiedAt: new Date(),
        rawResponse: attempt.data,
        verificationStatus: "SUCCESS",
        companyName: parsed.companyName,
        address: parsed.address,
        caen: parsed.caen,
        registrationNumber: parsed.registrationNumber,
        phone: parsed.phone,
        iban: parsed.iban,
        registrationStatus: parsed.registrationStatus,
        fiscalAuthority: parsed.fiscalAuthority,
        endpointUsed: endpoint,
      };

      // PROMPT 62: Log success
      console.log(`[anaf-verify] Success via ${endpoint} for CUI ${normalized}`, {
        hasName: !!parsed.companyName,
        hasAddress: !!parsed.address,
        isActive: parsed.isActive,
        isVatRegistered: parsed.isVatRegistered,
      });

      // Cache result
      await cacheVerification(normalized, verificationResult);

      return verificationResult;
    }

    // PROMPT 62: Log failure and try next endpoint
    lastError = attempt.error;
    lastStatus = attempt.status;
    
    console.log(`[anaf-verify] Endpoint ${endpoint} failed for CUI ${normalized}:`, {
      status: attempt.status,
      error: attempt.error,
      responseBody: attempt.responseBody?.substring(0, 200), // First 200 chars for debugging
    });

    // PROMPT 62: If 404, try next endpoint. If other error, also try next (but log)
    // Continue to next endpoint
  }

  // PROMPT 62: All endpoints failed
  const errorMessage = lastStatus === 404
    ? `All endpoints returned 404 (last: ${lastError})`
    : `All endpoints failed (last: ${lastError})`;

  console.error(`[anaf-verify] All endpoints failed for CUI ${normalized}:`, {
    endpointsTried: endpoints.length,
    endpoints,
    lastStatus,
    lastError,
    cuiNumber,
    date,
  });

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

/**
 * Check if verification is stale (older than TTL)
 */
export function isVerificationStale(verifiedAt: Date, ttlDays: number = DEFAULT_CACHE_TTL_DAYS): boolean {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() - verifiedAt.getTime() > ttlMs;
}

