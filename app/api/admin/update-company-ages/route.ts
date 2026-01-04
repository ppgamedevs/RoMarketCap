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
    const batchSize = parseInt(url.searchParams.get("batchSize") || "3"); // Reduced to 3 to avoid timeout (each takes ~5-7s with web search)
    const cursor = url.searchParams.get("cursor") || undefined;
    const reprocessSuspect = url.searchParams.get("reprocessSuspect") === "true"; // Also process companies with 2020+ dates (likely wrong)

    // Fetch companies without foundedAt, or with suspect dates (2020+) if reprocessSuspect is true
    const currentYear = new Date().getFullYear();
    const whereClause: any = {
      ...(cursor ? { id: { gt: cursor } } : {}),
    };

    if (reprocessSuspect) {
      // Process companies with null foundedAt OR with foundedAt >= 2020 (likely wrong)
      // But exclude if they have a real foundedYear < 2020
      whereClause.OR = [
        { foundedAt: null },
        {
          AND: [
            {
              foundedAt: {
                gte: new Date(2020, 0, 1), // >= 2020-01-01
              },
            },
            {
              OR: [
                { foundedYear: null },
                { foundedYear: { gte: 2020 } }, // foundedYear is also >= 2020, so it's suspect
              ],
            },
          ],
        },
      ];
    } else {
      // Only process companies without foundedAt
      whereClause.foundedAt = null;
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        website: true,
        foundedYear: true,
        foundedAt: true, // Need this for reprocessSuspect logic
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
          console.log(`[update-ages] Searching web for "${company.name}" (website: ${company.website || "none"})`);
          
          // Rate limit: 0.8 seconds between requests (slightly faster to avoid timeout)
          await new Promise((resolve) => setTimeout(resolve, 800));
          
          foundedAt = await fetchFoundingDate(company.name, company.website || null);
          if (foundedAt) {
            source = "web_search";
            console.log(`[update-ages] ✅ Found founding date for "${company.name}": ${foundedAt.toISOString()}`);
          } else {
            console.log(`[update-ages] ❌ No founding date found for "${company.name}" via web search`);
          }
        } catch (error) {
          console.error(`[update-ages] Error searching web for "${company.name}":`, error);
          errors.push({
            id: company.id,
            name: company.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
      
      // Strategy 3: Don't set foundedAt if we don't have real data
      // createdAt_estimated is unreliable - better to leave it null than show wrong data
      // We'll only set it if we have at least foundedYear or web search result
      if (!foundedAt) {
        // If we're reprocessing suspect dates and didn't find real data, clear the wrong date
        if (reprocessSuspect && company.foundedAt) {
          const existingYear = company.foundedAt.getFullYear();
          // Only clear if it's 2020+ (suspect)
          if (existingYear >= 2020) {
            if (!dryRun) {
              await prisma.company.update({
                where: { id: company.id },
                data: { foundedAt: null },
              });
              updated++;
            }
            updates.push({
              id: company.id,
              name: company.name,
              source: "cleared_suspect",
              foundedAt: "null",
            });
          }
        }
        // Skip this company - don't update it
        continue;
      }

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
      reprocessSuspect,
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
