/**
 * Admin endpoint to seed company context data (financial highlights, key insights, growth plans)
 * 
 * This populates structured contextual information for companies to display on their pages
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompanyContextData = {
  lastUpdated: string;
  source: string;
  companies: Record<string, {
    name: string;
    financialHighlights?: {
      revenue2024?: { value: number; currency: string; note?: string };
      investments2025?: { value: number; currency: string; note?: string };
      [key: string]: { value: number; currency: string; note?: string } | undefined;
    };
    keyInsights?: string[];
    growthPlans?: string[];
    marketContext?: string;
  }>;
};

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";

    // Read context data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", "company-context.json");
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ok: false,
        error: "Company context data file not found",
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const contextData: CompanyContextData = JSON.parse(fileContent);

    const results = {
      total: Object.keys(contextData.companies).length,
      updated: 0,
      notFound: 0,
      errors: 0,
      errorDetails: [] as Array<{ cui: string; error: string }>,
    };

    for (const [cui, data] of Object.entries(contextData.companies)) {
      try {
        // Find company by CUI
        const company = await prisma.company.findFirst({
          where: { cui },
          select: { id: true, name: true },
        });

        if (!company) {
          results.notFound++;
          console.warn(`[seed-company-context] Company not found: ${data.name} (CUI: ${cui})`);
          continue;
        }

        // Prepare context data structure
        const companyContextData = {
          financialHighlights: data.financialHighlights || undefined,
          keyInsights: data.keyInsights || undefined,
          growthPlans: data.growthPlans || undefined,
          marketContext: data.marketContext || undefined,
          lastUpdated: contextData.lastUpdated,
          source: contextData.source,
        };

        if (!dryRun) {
          // Update company with context data
          await prisma.company.update({
            where: { id: company.id },
            data: {
              companyContext: companyContextData as any,
            },
          });
          
          console.log(`[seed-company-context] Updated ${company.name} (${cui}) with context data`);
          results.updated++;
        } else {
          console.log(`[seed-company-context] [DRY RUN] Would update ${company.name} (${cui}) with context data`);
          results.updated++;
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ cui, error: errorMsg });
        console.error(`[seed-company-context] Error processing ${cui}:`, error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun
        ? `Dry run: Would update context for ${results.updated} companies`
        : `Updated context for ${results.updated} companies`,
      dryRun,
      note: "Make sure to run /api/admin/add-company-context-column first if the column doesn't exist.",
      ...results,
    });

  } catch (error) {
    console.error("[seed-company-context] Fatal error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
