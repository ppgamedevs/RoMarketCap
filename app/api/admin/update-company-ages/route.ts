/**
 * Update Company Ages
 * 
 * Populates foundedAt from foundedYear where missing, enabling age calculation.
 * Age is calculated on-the-fly from foundedAt, so this ensures more companies have age data.
 * 
 * Strategy:
 * 1. First, populate from foundedYear (if exists)
 * 2. Optionally fetch from ANAF (if useAnaf=true and CUI exists)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";

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
    const useAnaf = url.searchParams.get("useAnaf") === "true"; // Fetch from ANAF if missing
    const batchSize = parseInt(url.searchParams.get("batchSize") || "100");
    const cursor = url.searchParams.get("cursor") || undefined;

    // Strategy 1: Companies with foundedYear but no foundedAt
    const companiesWithYear = await prisma.company.findMany({
      where: {
        foundedAt: null,
        foundedYear: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        foundedYear: true,
        name: true,
        cui: true,
      },
      orderBy: { id: "asc" },
      take: batchSize,
    });

    let updated = 0;
    const updates: Array<{ id: string; name: string; source: string; foundedAt: string }> = [];
    const errors: Array<{ id: string; name: string; error: string }> = [];

    // Process companies with foundedYear
    for (const company of companiesWithYear) {
      if (!company.foundedYear) continue;

      // Set foundedAt to January 1st of the founded year
      const foundedAt = new Date(company.foundedYear, 0, 1);
      
      updates.push({
        id: company.id,
        name: company.name,
        source: "foundedYear",
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

    // Strategy 2: If useAnaf=true, also try fetching from ANAF for companies without foundedAt or foundedYear
    if (useAnaf && companiesWithYear.length < batchSize) {
      const remaining = batchSize - companiesWithYear.length;
      const companiesWithoutDate = await prisma.company.findMany({
        where: {
          foundedAt: null,
          foundedYear: null,
          cui: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: {
          id: true,
          name: true,
          cui: true,
        },
        orderBy: { id: "asc" },
        take: remaining,
      });

      // Rate limit: 1 request per second for ANAF
      for (const company of companiesWithoutDate) {
        if (!company.cui) continue;

        try {
          // Small delay to respect rate limit
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const anafResult = await verifyCompanyANAF(company.cui);
          
          // ANAF doesn't currently return foundedAt, but we can check rawResponse
          // For now, skip ANAF fetching as it doesn't provide this data
          // This is a placeholder for future enhancement
          
        } catch (error) {
          errors.push({
            id: company.id,
            name: company.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    if (companiesWithYear.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No more companies to process",
        done: true,
        dryRun,
        processed: 0,
        updated: 0,
      });
    }

    const lastId = companiesWithYear[companiesWithYear.length - 1]?.id;

    return NextResponse.json({
      ok: true,
      message: dryRun ? "Dry run - no changes made" : `Updated ${updated} companies with foundedAt from foundedYear`,
      dryRun,
      processed: companiesWithYear.length,
      updated,
      sample: updates.slice(0, 10),
      errors: errors.slice(0, 5),
      nextCursor: lastId,
      done: companiesWithYear.length < batchSize,
    });
  } catch (error) {
    console.error("[admin/update-company-ages] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
