/**
 * Admin endpoint to seed revenue data for medium Romanian companies
 * This allows market cap estimation to work for companies without ANAF financial data
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
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
  return POST(req);
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Read revenue data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", "medium-companies-revenue.json");
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ok: false,
        error: "Revenue data file not found",
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const revenueData: RevenueData = JSON.parse(fileContent);

    const results = {
      total: Object.keys(revenueData.companies).length,
      updated: 0,
      notFound: 0,
      errors: 0,
      errorDetails: [] as Array<{ cui: string; error: string }>,
    };

    for (const [cui, data] of Object.entries(revenueData.companies)) {
      try {
        // Update company with revenue and employee data
        const updated = await prisma.company.updateMany({
          where: { cui },
          data: {
            revenueLatest: new Prisma.Decimal(data.revenue),
            ...(data.employees ? { employees: data.employees } : {}),
            ...(data.industry ? { industry: data.industry } : {}),
            lastSeenAtFromSources: new Date(),
          },
        });

        if (updated.count > 0) {
          results.updated++;
          console.log(`[seed-medium-companies-revenue] Updated ${data.name} (${cui}): ${data.revenue.toLocaleString()} RON revenue`);
        } else {
          console.warn(`[seed-medium-companies-revenue] Company not found: ${cui}`);
          results.notFound++;
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ cui, error: errorMsg });
        console.error(`[seed-medium-companies-revenue] Error updating ${cui}:`, error);
        Sentry.captureException(error, {
          tags: { component: "seed-medium-companies-revenue", cui },
        });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      message: `Seeded revenue data for ${results.updated} companies in ${duration}ms`,
      dataSource: revenueData.source,
      lastUpdated: revenueData.lastUpdated,
      currency: revenueData.currency,
      ...results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[seed-medium-companies-revenue] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
