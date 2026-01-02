/**
 * Find duplicate companies by name
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Find companies with similar names (SIF, Visual Fan, etc.)
    const sifNames = [
      "SIF Oltenia",
      "SIF Transilvania",
      "SIF Muntenia",
      "SIF Moldova",
      "SIF Banat",
      "Visual Fan",
      "Norofert",
      "2Performant",
      "SafeTech",
    ];

    const duplicates = [];

    for (const namePattern of sifNames) {
      const companies = await prisma.company.findMany({
        where: {
          name: {
            contains: namePattern,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          cui: true,
          name: true,
          marketCap: true,
          isListed: true,
          stockSymbol: true,
          dataConfidence: true,
        },
        orderBy: { marketCap: "desc" },
      });

      if (companies.length > 1) {
        duplicates.push({
          namePattern,
          count: companies.length,
          companies: companies.map(c => ({
            cui: c.cui,
            name: c.name,
            marketCap: c.marketCap ? Number(c.marketCap) : null,
            isListed: c.isListed,
            stockSymbol: c.stockSymbol,
            dataConfidence: c.dataConfidence,
          })),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      duplicates,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[find-duplicate-companies] Error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
