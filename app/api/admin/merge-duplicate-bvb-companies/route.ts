/**
 * Merge duplicate BVB companies - keep the one with marketCap, mark others as merged
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") !== "false"; // Default to true for safety

    // Map of duplicate groups: [CUI without marketCap, CUI with marketCap]
    const duplicatesToMerge: Array<[string, string]> = [
      // SIF Oltenia: keep 2689271 (with marketCap), merge 2593304
      ["2593304", "2689271"],
      // SIF Transilvania: keep 3047687 (with marketCap), merge 3551379
      ["3551379", "3047687"],
      // SIF Moldova: keep 2816954 (with marketCap), merge 2816989
      ["2816989", "2816954"],
      // Visual Fan: keep 5765547 (with marketCap), merge 6719590
      ["6719590", "5765547"],
      // Norofert: keep 34270612 (with marketCap), merge 27738763
      ["27738763", "34270612"],
      // 2Performant: keep 26405652 (with marketCap), merge 28721210
      ["28721210", "26405652"],
      // SafeTech: keep 37282445 (with marketCap), merge 28239696
      ["28239696", "37282445"],
    ];

    const results = {
      total: duplicatesToMerge.length,
      merged: 0,
      errors: 0,
      errorDetails: [] as Array<{ cui: string; error: string }>,
    };

    for (const [cuiToMerge, cuiToKeep] of duplicatesToMerge) {
      try {
        // Verify both companies exist
        const toMerge = await prisma.company.findUnique({
          where: { cui: cuiToMerge },
          select: { id: true, name: true, marketCap: true },
        });

        const toKeep = await prisma.company.findUnique({
          where: { cui: cuiToKeep },
          select: { id: true, name: true, marketCap: true },
        });

        if (!toMerge) {
          results.errors++;
          results.errorDetails.push({ cui: cuiToMerge, error: "Company not found" });
          continue;
        }

        if (!toKeep) {
          results.errors++;
          results.errorDetails.push({ cui: cuiToKeep, error: "Target company not found" });
          continue;
        }

        if (!dryRun) {
          // Mark duplicate as merged
          await prisma.company.update({
            where: { cui: cuiToMerge },
            data: {
              mergedIntoCompanyId: toKeep.id,
              isPublic: false, // Hide from public listings
            },
          });
        }

        results.merged++;
        console.log(`[merge-duplicate-bvb] ${dryRun ? "Would merge" : "Merged"} ${toMerge.name} (${cuiToMerge}) into ${toKeep.name} (${cuiToKeep})`);

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ cui: cuiToMerge, error: errorMsg });
        console.error(`[merge-duplicate-bvb] Error merging ${cuiToMerge}:`, error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun 
        ? `Dry run: Would merge ${results.merged} duplicate companies`
        : `Merged ${results.merged} duplicate companies`,
      dryRun,
      ...results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[merge-duplicate-bvb-companies] Fatal error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
