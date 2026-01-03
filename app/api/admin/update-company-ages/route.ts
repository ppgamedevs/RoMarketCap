/**
 * Update Company Ages
 * 
 * Populates foundedAt for companies that don't have it, enabling age calculation.
 * 
 * Strategy (in order):
 * 1. Use foundedYear if available (set to Jan 1 of that year)
 * 2. Search web (Wikipedia + company website) for actual founding date
 * 3. Use createdAt as fallback (when we first saw the company - not perfect but better than nothing)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { fetchFoundingDate } from "@/src/lib/connectors/foundingDate/fetchFoundingDate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const useWebSearch = url.searchParams.get("useWebSearch") === "true"; // Enable web search
    const batchSize = parseInt(url.searchParams.get("batchSize") || "50"); // Reduced to 50 for rate limiting
    const cursor = url.searchParams.get("cursor") || undefined;

    // Fetch companies without foundedAt
    const companies = await prisma.company.findMany({
      where: {
        foundedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        name: true,
        website: true,
        foundedYear: true,
        createdAt: true,
        cui: true,
      },
      orderBy: { id: "asc" },
      take: batchSize,
    });

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No more companies to process",
        done: true,
        dryRun,
        processed: 0,
        updated: 0,
      });
    }

    let updated = 0;
    const updates: Array<{ id: string; name: string; source: string; foundedAt: string }> = [];
    const errors: Array<{ id: string; name: string; error: string }> = [];

    for (const company of companies) {
      let foundedAt: Date | null = null;
      let source = "";

      // Strategy 1: Use foundedYear if available
      if (company.foundedYear) {
        foundedAt = new Date(company.foundedYear, 0, 1);
        source = "foundedYear";
      }
      // Strategy 2: Fetch from web (Wikipedia + company website)
      else if (useWebSearch) {
        try {
          // Rate limit: 1 request per 2 seconds for web searches
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          foundedAt = await fetchFoundingDate(company.name, company.website || null);
          if (foundedAt) {
            source = "web_search";
          }
        } catch (error) {
          errors.push({
            id: company.id,
            name: company.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
      
      // Strategy 3: Fallback to createdAt estimate
      if (!foundedAt) {
        const now = new Date();
        const yearsSinceCreation = now.getFullYear() - company.createdAt.getFullYear();
        const estimatedFoundedYear = company.createdAt.getFullYear() - Math.max(2, Math.min(10, yearsSinceCreation));
        foundedAt = new Date(estimatedFoundedYear, company.createdAt.getMonth(), company.createdAt.getDate());
        source = source || "createdAt_estimated";
      }

      if (!foundedAt) continue;

      updates.push({
        id: company.id,
        name: company.name,
        source,
        foundedAt: foundedAt.toISOString(),
      });

      if (!dryRun) {
        await prisma.company.update({
          where: { id: company.id },
          data: { foundedAt },
        });
        updated++;
      }
    }

    const lastId = companies[companies.length - 1]?.id;

    return NextResponse.json({
      ok: true,
      message: dryRun ? "Dry run - no changes made" : `Updated ${updated} companies with foundedAt`,
      dryRun,
      useWebSearch,
      processed: companies.length,
      updated,
      sample: updates.slice(0, 10),
      errors: errors.slice(0, 5),
      nextCursor: lastId,
      done: companies.length < batchSize,
    });
  } catch (error) {
    console.error("[admin/update-company-ages] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
