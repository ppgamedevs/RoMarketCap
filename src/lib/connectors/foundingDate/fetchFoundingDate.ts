/**
 * Fetch Founding Date from Web Sources
 * 
 * Searches Wikipedia and company websites to find the actual founding date.
 * Results are cached for 1 year since founding dates don't change.
 */

import { kv } from "@vercel/kv";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";
import { fetchCompanyDataFromMFinante } from "@/src/lib/connectors/mfinante/fetchCompanyData";
import { isFlagEnabled } from "@/src/lib/flags/flags";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 365; // Cache for 1 year (founding dates don't change)
const NULL_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // Cache null results for 30 days

/**
 * Try to extract founding date from Wikipedia
 */
async function fetchFromWikipedia(companyName: string): Promise<Date | null> {
  try {
    // Clean company name - remove common suffixes and legal forms
    // Also remove parenthetical content like "(Allview)" or "PLC"
    let cleanName = companyName
      .replace(/\s*\([^)]*\)/g, "") // Remove parenthetical content like "(Allview)"
      .replace(/\s+(SA|SCS|SRL|PFA|SNC|SCA|INC|LTD|LLC|PLC)$/i, "") // Remove legal form
      .replace(/\s+(Romania|România)$/i, "") // Remove "Romania" suffix
      .trim();
    
    // Generate search variants
    const searchVariants: string[] = [cleanName];
    
    // If name is long, try shorter versions
    const words = cleanName.split(/\s+/);
    if (words.length > 2) {
      // Try first 2 words (brand name)
      searchVariants.push(words.slice(0, 2).join(" "));
      // Try first word only (if it's a known brand)
      if (words.length > 1) {
        searchVariants.push(words[0]!);
      }
    }
    
    // Try each variant until we find a match
    let data: any = null;
    let extract = "";
    
    for (const variant of searchVariants) {
      // Wikipedia API: Search for company page (Romanian Wikipedia first)
      const searchUrl = `https://ro.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variant)}`;
      
      console.log(`[founding-date] Searching Wikipedia: ${searchUrl}`);
      
      const response = await fetch(searchUrl, {
        headers: { "User-Agent": "RoMarketCap/1.0 (contact@romarketcap.ro)" },
        signal: AbortSignal.timeout(3000), // 3 second timeout (reduced to speed up)
      });

      console.log(`[founding-date] Wikipedia RO response status: ${response.status}`);

      if (response.ok) {
        data = await response.json();
        extract = data.extract || "";
        console.log(`[founding-date] Wikipedia RO extract length: ${extract.length} chars`);
        break; // Found a page - stop trying variants
      } else {
        // Try English Wikipedia as fallback for this variant
        const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variant)}`;
        console.log(`[founding-date] Trying English Wikipedia: ${enUrl}`);
        
        const enResponse = await fetch(enUrl, {
          headers: { "User-Agent": "RoMarketCap/1.0 (contact@romarketcap.ro)" },
          signal: AbortSignal.timeout(3000), // 3 second timeout (reduced to speed up)
        });
        
        console.log(`[founding-date] Wikipedia EN response status: ${enResponse.status}`);
        
        if (enResponse.ok) {
          data = await enResponse.json();
          extract = data.extract || "";
          console.log(`[founding-date] Wikipedia EN extract length: ${extract.length} chars`);
          break; // Found a page - stop trying variants
        }
      }
    }
    
    // If we didn't find any Wikipedia page, return null
    if (!extract) {
      console.log(`[founding-date] No Wikipedia page found for "${companyName}" (tried variants: ${searchVariants.join(", ")})`);
      return null;
    }
    
    // Look for Romanian patterns: "înființat", "fondat", "înființată"
    // Patterns must handle: "fondată ... în anul 1996", "fondată în 1996", "înființată în 1996", etc.
    const roPatterns = [
      /înființat(?:ă)?[\s\w,]*în\s+anul\s+(\d{4})/i, // "înființată în anul 1996"
      /fondat(?:ă)?[\s\w,]*în\s+anul\s+(\d{4})/i, // "fondată în anul 1996" - PRIORITATE
      /creat(?:ă)?[\s\w,]*în\s+anul\s+(\d{4})/i, // "creată în anul 1996"
      /înființat(?:ă)?[\s\w,]*în\s+(\d{4})/i, // "înființată în 1996"
      /fondat(?:ă)?[\s\w,]*în\s+(\d{4})/i, // "fondată în 1996"
      /creat(?:ă)?[\s\w,]*în\s+(\d{4})/i, // "creată în 1996"
      /înființat(?:ă)?[\s\w,]*(\d{4})/i, // "înființată 1996"
      /fondat(?:ă)?[\s\w,]*(\d{4})/i, // "fondată 1996"
      /creat(?:ă)?[\s\w,]*(\d{4})/i, // "creată 1996"
      /(\d{4})[\s\w,]*înființat/i, // "1996 ... înființat"
      /(\d{4})[\s\w,]*fondat/i, // "1996 ... fondat"
      /în\s+anul\s+(\d{4})[\s\w,]*fondat/i, // "în anul 1996 ... fondat"
      /în\s+anul\s+(\d{4})[\s\w,]*înființat/i, // "în anul 1996 ... înființat"
    ];
    
    for (const pattern of roPatterns) {
      const match = extract.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          console.log(`[founding-date] Found year ${year} using pattern: ${pattern}`);
          return new Date(year, 0, 1);
        }
      }
    }
    
    // Fallback: English patterns
    const enPatterns = [
      /(?:founded|established|created|launched)[\s\w,]*in\s+the\s+year\s+(\d{4})/i, // "founded in the year 1997"
      /(?:founded|established|created|launched)[\s\w,]*in\s+(\d{4})/i, // "founded in 1997", "launched in April 1997"
      /(?:founded|established|created|launched)[\s\w,]*(\d{4})/i, // "founded 1997"
      /(\d{4})[\s\w,]*founded/i, // "1997 ... founded"
      /(\d{4})[\s\w,]*established/i, // "1997 ... established"
      /founded in (\d{4})/i,
      /established in (\d{4})/i,
      /launched in [\w\s,]*(\d{4})/i, // "launched in April 1997"
    ];
    
    for (const pattern of enPatterns) {
      const match = extract.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1800 && year <= new Date().getFullYear()) {
          console.log(`[founding-date] Found year ${year} using pattern: ${pattern}`);
          return new Date(year, 0, 1);
        }
      }
    }
    
    console.log(`[founding-date] No founding date pattern found in extract (first 200 chars: ${extract.substring(0, 200)})`);
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
          signal: AbortSignal.timeout(3000), // 3 second timeout (reduced to speed up)
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
  
  console.log(`[founding-date] Starting search for "${companyName}" (website: ${website || "none"})`);
  
  // Try Wikipedia first (most reliable)
  let foundedAt = await fetchFromWikipedia(companyName);
  console.log(`[founding-date] Wikipedia result for "${companyName}":`, foundedAt ? foundedAt.toISOString() : "not found");
  
  // Fallback to website if Wikipedia didn't work (skip if we found something on Wikipedia)
  // This saves time and reduces timeout risk
  if (!foundedAt && website) {
    console.log(`[founding-date] Trying website for "${companyName}": ${website}`);
    try {
      foundedAt = await fetchFromWebsite(website);
      console.log(`[founding-date] Website result for "${companyName}" (${website}):`, foundedAt ? foundedAt.toISOString() : "not found");
    } catch (error) {
      // If website fetch fails, don't retry - just log and continue
      console.log(`[founding-date] Website fetch failed for "${companyName}":`, error instanceof Error ? error.message : "Unknown error");
    }
  }
  
  // Cache result (even if null, to avoid repeated lookups)
  // Skip caching if Upstash rate limit is hit
  if (foundedAt) {
    try {
      await kv.set(cacheKey, foundedAt.toISOString(), { ex: CACHE_TTL_SECONDS });
      console.log(`[founding-date] ✅ Cached founding date for "${companyName}": ${foundedAt.toISOString()}`);
    } catch (err: any) {
      // Suppress Upstash rate limit errors
      if (err?.message?.includes("max requests limit exceeded")) {
        console.warn(`[founding-date] Upstash rate limit hit, skipping cache for "${companyName}"`);
      } else {
        console.error(`[founding-date] Failed to cache result for "${companyName}":`, err);
      }
    }
  } else {
    // Cache null for 30 days to avoid repeated failed lookups
    // Skip caching if Upstash rate limit is hit
    try {
      await kv.set(cacheKey, "null", { ex: NULL_CACHE_TTL_SECONDS });
      console.log(`[founding-date] ❌ No founding date found for "${companyName}", cached null`);
    } catch (err: any) {
      // Suppress Upstash rate limit errors
      if (err?.message?.includes("max requests limit exceeded")) {
        console.warn(`[founding-date] Upstash rate limit hit, skipping null cache for "${companyName}"`);
      } else {
        console.error(`[founding-date] Failed to cache null for "${companyName}":`, err);
      }
    }
  }
  
  return foundedAt;
}

/**
 * Fetch founding date from official sources (ANAF API and MFinante.gov.ro)
 * 
 * Priority:
 * 1. ANAF API (if returns foundingDate)
 * 2. MFinante.gov.ro (if ANAF doesn't have it and feature flag is enabled)
 * 
 * @param cui - Company CUI (with or without RO prefix)
 * @param options - Options including skipCache
 * @returns Founding date or null if not found
 */
export async function fetchFoundingDateFromOfficialSources(
  cui: string,
  options: { skipCache?: boolean } = {}
): Promise<Date | null> {
  const normalizedCui = cui.replace(/^RO/i, "").trim();
  const cacheKey = `founding-date-official:${normalizedCui}`;

  // Check cache first
  if (!options.skipCache) {
    try {
      const cached = await kv.get<string>(cacheKey);
      if (cached) {
        if (cached === "null") {
          return null; // Cached null result
        }
        const date = new Date(cached);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch {
      // If cache fails, continue
    }
  }

  console.log(`[founding-date-official] Starting search for CUI ${normalizedCui}`);

  // Priority 1: Try ANAF API
  try {
    const anafResult = await verifyCompanyANAF(normalizedCui, { force: options.skipCache });
    
    if (anafResult.foundingDate) {
      console.log(`[founding-date-official] ✅ Found in ANAF for CUI ${normalizedCui}: ${anafResult.foundingDate.toISOString()}`);
      
      // Cache result
      try {
        await kv.set(cacheKey, anafResult.foundingDate.toISOString(), { ex: CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
      
      return anafResult.foundingDate;
    }

    // Also check registrationDate as fallback (if foundingDate not available)
    if (anafResult.registrationDate) {
      console.log(`[founding-date-official] ⚠️ Using registrationDate from ANAF for CUI ${normalizedCui}: ${anafResult.registrationDate.toISOString()}`);
      
      // Cache result
      try {
        await kv.set(cacheKey, anafResult.registrationDate.toISOString(), { ex: CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
      
      return anafResult.registrationDate;
    }

    console.log(`[founding-date-official] ANAF did not return founding date for CUI ${normalizedCui}`);
  } catch (error) {
    console.log(`[founding-date-official] ANAF error for CUI ${normalizedCui}:`, error instanceof Error ? error.message : "Unknown error");
    // Continue to MFinante fallback
  }

  // Priority 2: Try MFinante.gov.ro (if feature flag is enabled)
  try {
    const mfinanteEnabled = await isFlagEnabled("MFINANTE_FOUNDING_DATE_ENABLED", true);
    
    if (!mfinanteEnabled) {
      console.log(`[founding-date-official] MFinante scraping is disabled via feature flag for CUI ${normalizedCui}`);
      return null;
    }

    const mfinanteData = await fetchCompanyDataFromMFinante(normalizedCui, { skipCache: options.skipCache });
    
    if (mfinanteData?.foundingDate) {
      console.log(`[founding-date-official] ✅ Found in MFinante for CUI ${normalizedCui}: ${mfinanteData.foundingDate.toISOString()}`);
      
      // Cache result
      try {
        await kv.set(cacheKey, mfinanteData.foundingDate.toISOString(), { ex: CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
      
      return mfinanteData.foundingDate;
    }

    // Also check registrationDate as fallback
    if (mfinanteData?.registrationDate) {
      console.log(`[founding-date-official] ⚠️ Using registrationDate from MFinante for CUI ${normalizedCui}: ${mfinanteData.registrationDate.toISOString()}`);
      
      // Cache result
      try {
        await kv.set(cacheKey, mfinanteData.registrationDate.toISOString(), { ex: CACHE_TTL_SECONDS });
      } catch {
        // Ignore cache errors
      }
      
      return mfinanteData.registrationDate;
    }

    console.log(`[founding-date-official] MFinante did not return founding date for CUI ${normalizedCui}`);
  } catch (error) {
    console.log(`[founding-date-official] MFinante error for CUI ${normalizedCui}:`, error instanceof Error ? error.message : "Unknown error");
    // Return null if both sources fail
  }

  // Cache null result
  try {
    await kv.set(cacheKey, "null", { ex: NULL_CACHE_TTL_SECONDS });
  } catch {
    // Ignore cache errors
  }

  console.log(`[founding-date-official] ❌ No founding date found in official sources for CUI ${normalizedCui}`);
  return null;
}
