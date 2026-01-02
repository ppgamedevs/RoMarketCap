/**
 * Check how many top 100 companies have revenue data
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Top100Entry = {
  cui: string;
  name: string;
  industry?: string;
  isListed?: boolean;
};

export async function GET(req: Request) {
  try {
    // Read top 100 list
    const dataPath = path.join(process.cwd(), "data", "seeds", "top100-romania.json");
    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const top100: Top100Entry[] = JSON.parse(fileContent);

    const results = [];

    for (const entry of top100) {
      const company = await prisma.company.findUnique({
        where: { cui: entry.cui },
        select: {
          cui: true,
          name: true,
          industry: true,
          isListed: true,
          revenueLatest: true,
          marketCap: true,
          dataConfidence: true,
        },
      });

      if (company) {
        results.push({
          cui: entry.cui,
          nameFromSeed: entry.name,
          nameInDb: company.name,
          industry: company.industry,
          isListed: company.isListed,
          hasRevenue: !!company.revenueLatest && Number(company.revenueLatest) > 0,
          hasMarketCap: !!company.marketCap && Number(company.marketCap) > 0,
          revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
          marketCap: company.marketCap ? Number(company.marketCap) : null,
          dataConfidence: company.dataConfidence,
          status: !company.revenueLatest && !company.marketCap ? "❌ NO_DATA" :
                  company.marketCap ? "✅ HAS_MARKETCAP" :
                  company.revenueLatest ? "⚠️ HAS_REVENUE_NO_MARKETCAP" :
                  "❓ UNKNOWN",
        });
      } else {
        results.push({
          cui: entry.cui,
          nameFromSeed: entry.name,
          nameInDb: null,
          status: "❌ NOT_IN_DB",
        });
      }
    }

    const stats = {
      total: results.length,
      notInDb: results.filter(r => r.status === "❌ NOT_IN_DB").length,
      noData: results.filter(r => r.status === "❌ NO_DATA").length,
      hasMarketCap: results.filter(r => r.status === "✅ HAS_MARKETCAP").length,
      hasRevenueOnly: results.filter(r => r.status === "⚠️ HAS_REVENUE_NO_MARKETCAP").length,
    };

    return NextResponse.json({
      ok: true,
      stats,
      results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[check-top100-coverage] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
