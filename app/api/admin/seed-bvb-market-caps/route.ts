/**
 * Admin endpoint to seed BVB market capitalization data
 * Uses static JSON file with manually curated market caps
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketCapData = {
  lastUpdated: string;
  source: string;
  currency: string;
  companies: Record<string, {
    marketCap: number;
    name: string;
    notes?: string;
  }>;
};

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Read market cap data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", "bvb-market-caps.json");
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ok: false,
        error: "Market cap data file not found",
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const marketCapData: MarketCapData = JSON.parse(fileContent);

    const results = {
      total: Object.keys(marketCapData.companies).length,
      updated: 0,
      notFound: 0,
      errors: 0,
      errorDetails: [] as Array<{ symbol: string; error: string }>,
    };

    // Find CUI for each symbol (from BVB mapping)
    const { BVB_SYMBOL_TO_CUI } = await import("@/src/lib/ingestion/national/sources/bvbListed");

    for (const [symbol, data] of Object.entries(marketCapData.companies)) {
      try {
        const cui = BVB_SYMBOL_TO_CUI[symbol];
        
        if (!cui) {
          console.warn(`[seed-bvb-market-caps] No CUI found for symbol ${symbol}`);
          results.notFound++;
          continue;
        }

        // Update company with market cap
        const updated = await prisma.company.updateMany({
          where: { cui },
          data: {
            marketCap: new Prisma.Decimal(data.marketCap),
            lastPriceAt: new Date(marketCapData.lastUpdated),
            isListed: true,
            stockSymbol: symbol,
            stockExchange: "BVB",
          },
        });

        if (updated.count > 0) {
          results.updated++;
          console.log(`[seed-bvb-market-caps] Updated ${symbol} (${data.name}): ${data.marketCap.toLocaleString()} RON`);
        } else {
          console.warn(`[seed-bvb-market-caps] Company not found for ${symbol} (CUI: ${cui})`);
          results.notFound++;
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ symbol, error: errorMsg });
        console.error(`[seed-bvb-market-caps] Error updating ${symbol}:`, error);
        Sentry.captureException(error, {
          tags: { component: "seed-bvb-market-caps", symbol },
        });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      message: `Seeded market caps for ${results.updated} companies in ${duration}ms`,
      dataSource: marketCapData.source,
      lastUpdated: marketCapData.lastUpdated,
      currency: marketCapData.currency,
      ...results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[seed-bvb-market-caps] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
