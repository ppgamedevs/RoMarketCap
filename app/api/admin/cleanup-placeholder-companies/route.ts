/**
 * PROMPT 63: Cleanup Placeholder Companies
 * 
 * Removes companies with placeholder names and no real data.
 * Keeps only:
 * - Companies with proper names (not "Companie CUI:")
 * - Companies with financial data
 * - Companies with high confidence scores
 * - BVB listed companies
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  return POST();
}

export async function POST(req: Request) {
  try {
    await requireAdminSession().catch(() => null);

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dry") === "1";

    const results = {
      total: 0,
      deleted: 0,
      kept: 0,
      reasons: {
        placeholder: 0,
        noData: 0,
        lowConfidence: 0,
      },
    };

    // Find companies to potentially delete
    const candidates = await prisma.company.findMany({
      where: {
        OR: [
          { name: { startsWith: "Companie CUI:" } },
          { name: { startsWith: "Company CUI:" } },
          { name: { startsWith: "Company " } },
        ],
      },
      select: {
        id: true,
        cui: true,
        name: true,
        dataConfidence: true,
        isListed: true,
        revenueLatest: true,
        profitLatest: true,
        romcScore: true,
        romcAiScore: true,
        financials: {
          select: { id: true },
          take: 1,
        },
        scores: {
          select: { id: true },
          take: 1,
        },
      },
    });

    results.total = candidates.length;

    for (const company of candidates) {
      // Keep if:
      // 1. Listed on BVB
      if (company.isListed) {
        results.kept++;
        continue;
      }

      // 2. Has financial data
      if (company.financials.length > 0 || company.revenueLatest || company.profitLatest) {
        results.kept++;
        continue;
      }

      // 3. Has scores
      if (company.scores.length > 0 || company.romcScore || company.romcAiScore) {
        results.kept++;
        continue;
      }

      // 4. High confidence
      if (company.dataConfidence && company.dataConfidence >= 60) {
        results.kept++;
        continue;
      }

      // Delete this company
      results.deleted++;
      
      if (company.name?.startsWith("Companie CUI:") || company.name?.startsWith("Company CUI:")) {
        results.reasons.placeholder++;
      }
      if (!company.financials.length && !company.revenueLatest) {
        results.reasons.noData++;
      }
      if (!company.dataConfidence || company.dataConfidence < 60) {
        results.reasons.lowConfidence++;
      }

      if (!dryRun) {
        // Delete the company and all related data (cascade)
        await prisma.company.delete({
          where: { id: company.id },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun 
        ? `DRY RUN: Would delete ${results.deleted} companies, keep ${results.kept} companies`
        : `Deleted ${results.deleted} companies, kept ${results.kept} companies`,
      dryRun,
      results,
    });

  } catch (error) {
    console.error("[admin/cleanup-placeholder-companies] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
