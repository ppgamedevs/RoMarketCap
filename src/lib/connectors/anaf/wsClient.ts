/**
 * PROMPT 58: ANAF Web Service Client (Safe Mode)
 * 
 * Fetches public financial statements from ANAF web service.
 * Uses strict timeouts, size limits, and retries with exponential backoff.
 */

import { withRetry } from "@/src/lib/retry/withRetry";

/**
 * ANAF Web Service endpoint for financial statements
 * Official public service: "Serviciu web pentru obtinerea informatiilor publice din situatiile financiare"
 * 
 * NOTE: This is a PLACEHOLDER endpoint (VAT service). Update ANAF_FINANCIALS_ENDPOINT
 * when the official financial statements endpoint is available.
 */
const ANAF_FINANCIALS_ENDPOINT = process.env.ANAF_FINANCIALS_ENDPOINT || 
  process.env.ANAF_WS_BILANT_URL || // Legacy support
  "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva"; // PLACEHOLDER: VAT service endpoint

const IS_PLACEHOLDER = !process.env.ANAF_FINANCIALS_ENDPOINT && !process.env.ANAF_WS_BILANT_URL;

/**
 * Request timeout (10 seconds)
 */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Maximum response size (1MB)
 */
const MAX_RESPONSE_SIZE = 1024 * 1024;

/**
 * Rate limit: 1 request per 2 seconds (very conservative)
 */
const RATE_LIMIT_MS = 2000;

/**
 * Check rate limit using KV
 */
async function checkRateLimit(): Promise<boolean> {
  const { kv } = await import("@vercel/kv");
  const lastRequestKey = "anaf:ws:last_request";
  
  try {
    const lastRequest = await kv.get<number>(lastRequestKey);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
      return false; // Rate limit exceeded
    }
    
    await kv.set(lastRequestKey, now, { ex: 60 }); // Expire after 60s
    return true;
  } catch (error) {
    console.error("[anaf-ws] Rate limit check failed:", error);
    // On error, allow request (fail-open for rate limit check)
    return true;
  }
}

/**
 * Fetch financial data from ANAF web service
 * 
 * @param cui Company CUI (normalized, digits only)
 * @returns Raw response from ANAF API
 */
export async function fetchFinancialsFromANAF(cui: string): Promise<unknown> {
  // Check rate limit
  const canProceed = await checkRateLimit();
  if (!canProceed) {
    throw new Error("Rate limit exceeded. Please wait before retrying.");
  }

  // Normalize CUI (remove RO prefix, ensure digits only)
  const normalizedCui = cui.replace(/^RO/i, "").replace(/\D/g, "");
  if (!normalizedCui || normalizedCui.length < 2 || normalizedCui.length > 10) {
    throw new Error(`Invalid CUI format: ${cui}`);
  }

  // Build request body
  // Note: ANAF financial statements service may require different format
  // This is a placeholder - adjust based on actual API documentation
  const requestBody = JSON.stringify([{
    cui: normalizedCui,
    data: new Date().toISOString().split("T")[0], // Current date
  }]);

  // Fetch with retry, timeout, and size limits
  const response = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        // Log endpoint (redact query params if any)
        const endpointUrl = new URL(ANAF_FINANCIALS_ENDPOINT);
        const safeUrl = `${endpointUrl.origin}${endpointUrl.pathname}`;
        if (IS_PLACEHOLDER) {
          console.warn("[anaf-ws] Using PLACEHOLDER endpoint for financial statements:", safeUrl);
        } else {
          console.log("[anaf-ws] Fetching from financial statements endpoint:", safeUrl);
        }

        const response = await fetch(ANAF_FINANCIALS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RoMarketCap/1.0",
          },
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`ANAF API error: ${response.status} ${response.statusText}`);
        }

        // Check content length
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
          throw new Error(`Response too large: ${contentLength} bytes`);
        }

        // Read response with size limit
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        let totalSize = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalSize += value.length;
          if (totalSize > MAX_RESPONSE_SIZE) {
            reader.cancel();
            throw new Error(`Response size exceeded limit: ${totalSize} bytes`);
          }

          chunks.push(value);
        }

        // Combine chunks
        const allChunks = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, offset);
          offset += chunk.length;
        }

        // Parse JSON
        const text = new TextDecoder().decode(allChunks);
        return JSON.parse(text);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timeout (10s)");
        }
        throw error;
      }
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2,
    }
  );

  if (!response || !Array.isArray(response) || response.length === 0) {
    throw new Error("Invalid ANAF API response: empty or not an array");
  }

  return response[0]; // Return first result
}

