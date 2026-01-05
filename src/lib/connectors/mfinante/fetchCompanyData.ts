/**
 * MFinante.gov.ro Connector
 * 
 * Fetches company data including founding date from mfinante.gov.ro
 * Uses responsible scraping with rate limiting and caching
 */

import { kv } from "@vercel/kv";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // Cache for 30 days (official data doesn't change often)
const NULL_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // Cache null results for 7 days
const RATE_LIMIT_MS = 2000; // 2 seconds between requests (very conservative)
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout

export type MFinanteCompanyData = {
  cui: string;
  name?: string;
  foundingDate?: Date;
  registrationDate?: Date;
  registrationNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  legalForm?: string;
  activity?: string;
  fetchedAt: Date;
};

/**
 * Check rate limit before making request
 */
async function checkRateLimit(): Promise<boolean> {
  try {
    const lastRequest = await kv.get<number>("mfinante:last_request").catch(() => null);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < RATE_LIMIT_MS) {
        return false; // Rate limited
      }
    }
    return true;
  } catch {
    return true; // If KV fails, allow request (fail-open)
  }
}

/**
 * Update rate limit timestamp
 */
async function updateRateLimit(): Promise<void> {
  try {
    await kv.set("mfinante:last_request", Date.now(), { ex: 60 });
  } catch {
    // Ignore KV errors
  }
}

/**
 * Parse Romanian date format (DD.MM.YYYY or DD/MM/YYYY)
 */
