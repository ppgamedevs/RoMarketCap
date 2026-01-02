/**
 * Yahoo Finance connector for BVB stocks
 * Fetches real-time prices for Romanian stocks (.RO suffix)
 * 
 * Free API, no authentication required
 * Rate limit: 1 request/second
 * Cache: 1 hour in Vercel KV
 */

import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";

const YAHOO_FINANCE_QUOTE_API = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const YAHOO_FINANCE_CHART_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const RATE_LIMIT_KEY = "bvb:yahoo:rate_limit";
const RATE_LIMIT_MS = 1000; // 1 second
const CACHE_TTL_SECONDS = 3600; // 1 hour

export type StockPrice = {
  symbol: string;
  price: number;
  marketCap: number;
  currency: string;
  volume: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
};

/**
 * Check and enforce rate limit
 */
async function checkRateLimit(): Promise<boolean> {
  try {
    const lastRequest = await kv.get<number>(RATE_LIMIT_KEY);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < RATE_LIMIT_MS) {
        const waitTime = RATE_LIMIT_MS - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    await kv.set(RATE_LIMIT_KEY, Date.now(), { ex: 10 });
    return true;
  } catch (error) {
    console.warn("[yahoo-finance] Rate limit check failed:", error);
    return true; // Allow if KV fails
  }
}

/**
 * Fetch stock price from Yahoo Finance
 */
export async function fetchBVBStockPrice(
  symbol: string,
  options: { skipCache?: boolean } = {}
): Promise<StockPrice | null> {
  const ticker = `${symbol}.RO`;
  const cacheKey = `bvb:price:${symbol}`;

  // Check cache first
  if (!options.skipCache) {
    try {
      const cached = await kv.get<StockPrice>(cacheKey);
      if (cached) {
        console.log(`[yahoo-finance] Cache hit for ${symbol}`);
        return cached;
      }
    } catch (error) {
      console.warn(`[yahoo-finance] Cache read failed for ${symbol}:`, error);
    }
  }

  // Enforce rate limit
  await checkRateLimit();

  try {
    // Use quoteSummary API for comprehensive data including market cap
    const url = `${YAHOO_FINANCE_QUOTE_API}/${ticker}?modules=price,summaryDetail`;
    console.log(`[yahoo-finance] Fetching ${ticker}...`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[yahoo-finance] Symbol not found: ${ticker}`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Log raw response for debugging
    console.log(`[yahoo-finance] Raw response for ${ticker}:`, JSON.stringify(data).substring(0, 500));

    // Parse quoteSummary response
    const result = data?.quoteSummary?.result?.[0];
    if (!result) {
      console.warn(`[yahoo-finance] No data for ${ticker}`);
      console.log(`[yahoo-finance] Full response:`, JSON.stringify(data));
      return null;
    }

    const priceData = result.price;
    const summaryDetail = result.summaryDetail;

    if (!priceData) {
      console.warn(`[yahoo-finance] No price data for ${ticker}`);
      console.log(`[yahoo-finance] Result keys:`, Object.keys(result));
      return null;
    }

    console.log(`[yahoo-finance] Price data keys for ${ticker}:`, Object.keys(priceData));
    console.log(`[yahoo-finance] Market cap value:`, priceData.marketCap);

    const price = priceData.regularMarketPrice?.raw;
    const previousClose = priceData.regularMarketPreviousClose?.raw;
    const marketCap = priceData.marketCap?.raw;
    const volume = priceData.regularMarketVolume?.raw || 0;
    const currency = priceData.currency || "RON";

    if (typeof price !== "number") {
      console.warn(`[yahoo-finance] No valid price for ${ticker}`);
      return null;
    }

    // Market cap is optional - we'll store what we have
    if (!marketCap) {
      console.warn(`[yahoo-finance] No market cap for ${ticker}, using price only`);
    }

    const change = previousClose ? price - previousClose : 0;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    const stockPrice: StockPrice = {
      symbol,
      price,
      marketCap: marketCap || 0, // Store 0 if unavailable
      currency,
      volume,
      change,
      changePercent,
      lastUpdated: new Date(),
    };

    // Cache result
    try {
      await kv.set(cacheKey, stockPrice, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      console.warn(`[yahoo-finance] Cache write failed for ${symbol}:`, error);
    }

    console.log(`[yahoo-finance] Fetched ${symbol}: ${price} ${stockPrice.currency}, market cap: ${marketCap}`);
    return stockPrice;
  } catch (error) {
    console.error(`[yahoo-finance] Error fetching ${ticker}:`, error);
    Sentry.captureException(error, {
      tags: { component: "yahoo-finance", symbol, ticker },
    });
    return null;
  }
}

/**
 * Fetch stock prices for multiple symbols
 * Uses 1-second delay between requests to respect rate limits
 */
export async function fetchBVBStockPrices(
  symbols: string[],
  options: { skipCache?: boolean } = {}
): Promise<Map<string, StockPrice>> {
  const results = new Map<string, StockPrice>();

  console.log(`[yahoo-finance] Fetching prices for ${symbols.length} symbols...`);

  for (const symbol of symbols) {
    try {
      const stockPrice = await fetchBVBStockPrice(symbol, options);
      if (stockPrice) {
        results.set(symbol, stockPrice);
      }
    } catch (error) {
      console.error(`[yahoo-finance] Failed to fetch ${symbol}:`, error);
      // Continue with next symbol
    }
  }

  console.log(`[yahoo-finance] Successfully fetched ${results.size}/${symbols.length} prices`);
  return results;
}

/**
 * Clear cache for a specific symbol or all symbols
 */
export async function clearPriceCache(symbol?: string): Promise<void> {
  try {
    if (symbol) {
      await kv.del(`bvb:price:${symbol}`);
      console.log(`[yahoo-finance] Cleared cache for ${symbol}`);
    } else {
      // Clear all price caches (would need to scan keys in production)
      console.log(`[yahoo-finance] Cache clear for all symbols not implemented (use TTL expiration)`);
    }
  } catch (error) {
    console.error("[yahoo-finance] Cache clear failed:", error);
  }
}
