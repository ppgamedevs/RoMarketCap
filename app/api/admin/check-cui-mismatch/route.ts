/**
 * Debug endpoint to check CUI mismatches between seed data and database
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RevenueData = {
  lastUpdated: string;
  source: string;
  currency: string;
  companies: Record<string, {
    name: string;
    revenue: number;
    employees?: number;
    industry?: string;
  }>;
};

export async function GET(req: Request) {
  try {
    // Read revenue data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", "major-companies-revenue.json");
    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const revenueData: RevenueData = JSON.parse(fileContent);

    const results = [];

    // For each company in seed data, check if it exists in database
    for (const [cuiFromJson, data] of Object.entries(revenueData.companies)) {
      // Try to find by CUI
      const companyByCui = await prisma.company.findUnique({
        where: { cui: cuiFromJson },
        select: { cui: true, name: true, revenueLatest: true, employees: true },
      });

      // Try to find by name (partial match)
      const companiesByName = await prisma.company.findMany({
        where: {
          name: {
            contains: data.name.split(" ")[0], // First word of name
            mode: "insensitive",
          },
        },
        select: { cui: true, name: true, revenueLatest: true, employees: true },
        take: 5,
      });

      results.push({
        cuiFromJson,
        nameFromJson: data.name,
        revenueFromJson: data.revenue,
        foundByCui: !!companyByCui,
        companyByCui: companyByCui || null,
        possibleMatches: companiesByName,
      });
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[check-cui-mismatch] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
