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
 * Parse Romanian date format (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, or text formats)
 */
function parseRomanianDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  try {
    // Clean the string
    const cleaned = dateStr.trim().replace(/\s+/g, " ");

    // Try DD.MM.YYYY format (e.g., "24.12.1993")
    let match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(year)) {
        return date;
      }
    }

    // Try DD/MM/YYYY format (e.g., "24/12/1993")
    match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(year)) {
        return date;
      }
    }

    // Try YYYY-MM-DD format (e.g., "1993-12-24")
    match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(year)) {
        return date;
      }
    }

    // Try text format like "24 decembrie 1993" or "24 dec 1993"
    match = cleaned.match(/(\d{1,2})\s+(?:de\s+)?(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec)\.?\s+(\d{4})/i);
    if (match) {
      const [, day, monthName, year] = match;
      const monthMap: Record<string, number> = {
        "ianuarie": 1, "ian": 1,
        "februarie": 2, "feb": 2,
        "martie": 3, "mar": 3,
        "aprilie": 4, "apr": 4,
        "mai": 5,
        "iunie": 6, "iun": 6,
        "iulie": 7, "iul": 7,
        "august": 8, "aug": 8,
        "septembrie": 9, "sep": 9,
        "octombrie": 10, "oct": 10,
        "noiembrie": 11, "nov": 11,
        "decembrie": 12, "dec": 12,
      };
      const month = monthMap[monthName.toLowerCase()];
      if (month) {
        const date = new Date(parseInt(year), month - 1, parseInt(day));
        if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(year)) {
          return date;
        }
      }
    }

    // Try ISO format or Date.parse as last resort
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1800 && parsed.getFullYear() <= new Date().getFullYear() + 1) {
      return parsed;
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
/**
 * Extract text between HTML tags, handling various structures
 */
function extractFieldValue(html: string, labelPattern: string, valuePattern?: string): string | null {
  // Try multiple approaches
  const patterns = [
    // Pattern 1: <td>Label</td><td>Value</td>
    new RegExp(`<td[^>]*>${labelPattern}[^<]*<\\/td>\\s*<td[^>]*>([^<]+)<\\/td>`, "i"),
    // Pattern 2: <th>Label</th><td>Value</td>
    new RegExp(`<th[^>]*>${labelPattern}[^<]*<\\/th>\\s*<td[^>]*>([^<]+)<\\/td>`, "i"),
    // Pattern 3: <label>Label</label> followed by value
    new RegExp(`<label[^>]*>${labelPattern}[^<]*<\\/label>\\s*<[^>]*>([^<]+)<\\/[^>]*>`, "i"),
    // Pattern 4: <span>Label</span> followed by value
    new RegExp(`<span[^>]*>${labelPattern}[^<]*<\\/span>\\s*<[^>]*>([^<]+)<\\/[^>]*>`, "i"),
    // Pattern 5: <div>Label</div> followed by value
    new RegExp(`<div[^>]*>${labelPattern}[^<]*<\\/div>\\s*<[^>]*>([^<]+)<\\/[^>]*>`, "i"),
    // Pattern 6: Label: Value (simple text pattern)
    new RegExp(`${labelPattern}\\s*[:]\\s*([^<\\n]+)`, "i"),
    // Pattern 7: Label followed by value in next tag
    new RegExp(`${labelPattern}[^<]*>([^<]+)<`, "i"),
  ];

  if (valuePattern) {
    patterns.unshift(new RegExp(valuePattern, "i"));
  }

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value && value.length > 0 && value !== "-" && value !== "N/A" && value !== "n/a") {
        return value;
      }
    }
  }

  return null;
}

function parseMFinanteHTML(html: string, cui: string): MFinanteCompanyData | null {
  try {
    const data: MFinanteCompanyData = {
      cui,
      fetchedAt: new Date(),
    };

    // Extract company name (Denumire) - try multiple label variations
    const nameLabels = [
      "Denumire",
      "denumire",
      "Denumirea",
      "Nume",
      "nume",
      "Numele",
      "Denumirea societății",
      "Denumirea societatii",
    ];

    for (const label of nameLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.name = value;
        break;
      }
    }

    // Extract founding date (Data înființării) - PRIORITAR
    const foundingDateLabels = [
      "Data înființării",
      "Data infiintarii",
      "Data înființării:",
      "Data infiintarii:",
      "Data înființării societății",
      "Data infiintarii societatii",
      "Data constituirii",
      "Data constituirii:",
    ];

    for (const label of foundingDateLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        const parsed = parseRomanianDate(value);
        if (parsed) {
          data.foundingDate = parsed;
          break;
        }
      }
    }

    // Extract registration date (Data înregistrării)
    const regDateLabels = [
      "Data înregistrării",
      "Data inregistrarii",
      "Data înregistrării:",
      "Data inregistrarii:",
      "Data înregistrării la",
      "Data inregistrarii la",
    ];

    for (const label of regDateLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        const parsed = parseRomanianDate(value);
        if (parsed) {
          data.registrationDate = parsed;
          break;
        }
      }
    }

    // Extract registration number (Nr. înregistrare)
    const regNumberLabels = [
      "Nr\\.?\\s*înregistrare",
      "Nr\\.?\\s*inregistrare",
      "Număr înregistrare",
      "Numar inregistrare",
      "Nr\\.?\\s*înreg\\.",
      "Nr\\.?\\s*inreg\\.",
    ];

    for (const label of regNumberLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.registrationNumber = value;
        break;
      }
    }

    // Extract address (Adresă)
    const addressLabels = [
      "Adresă",
      "Adresa",
      "adresă",
      "adresa",
      "Adresă sediu",
      "Adresa sediu",
    ];

    for (const label of addressLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.address = value;
        break;
      }
    }

    // Extract phone (Telefon)
    const phoneLabels = [
      "Telefon",
      "telefon",
      "Tel\\.",
      "tel\\.",
      "Telefon:",
    ];

    for (const label of phoneLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.phone = value;
        break;
      }
    }

    // Extract email - try mailto links first
    const emailMatch = html.match(/<a[^>]*href="mailto:([^"]+)"[^>]*>/i);
    if (emailMatch && emailMatch[1]) {
      data.email = emailMatch[1].trim();
    } else {
      const emailLabels = ["Email", "email", "E-mail", "e-mail"];
      for (const label of emailLabels) {
        const value = extractFieldValue(html, label);
        if (value && value.includes("@")) {
          data.email = value;
          break;
        }
      }
    }

    // Extract website - try links first
    const websiteMatch = html.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
    if (websiteMatch && websiteMatch[1]) {
      data.website = websiteMatch[1].trim();
    } else {
      const websiteLabels = ["Website", "website", "Site", "site"];
      for (const label of websiteLabels) {
        const value = extractFieldValue(html, label);
        if (value && (value.startsWith("http://") || value.startsWith("https://"))) {
          data.website = value;
          break;
        }
      }
    }

    // Extract legal form (Forma juridică)
    const legalFormLabels = [
      "Forma juridică",
      "Forma juridica",
      "Forma juridică:",
      "Forma juridica:",
    ];

    for (const label of legalFormLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.legalForm = value;
        break;
      }
    }

    // Extract activity (Activitate)
    const activityLabels = [
      "Activitate",
      "activitate",
      "Activitate principală",
      "Activitate principala",
      "CAEN",
      "caen",
    ];

    for (const label of activityLabels) {
      const value = extractFieldValue(html, label);
      if (value) {
        data.activity = value;
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
