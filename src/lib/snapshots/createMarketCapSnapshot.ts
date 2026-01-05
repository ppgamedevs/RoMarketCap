/**
 * Market Cap Snapshot Utility
 * 
 * Creates CompanyMarketCapHistory records to track market cap changes over time
 * Updates Company.marketCap and Company.stockPrice fields
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import type { StockPrice } from "@/src/lib/connectors/bvb/yahooFinance";

export type MarketCapSnapshotSource = "bvb_sync" | "realtime";

/**
 * Create a market cap history snapshot
 * 
 * @param companyId - Company ID
 * @param stockPrice - Stock price data from Yahoo Finance
 * @param source - Source of the snapshot ("bvb_sync" | "realtime")
 */
export async function createMarketCapSnapshot(
  companyId: string,
  stockPrice: StockPrice,
  source: MarketCapSnapshotSource = "bvb_sync"
): Promise<void> {
  try {
    // Update Company table with latest market cap and stock price
    await prisma.company.update({
      where: { id: companyId },
      data: {
        marketCap: new Prisma.Decimal(stockPrice.marketCap),
        stockPrice: new Prisma.Decimal(stockPrice.price),
        lastPriceAt: stockPrice.lastUpdated,
      },
    });

    // Create history record
    await prisma.companyMarketCapHistory.create({
      data: {
        companyId,
        recordedAt: stockPrice.lastUpdated,
        stockPrice: new Prisma.Decimal(stockPrice.price),
        marketCap: new Prisma.Decimal(stockPrice.marketCap),
        volume: stockPrice.volume ? BigInt(stockPrice.volume) : null,
        changePercent: stockPrice.changePercent ?? null,
        currency: stockPrice.currency,
        source,
      },
    });
  } catch (error) {
    // Handle duplicate key errors gracefully (skipDuplicates equivalent)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation - snapshot already exists for this timestamp
        console.warn(`[createMarketCapSnapshot] Duplicate snapshot for company ${companyId} at ${stockPrice.lastUpdated.toISOString()}`);
        return;
      }
    }
    
    // Log other errors but don't throw (non-blocking)
    console.error(`[createMarketCapSnapshot] Error creating snapshot for company ${companyId}:`, error);
    throw error;
  }
}
