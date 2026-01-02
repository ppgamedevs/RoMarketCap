/**
 * Company Logo Fetching Service
 * 
 * Automatically fetches company logos using free services:
 * 1. Clearbit Logo API (primary) - https://logo.clearbit.com/{domain}
 * 2. Google Favicons (fallback) - https://www.google.com/s2/favicons?domain={domain}&sz=128
 * 
 * Features:
 * - Rate limiting (2 requests/second)
 * - KV caching (30 days)
 * - Automatic fallback chain
 * - Error handling and logging
 */

import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";

const CLEARBIT_API = "https://logo.clearbit.com";
const GOOGLE_FAVICON_API = "https://www.google.com/s2/favicons";
const RATE_LIMIT_KEY = "logo:rate_limit";
const RATE_LIMIT_MS = 500; // 2 requests per second
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type LogoCacheEntry = {
  url: string | null;
  source: "clearbit" | "google" | "failed";
  fetchedAt: string;
};

/**
 * Check and enforce rate limit
 */
async function checkRateLimit(): Promise<void> {
  try {
    const lastRequest = await kv.get<number>(RATE_LIMIT_KEY);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < RATE_LIMIT_MS) {
        const waitTime = RATE_LIMIT_MS - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    await kv.set(RATE_LIMIT_KEY, Date.now(), { ex: 2 });
  } catch (error) {
    console.warn("[logo-fetch] Rate limit check failed:", error);
    // Continue even if KV fails
  }
}

/**
 * Try to fetch logo from Clearbit
 * Returns logo URL if successful, null if not found
 */
async function tryClearbit(domain: string): Promise<string | null> {
  try {
    const url = `${CLEARBIT_API}/${domain}`;
    console.log(`[logo-fetch] Trying Clearbit for ${domain}...`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      // Don't follow redirects to check actual response
      redirect: "manual",
    });

    // Clearbit returns 200 with actual image, or 302/404 if not found
    if (response.status === 200) {
      const contentType = response.headers.get("content-type");
      if (contentType?.startsWith("image/")) {
        console.log(`[logo-fetch] ✓ Clearbit found logo for ${domain}`);
        return url;
      }
    }

    console.log(`[logo-fetch] Clearbit returned ${response.status} for ${domain}`);
    return null;
  } catch (error) {
    console.warn(`[logo-fetch] Clearbit error for ${domain}:`, error);
    return null;
  }
}

/**
 * Get logo from Google Favicons (always returns something)
 * This is the fallback, so we always return a URL
 */
function tryGoogleFavicon(domain: string): string {
  const url = `${GOOGLE_FAVICON_API}?domain=${encodeURIComponent(domain)}&sz=128`;
  console.log(`[logo-fetch] Using Google Favicon for ${domain}`);
  return url;
}

/**
 * Extract domain from website URL
 * Handles various URL formats (with/without protocol, trailing slashes, etc.)
 */
export function extractDomain(website: string): string | null {
  try {
    let url = website.trim();
    
    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Remove www. prefix
    return hostname.replace(/^www\./, "");
  } catch (error) {
    console.warn(`[logo-fetch] Failed to parse website URL: ${website}`, error);
    return null;
  }
}

/**
 * Main function to fetch company logo
 * 
 * @param domain - Company domain (e.g., "bitdefender.com")
 * @param options - Fetch options
 * @returns Logo URL or null if all services fail
 */
export async function fetchCompanyLogo(
  domain: string,
  options: { skipCache?: boolean } = {}
): Promise<string | null> {
  const cacheKey = `logo:cache:${domain}`;

  // Check cache first
  if (!options.skipCache) {
    try {
      const cached = await kv.get<LogoCacheEntry>(cacheKey);
      if (cached) {
        console.log(`[logo-fetch] Cache hit for ${domain} (source: ${cached.source})`);
        return cached.url;
      }
    } catch (error) {
      console.warn(`[logo-fetch] Cache read failed for ${domain}:`, error);
    }
  }

  // Enforce rate limit
  await checkRateLimit();

  let logoUrl: string | null = null;
  let source: "clearbit" | "google" | "failed" = "failed";

  try {
    // Try Clearbit first (better quality)
    logoUrl = await tryClearbit(domain);
    
    if (logoUrl) {
      source = "clearbit";
    } else {
      // Fallback to Google Favicons
      logoUrl = tryGoogleFavicon(domain);
      source = "google";
    }

    // Cache result
    try {
      const cacheEntry: LogoCacheEntry = {
        url: logoUrl,
        source,
        fetchedAt: new Date().toISOString(),
      };
      await kv.set(cacheKey, cacheEntry, { ex: CACHE_TTL_SECONDS });
      console.log(`[logo-fetch] Cached logo for ${domain} (source: ${source})`);
    } catch (error) {
      console.warn(`[logo-fetch] Cache write failed for ${domain}:`, error);
    }

    return logoUrl;
  } catch (error) {
    console.error(`[logo-fetch] Error fetching logo for ${domain}:`, error);
    Sentry.captureException(error, {
      tags: { component: "logo-fetch", domain },
    });
    return null;
  }
}

/**
 * Fetch logos for multiple domains
 * Uses rate limiting between requests
 */
export async function fetchCompanyLogos(
  domains: string[],
  options: { skipCache?: boolean } = {}
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  console.log(`[logo-fetch] Fetching logos for ${domains.length} domains...`);

  for (const domain of domains) {
    try {
      const logoUrl = await fetchCompanyLogo(domain, options);
      results.set(domain, logoUrl);
    } catch (error) {
      console.error(`[logo-fetch] Failed to fetch logo for ${domain}:`, error);
      results.set(domain, null);
    }
  }

  console.log(`[logo-fetch] Successfully fetched ${results.size}/${domains.length} logos`);
  return results;
}

/**
 * Clear cache for a specific domain or all domains
 */
export async function clearLogoCache(domain?: string): Promise<void> {
  try {
    if (domain) {
      await kv.del(`logo:cache:${domain}`);
      console.log(`[logo-fetch] Cleared cache for ${domain}`);
    } else {
      console.log(`[logo-fetch] Cache clear for all domains not implemented (use TTL expiration)`);
    }
  } catch (error) {
    console.error("[logo-fetch] Cache clear failed:", error);
  }
}
