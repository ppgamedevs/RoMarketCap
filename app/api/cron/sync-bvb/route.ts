/**
 * PROMPT 63: BVB Listed Companies Sync Cron
 * 
 * Daily sync of BVB (Bucharest Stock Exchange) listed companies.
 * Updates:
 * - Company isListed flag
 * - Stock symbol and exchange
 * - Market capitalization (when available)
 * 
 * Schedule: Daily at 18:00 Bucharest time (after market close)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { BVB_SYMBOL_TO_CUI } from "@/src/lib/ingestion/national/sources/bvbListed";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";
import { applyPostIngestionHooks } from "@/src/lib/ingestion/postHooks";
import { fetchBVBStockPrice } from "@/src/lib/connectors/bvb/yahooFinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// Cron secret verification
function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allow if no secret configured
  
  const header = req.headers.get("x-cron-secret") || 
                 req.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  
  try {
    // Check feature flag
    const flagEnabled = await kv.get<boolean>("flag:BVB_SYNC_ENABLED").catch(() => null);
    if (flagEnabled === false) {
      return NextResponse.json({ 
        ok: true, 
        message: "BVB sync disabled via feature flag",
        skipped: true,
      });
    }

    const results = {
      total: 0,
      created: 0,
      updated: 0,
      namesUpdated: 0,
      marketCapUpdated: 0,
      errors: 0,
      errorDetails: [] as Array<{ symbol: string; error: string }>,
    };

    // Get all BVB symbols and their CUIs
    const symbolToCui = BVB_SYMBOL_TO_CUI;
    results.total = Object.keys(symbolToCui).length;

    // Process each BVB listed company
    for (const [symbol, cui] of Object.entries(symbolToCui)) {
      try {
        // Check if company exists
        const existing = await prisma.company.findUnique({
          where: { cui },
          select: { 
            id: true, 
            name: true, 
            isListed: true, 
            stockSymbol: true,
            anafVerifiedAt: true,
          },
        });

        if (existing) {
          // Update existing company with BVB data
          const needsNameUpdate = !existing.name || 
            existing.name.startsWith("Companie CUI:") || 
            existing.name.startsWith("Company CUI:") ||
            existing.name.startsWith("Company ");

          let officialName: string | undefined;
          
          // Fetch name from ANAF if needed
          if (needsNameUpdate && !existing.anafVerifiedAt) {
            try {
              const anafResult = await verifyCompany(cui);
              if (anafResult.officialName) {
                officialName = anafResult.officialName;
                results.namesUpdated++;
              }
            } catch (err) {
              console.warn(`[sync-bvb] ANAF verification failed for ${symbol}:`, err);
            }
          }

          // Fetch real-time stock price and market cap
          let stockPrice: Awaited<ReturnType<typeof fetchBVBStockPrice>> = null;
          try {
            stockPrice = await fetchBVBStockPrice(symbol);
            if (stockPrice && stockPrice.marketCap) {
              results.marketCapUpdated++;
              console.log(`[sync-bvb] Fetched market cap for ${symbol}: ${stockPrice.marketCap} ${stockPrice.currency}`);
            }
          } catch (err) {
            console.warn(`[sync-bvb] Failed to fetch price for ${symbol}:`, err);
          }

          await prisma.company.update({
            where: { cui },
            data: {
              isListed: true,
              stockSymbol: symbol,
              stockExchange: "BVB",
              ...(officialName ? { 
                name: officialName, 
                legalName: officialName,
                officialName,
                anafVerifiedAt: new Date(),
              } : {}),
              ...(stockPrice ? {
                marketCap: new Prisma.Decimal(stockPrice.marketCap),
                stockPrice: new Prisma.Decimal(stockPrice.price),
                lastPriceAt: stockPrice.lastUpdated,
              } : {}),
              dataConfidence: Math.max(existing.isListed ? 80 : 70, 70), // Boost confidence for listed companies
              lastSeenAtFromSources: new Date(),
            },
          });

          // Create market cap history snapshot
          if (stockPrice) {
            try {
              const { createMarketCapSnapshot } = await import("@/src/lib/snapshots/createMarketCapSnapshot");
              await createMarketCapSnapshot(existing.id, stockPrice, "bvb_sync");
            } catch (err) {
              console.warn(`[sync-bvb] Failed to create market cap snapshot for ${symbol}:`, err);
              // Don't fail the sync if snapshot creation fails
            }
          }

          results.updated++;
          
          // Apply post-ingestion hooks
          await applyPostIngestionHooks(existing.id).catch((err) => {
            console.error(`[sync-bvb] Post-hooks failed for ${symbol}:`, err);
          });

        } else {
          // Create new company for BVB listed company
          // First try to get name from ANAF
          let officialName = `${symbol} Listed Company`;
          
          try {
            const anafResult = await verifyCompany(cui);
            if (anafResult.officialName) {
              officialName = anafResult.officialName;
              results.namesUpdated++;
            }
          } catch (err) {
            console.warn(`[sync-bvb] ANAF verification failed for new company ${symbol}:`, err);
          }

          // Fetch real-time stock price and market cap for new company
          let newStockPrice: Awaited<ReturnType<typeof fetchBVBStockPrice>> = null;
          try {
            newStockPrice = await fetchBVBStockPrice(symbol);
            if (newStockPrice && newStockPrice.marketCap) {
              results.marketCapUpdated++;
              console.log(`[sync-bvb] Fetched market cap for new ${symbol}: ${newStockPrice.marketCap} ${newStockPrice.currency}`);
            }
          } catch (err) {
            console.warn(`[sync-bvb] Failed to fetch price for new ${symbol}:`, err);
          }

          const slug = `${officialName.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 80)}-${cui}`;

          const newCompany = await prisma.company.create({
            data: {
              cui,
              slug,
              name: officialName,
              legalName: officialName,
              isListed: true,
              stockSymbol: symbol,
              stockExchange: "BVB",
              countySlug: "bucuresti",
              isPublic: true,
              isSkeleton: false,
              dataConfidence: 80, // High confidence for BVB listed
              universeSource: "BVB",
              universeVerified: true,
              lastSeenAtFromSources: new Date(),
              ...(newStockPrice ? {
                marketCap: new Prisma.Decimal(newStockPrice.marketCap),
                stockPrice: new Prisma.Decimal(newStockPrice.price),
                lastPriceAt: newStockPrice.lastUpdated,
              } : {}),
            },
          });

          results.created++;
          
          // Create market cap history snapshot for new company
          if (newStockPrice) {
            try {
              const { createMarketCapSnapshot } = await import("@/src/lib/snapshots/createMarketCapSnapshot");
              await createMarketCapSnapshot(newCompany.id, newStockPrice, "bvb_sync");
            } catch (err) {
              console.warn(`[sync-bvb] Failed to create market cap snapshot for new ${symbol}:`, err);
              // Don't fail the sync if snapshot creation fails
            }
          }

          // Apply post-ingestion hooks
          await applyPostIngestionHooks(newCompany.id).catch((err) => {
            console.error(`[sync-bvb] Post-hooks failed for new ${symbol}:`, err);
          });
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          symbol,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`[sync-bvb] Error processing ${symbol}:`, error);
      }
    }

    // Update last sync timestamp
    await kv.set("cron:last:sync-bvb", new Date().toISOString());

    const duration = Date.now() - startTime;
    
    console.log(`[sync-bvb] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      ok: true,
      message: `Synced ${results.total} BVB companies: ${results.created} created, ${results.updated} updated, ${results.namesUpdated} names updated, ${results.marketCapUpdated} market caps updated, ${results.errors} errors`,
      duration,
      results,
    });

  } catch (error) {
    console.error("[sync-bvb] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