function parseRomanianDate(dateStr: string): Date | null {
  try {
    // Try DD.MM.YYYY format
    let match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try DD/MM/YYYY format
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try YYYY-MM-DD format
    match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse HTML from mfinante.gov.ro to extract company data
 * 
 * Note: This uses regex patterns. The actual HTML structure needs to be verified
 * by inspecting the real website. These patterns are educated guesses based on
 * common Romanian government website structures.
 */
function parseMFinanteHTML(html: string, cui: string): MFinanteCompanyData | null {
  try {
    const data: MFinanteCompanyData = {
      cui,
      fetchedAt: new Date(),
    };

    // Extract company name (Denumire)
    // Try multiple patterns as HTML structure may vary
    const namePatterns = [
      /<td[^>]*>Denumire[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Denumire[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Denumire[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.name = match[1].trim();
        break;
      }
    }

    // Extract founding date (Data înființării) - PRIORITAR
    const foundingDatePatterns = [
      /<td[^>]*>Data înființării[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Data înființării[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Data înființării[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Data\s+înființării[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of foundingDatePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsed = parseRomanianDate(dateStr);
        if (parsed) {
          data.foundingDate = parsed;
          break;
        }
      }
    }

    // Extract registration date (Data înregistrării)
    const regDatePatterns = [
      /<td[^>]*>Data înregistrării[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Data înregistrării[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Data înregistrării[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of regDatePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsed = parseRomanianDate(dateStr);
        if (parsed) {
          data.registrationDate = parsed;
          break;
        }
      }
    }

    // Extract registration number (Nr. înregistrare)
    const regNumberPatterns = [
      /<td[^>]*>Nr\.?\s*înregistrare[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Nr\.?\s*înregistrare[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Nr\.?\s*înregistrare[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of regNumberPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.registrationNumber = match[1].trim();
        break;
      }
    }

    // Extract address (Adresă)
    const addressPatterns = [
      /<td[^>]*>Adresă[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Adresă[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Adresă[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.address = match[1].trim();
        break;
      }
    }

    // Extract phone (Telefon)
    const phonePatterns = [
      /<td[^>]*>Telefon[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Telefon[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Telefon[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of phonePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.phone = match[1].trim();
        break;
      }
    }

    // Extract email
    const emailPatterns = [
      /<td[^>]*>Email[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Email[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /<a[^>]*href="mailto:([^"]+)"[^>]*>/i,
    ];

    for (const pattern of emailPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.email = match[1].trim();
        break;
      }
    }

    // Extract website
    const websitePatterns = [
      /<td[^>]*>Website[^<]*<\/td>\s*<td[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/td>/i,
      /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>Website/i,
      /Website[^<]*<a[^>]*href="([^"]+)"[^>]*>/i,
    ];

    for (const pattern of websitePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.website = match[1].trim();
        break;
      }
    }

    // Extract legal form (Forma juridică)
    const legalFormPatterns = [
      /<td[^>]*>Forma juridică[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Forma juridică[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Forma juridică[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of legalFormPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.legalForm = match[1].trim();
        break;
      }
    }

    // Extract activity (Activitate)
    const activityPatterns = [
      /<td[^>]*>Activitate[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
      /<label[^>]*>Activitate[^<]*<\/label>\s*<[^>]*>([^<]+)<\/[^>]*>/i,
      /Activitate[^<]*<[^>]*>([^<]+)<\/[^>]*>/i,
    ];

    for (const pattern of activityPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        data.activity = match[1].trim();
        break;
      }
    }

    return data;
  } catch (error) {
    console.error("[mfinante] Error parsing HTML:", error);
    return null;
  }
}

/**
 * Fetch company data from mfinante.gov.ro
 * 
 * URL format: https://mfinante.gov.ro/apps/infocodfiscal.html?cod={CUI}
 * 
 * @param cui - Company CUI (with or without RO prefix)
 * @param options - Options including skipCache
 * @returns Company data or null if not found/error
 */
export async function fetchCompanyDataFromMFinante(
  cui: string,
  options: { skipCache?: boolean } = {}
): Promise<MFinanteCompanyData | null> {
  // Normalize CUI (remove RO prefix if present)
  const normalizedCui = cui.replace(/^RO/i, "").trim();
  const cacheKey = `mfinante:${normalizedCui}`;

  // Check cache first
  if (!options.skipCache) {
    try {
      const cached = await kv.get<string>(cacheKey);
      if (cached) {
        if (cached === "null") {
          return null; // Cached null result
        }
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          foundingDate: parsed.foundingDate ? new Date(parsed.foundingDate) : undefined,
          registrationDate: parsed.registrationDate ? new Date(parsed.registrationDate) : undefined,
          fetchedAt: new Date(parsed.fetchedAt),
        };
      }
    } catch {
      // If cache fails, continue
    }
  }

  // Check rate limit
  const canProceed = await checkRateLimit();
  if (!canProceed) {
    throw new Error("Rate limit: Please wait 2 seconds before making another request to mfinante.gov.ro");
  }

  try {
    // Fetch from mfinante.gov.ro
    const url = `https://mfinante.gov.ro/apps/infocodfiscal.html?cod=${encodeURIComponent(normalizedCui)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RoMarketCap/1.0; +https://romarketcap.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML to extract company data
    const data = parseMFinanteHTML(html, normalizedCui);

    // Debug: Log if no data found
    if (!data || (!data.foundingDate && !data.registrationDate && !data.name)) {
      console.log(`[mfinante] Warning: No data extracted from HTML for CUI ${normalizedCui}. HTML length: ${html.length}`);
      // Log a sample of the HTML for debugging (first 500 chars)
      console.log(`[mfinante] HTML sample (first 500 chars): ${html.substring(0, 500)}`);
    }

    // Update rate limit
    await updateRateLimit();

    // Cache result (even if null, to avoid repeated lookups)
    if (data) {
      try {
        await kv.set(cacheKey, JSON.stringify({
          ...data,
          foundingDate: data.foundingDate?.toISOString(),
          registrationDate: data.registrationDate?.toISOString(),
          fetchedAt: data.fetchedAt.toISOString(),
        }), { ex: CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
    } else {
      // Cache null result for shorter period
      try {
        await kv.set(cacheKey, "null", { ex: NULL_CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
    }

    return data;
  } catch (error) {
    // Handle abort (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout: mfinante.gov.ro took too long to respond");
    }

    console.error(`[mfinante] Error fetching data for CUI ${normalizedCui}:`, error);
    throw error;
  }
}
