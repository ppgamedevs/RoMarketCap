/**
 * Update Company Ages
 * 
 * Populates foundedAt for companies that don't have it, enabling age calculation.
 * 
 * Strategy (in order):
 * 1. Use foundedYear if available (set to Jan 1 of that year)
 * 2. Use createdAt as fallback (when we first saw the company - not perfect but better than nothing)
 * 3. Set a reasonable default (5 years ago) for companies without any date
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

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
    const strategy = url.searchParams.get("strategy") || "all"; // "all" | "foundedYear" | "createdAt" | "default"
    const batchSize = parseInt(url.searchParams.get("batchSize") || "100");
    const cursor = url.searchParams.get("cursor") || undefined;

    let companies: Array<{ id: string; name: string; foundedYear: number | null; createdAt: Date; cui: string | null }> = [];
    let whereClause: any = { foundedAt: null };

    // Strategy 1: Companies with foundedYear but no foundedAt
    if (strategy === "all" || strategy === "foundedYear") {
      const withYear = await prisma.company.findMany({
        where: {
          ...whereClause,
          foundedYear: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: {
          id: true,
          name: true,
          foundedYear: true,
          createdAt: true,
          cui: true,
        },
        orderBy: { id: "asc" },
        take: strategy === "foundedYear" ? batchSize : Math.floor(batchSize / 2),
      });
      companies.push(...withYear);
    }

    // Strategy 2: Companies without foundedYear - use createdAt as fallback
    if ((strategy === "all" || strategy === "createdAt") && companies.length < batchSize) {
      const remaining = batchSize - companies.length;
      const withoutYear = await prisma.company.findMany({
        where: {
          ...whereClause,
          foundedYear: null,
          ...(cursor && companies.length === 0 ? { id: { gt: cursor } } : {}),
        },
        select: {
          id: true,
          name: true,
          foundedYear: true,
          createdAt: true,
          cui: true,
        },
        orderBy: { id: "asc" },
        take: remaining,
      });
      companies.push(...withoutYear);
    }

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

    const now = new Date();
    const defaultYearsAgo = 5; // Default to 5 years ago if no date available
    const defaultDate = new Date(now.getFullYear() - defaultYearsAgo, 0, 1);

    for (const company of companies) {
      let foundedAt: Date | null = null;
      let source = "";

      // Strategy 1: Use foundedYear if available
      if (company.foundedYear) {
        foundedAt = new Date(company.foundedYear, 0, 1); // Jan 1 of that year
        source = "foundedYear";
      }
      // Strategy 2: Use createdAt as fallback (when we first saw them)
      else if (strategy === "all" || strategy === "createdAt" || strategy === "default") {
        // Use createdAt, but subtract a few years to account for when company was actually founded
        // Most companies existed before we discovered them
        const yearsSinceCreation = now.getFullYear() - company.createdAt.getFullYear();
        const estimatedFoundedYear = company.createdAt.getFullYear() - Math.max(2, Math.min(10, yearsSinceCreation));
        foundedAt = new Date(estimatedFoundedYear, company.createdAt.getMonth(), company.createdAt.getDate());
        source = "createdAt_estimated";
      }
      // Strategy 3: Default fallback
      else {
        foundedAt = defaultDate;
        source = "default";
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
      strategy,
      processed: companies.length,
      updated,
      sample: updates.slice(0, 10),
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
