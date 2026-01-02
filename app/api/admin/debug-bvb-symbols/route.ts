/**
 * Debug endpoint to check BVB symbol to CUI mapping
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { BVB_SYMBOL_TO_CUI } = await import("@/src/lib/ingestion/national/sources/bvbListed");
    
    const symbols = ["SIF1", "SIF2", "SIF3", "SIF4", "SIF5", "ALW", "NRF", "2P", "SAFE"];
    const results = [];

    for (const symbol of symbols) {
      const cui = BVB_SYMBOL_TO_CUI[symbol];
      
      if (!cui) {
        results.push({
          symbol,
          cui: null,
          status: "❌ NO_CUI_IN_MAPPING",
          company: null,
        });
        continue;
      }

      // Check if company exists in database
      const company = await prisma.company.findUnique({
        where: { cui },
        select: {
          cui: true,
          name: true,
          marketCap: true,
          isListed: true,
          stockSymbol: true,
          dataConfidence: true,
        },
      });

      results.push({
        symbol,
        cui,
        status: !company ? "❌ NOT_IN_DB" :
                company.marketCap ? "✅ HAS_MARKETCAP" :
                "⚠️ NO_MARKETCAP",
        company: company || null,
      });
    }

    return NextResponse.json({
      ok: true,
      results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[debug-bvb-symbols] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
