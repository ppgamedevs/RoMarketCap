/**
 * Fetch Founding Date from Web Sources
 * 
 * Searches Wikipedia and company websites to find the actual founding date.
 * Results are cached for 1 year since founding dates don't change.
 */

import { kv } from "@vercel/kv";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 365; // Cache for 1 year (founding dates don't change)
const NULL_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // Cache null results for 30 days

/**
 * Try to extract founding date from Wikipedia
 */
async function fetchFromWikipedia(companyName: string): Promise<Date | null> {
  try {
    // Wikipedia API: Search for company page (Romanian Wikipedia first)
    const searchUrl = `https://ro.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`;
    
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "RoMarketCap/1.0 (contact@romarketcap.ro)" },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    let data: any = null;
    let extract = "";

    if (response.ok) {
      data = await response.json();
      extract = data.extract || "";
    } else {
      // Try English Wikipedia as fallback
      const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`;
      const enResponse = await fetch(enUrl, {
        headers: { "User-Agent": "RoMarketCap/1.0 (contact@romarketcap.ro)" },
        signal: AbortSignal.timeout(5000),
      });
      
      if (enResponse.ok) {
        data = await enResponse.json();
        extract = data.extract || "";
      } else {
        return null;
      }
    }
    
    // Look for Romanian patterns: "înființat", "fondat", "înființată"
    const roPatterns = [
      /înființat(?:ă)?[\s\w,]*(\d{4})/i,
      /fondat(?:ă)?[\s\w,]*(\d{4})/i,
      /creat(?:ă)?[\s\w,]*(\d{4})/i,
      /(\d{4})[\s\w,]*înființat/i,
      /(\d{4})[\s\w,]*fondat/i,
    ];
    
    for (const pattern of roPatterns) {
      const match = extract.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          return new Date(year, 0, 1);
        }
      }
    }
    
    // Fallback: English patterns
    const enPatterns = [
      /(?:founded|established|created)[\s\w,]*(\d{4})/i,
      /(\d{4})[\s\w,]*founded/i,
      /(\d{4})[\s\w,]*established/i,
    ];
    
    for (const pattern of enPatterns) {
      const match = extract.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          return new Date(year, 0, 1);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[founding-date] Wikipedia error for ${companyName}:`, error);
    return null;
  }
}

/**
 * Try to extract founding date from company website
 */
async function fetchFromWebsite(website: string): Promise<Date | null> {
  if (!website) return null;
  
  try {
    // Normalize website URL
    let baseUrl = website.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Try common "About Us" page paths
    const aboutPaths = [
      "/despre-noi",
      "/about",
      "/despre",
      "/istoric",
      "/history",
      "/company",
      "/companie",
      "/en/about",
      "/ro/despre",
    ];
    
    for (const path of aboutPaths) {
      try {
        const url = `${baseUrl.replace(/\/$/, "")}${path}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; RoMarketCap/1.0; +https://romarketcap.ro)" },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        
        // Look for date patterns in HTML
        const patterns = [
          /(?:înființat|fondat|creat)[\s\w,]*(\d{4})/i,
          /(?:founded|established|created)[\s\w,]*(\d{4})/i,
          /(\d{4})[\s\w,]*înființat/i,
          /(\d{4})[\s\w,]*fondat/i,
          /(\d{4})[\s\w,]*founded/i,
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            const year = parseInt(match[1]);
            if (year >= 1800 && year <= new Date().getFullYear()) {
              return new Date(year, 0, 1);
            }
          }
        }
      } catch {
        continue; // Try next path
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[founding-date] Website error for ${website}:`, error);
    return null;
  }
}

/**
 * Main function to fetch founding date from multiple sources
 */
export async function fetchFoundingDate(
  companyName: string,
  website?: string | null,
  options: { skipCache?: boolean } = {}
): Promise<Date | null> {
  const cacheKey = `founding-date:${companyName.toLowerCase().trim()}`;
  
  // Check cache first
  if (!options.skipCache) {
    const cached = await kv.get<string>(cacheKey).catch(() => null);
    if (cached) {
      if (cached === "null") {
        return null; // Cached null result
      }
      const date = new Date(cached);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Try Wikipedia first (most reliable)
  let foundedAt = await fetchFromWikipedia(companyName);
  
  // Fallback to website if Wikipedia didn't work
  if (!foundedAt && website) {
    foundedAt = await fetchFromWebsite(website);
  }
  
  // Cache result (even if null, to avoid repeated lookups)
  if (foundedAt) {
    await kv.set(cacheKey, foundedAt.toISOString(), { ex: CACHE_TTL_SECONDS }).catch(() => null);
  } else {
    // Cache null for 30 days to avoid repeated failed lookups
    await kv.set(cacheKey, "null", { ex: NULL_CACHE_TTL_SECONDS }).catch(() => null);
  }
  
  return foundedAt;
}
