/**
 * Update Company Ages
 * 
 * Populates foundedAt from foundedYear where missing, enabling age calculation.
 * Age is calculated on-the-fly from foundedAt, so this ensures more companies have age data.
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
    const batchSize = parseInt(url.searchParams.get("batchSize") || "100");
    const cursor = url.searchParams.get("cursor") || undefined;

    // Fetch companies that have foundedYear but no foundedAt
    const companies = await prisma.company.findMany({
      where: {
        foundedAt: null,
        foundedYear: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        foundedYear: true,
        name: true,
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
    const updates: Array<{ id: string; name: string; foundedYear: number; foundedAt: string }> = [];

    for (const company of companies) {
      if (!company.foundedYear) continue;

      // Set foundedAt to January 1st of the founded year
      const foundedAt = new Date(company.foundedYear, 0, 1);
      
      updates.push({
        id: company.id,
        name: company.name,
        foundedYear: company.foundedYear,
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
      message: dryRun ? "Dry run - no changes made" : `Updated ${updated} companies with foundedAt from foundedYear`,
      dryRun,
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
