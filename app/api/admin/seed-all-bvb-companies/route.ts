/**
 * Admin endpoint to seed ALL BVB listed companies (Main Market + AeRO)
 * Creates/updates companies and marks them as listed
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BVBCompaniesData = {
  lastUpdated: string;
  source: string;
  totalCompanies: number;
  companies: Record<string, {
    cui: string;
    name: string;
    market: "main" | "aero";
  }>;
};

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Read BVB companies data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", "bvb-all-companies.json");
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ok: false,
        error: "BVB companies data file not found",
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const bvbData: BVBCompaniesData = JSON.parse(fileContent);

    const results = {
      total: Object.keys(bvbData.companies).length,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as Array<{ symbol: string; error: string }>,
      byMarket: {
        main: 0,
        aero: 0,
      },
    };

    for (const [symbol, data] of Object.entries(bvbData.companies)) {
      try {
        // Check if company exists
        const existing = await prisma.company.findUnique({
          where: { cui: data.cui },
          select: { id: true, name: true },
        });

        if (existing) {
          // Update existing company
          await prisma.company.update({
            where: { cui: data.cui },
            data: {
              isListed: true,
              stockSymbol: symbol,
              stockExchange: "BVB",
              name: data.name, // Update name if it was placeholder
              legalName: data.name,
              dataConfidence: Math.max(80, existing.name?.startsWith("Companie") ? 80 : 90), // Boost confidence
              lastSeenAtFromSources: new Date(),
            },
          });
          results.updated++;
        } else {
          // Create new company
          const slug = `${data.name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 80)}-${data.cui}`;

          await prisma.company.create({
            data: {
              cui: data.cui,
              slug,
              name: data.name,
              legalName: data.name,
              isListed: true,
              stockSymbol: symbol,
              stockExchange: "BVB",
              isPublic: true,
              isSkeleton: false,
              dataConfidence: 80, // Listed companies get high confidence
              romcScore: 50, // Default score
              romcAiScore: 50,
              universeSource: "BVB",
              universeConfidence: 95, // Very high - official stock exchange
              universeVerified: true,
              lastSeenAtFromSources: new Date(),
            },
          });
          results.created++;
        }

        results.byMarket[data.market]++;
        
        if ((results.created + results.updated) % 25 === 0) {
          console.log(`[seed-all-bvb-companies] Processed ${results.created + results.updated}/${results.total}...`);
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ symbol, error: errorMsg });
        console.error(`[seed-all-bvb-companies] Error processing ${symbol}:`, error);
        Sentry.captureException(error, {
          tags: { component: "seed-all-bvb-companies", symbol },
        });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      message: `Seeded ${results.created + results.updated} BVB companies in ${duration}ms`,
      dataSource: bvbData.source,
      lastUpdated: bvbData.lastUpdated,
      ...results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[seed-all-bvb-companies] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
