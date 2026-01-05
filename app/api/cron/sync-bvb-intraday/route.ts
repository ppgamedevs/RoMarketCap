/**
 * BVB Intraday Sync Cron
 * 
 * Syncs BET index companies (20 main listed companies) every 30 minutes during trading hours
 * Creates market cap history snapshots for real-time tracking
 * 
 * Schedule: Every 30 minutes during 09:00-18:00 EET (07:00-16:00 UTC)
 * Feature Flag: BVB_INTRADAY_SYNC_ENABLED
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { BVB_SYMBOL_TO_CUI } from "@/src/lib/ingestion/national/sources/bvbListed";
import { fetchBVBStockPrice } from "@/src/lib/connectors/bvb/yahooFinance";
import { createMarketCapSnapshot } from "@/src/lib/snapshots/createMarketCapSnapshot";
import { isFlagEnabled } from "@/src/lib/flags/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// BET Index Constituents (first 20 symbols from BVB_SYMBOL_TO_CUI - Main Market)
const BET_SYMBOLS = [
  "SNP", "TLV", "SNG", "FP", "BRD", "TEL", "TGN", "EL", "SNN", "H2O",
  "DIGI", "M", "ONE", "AQ", "TRP", "WINE", "SFG", "COTE", "ATB", "SCD"
];

// Cron secret verification
function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allow if no secret configured
  
  const header = req.headers.get("x-cron-secret") || 
                 req.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}

// Check if we're in trading hours (09:00-18:00 EET = 07:00-16:00 UTC)
function isTradingHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // Trading hours: 07:00-16:00 UTC (09:00-18:00 EET)
  return utcHour >= 7 && utcHour < 16;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("BVB_INTRADAY_SYNC_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json({ 
        ok: false, 
        error: "BVB intraday sync is disabled via feature flag" 
      }, { status: 503 });
    }

    // Verify cron secret
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if we're in trading hours
    if (!isTradingHours()) {
      return NextResponse.json({
        ok: true,
        message: "Outside trading hours, skipping intraday sync",
        synced: 0,
      });
    }

    return await executeIntradaySync();
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal error" 
    }, { status: 500 });
  }
}

async function executeIntradaySync() {
  const startTime = Date.now();
  console.log("[sync-bvb-intraday] Starting intraday sync for BET index companies...");

  const results = {
    synced: 0,
    updated: 0,
    errors: 0,
    errorDetails: [] as Array<{ symbol: string; error: string }>,
  };

  for (const symbol of BET_SYMBOLS) {
    try {
      const cui = BVB_SYMBOL_TO_CUI[symbol];
      if (!cui) {
        console.warn(`[sync-bvb-intraday] No CUI mapping for ${symbol}`);
        continue;
      }

      // Find company by CUI
      const company = await prisma.company.findUnique({
        where: { cui },
        select: { id: true, stockSymbol: true },
      });

      if (!company) {
        console.warn(`[sync-bvb-intraday] Company not found for ${symbol} (CUI: ${cui})`);
        continue;
      }

      // Fetch real-time stock price
      const stockPrice = await fetchBVBStockPrice(symbol);
      if (!stockPrice || !stockPrice.marketCap) {
        console.warn(`[sync-bvb-intraday] No price data for ${symbol}`);
        continue;
      }

      // Update company and create snapshot
      await prisma.company.update({
        where: { id: company.id },
        data: {
          marketCap: new Prisma.Decimal(stockPrice.marketCap),
          stockPrice: new Prisma.Decimal(stockPrice.price),
          lastPriceAt: stockPrice.lastUpdated,
        },
      });

      // Create market cap history snapshot
      await createMarketCapSnapshot(company.id, stockPrice, "realtime");

      results.synced++;
      results.updated++;
      console.log(`[sync-bvb-intraday] Synced ${symbol}: ${stockPrice.price} RON, market cap: ${stockPrice.marketCap}`);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000)); // 1 second delay between requests
    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        symbol,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`[sync-bvb-intraday] Error processing ${symbol}:`, error);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[sync-bvb-intraday] Completed in ${duration}ms: ${results.synced} synced, ${results.errors} errors`);

  return NextResponse.json({
    ok: true,
    message: `Intraday sync completed: ${results.synced} companies synced`,
    ...results,
    duration,
  });
}
