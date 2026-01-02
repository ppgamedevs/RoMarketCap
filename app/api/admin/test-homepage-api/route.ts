/**
 * Test the exact API call that homepage makes
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    // Test the exact call homepage makes: /api/market?page=1&pageSize=50&sort=marketCap
    const response = await fetch(`${baseUrl}/api/market?page=1&pageSize=50&sort=marketCap&lang=ro`, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: `API returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Find SIF companies
    const sifCompanies = data.rows?.filter((c: any) => 
      c.name?.includes("SIF") || 
      c.name?.includes("Visual Fan") || 
      c.name?.includes("Norofert") || 
      c.name?.includes("2Performant") || 
      c.name?.includes("SafeTech")
    ) || [];

    // Check first 10 companies
    const firstTen = data.rows?.slice(0, 10).map((c: any) => ({
      rank: c.rank,
      name: c.name,
      marketCap: c.marketCap,
      romcAiScore: c.romcAiScore,
      isListed: c.isListed,
      stockSymbol: c.stockSymbol,
    })) || [];

    return NextResponse.json({
      ok: true,
      total: data.total,
      rowsReturned: data.rows?.length || 0,
      sort: "marketCap",
      sifCompaniesFound: sifCompanies.length,
      sifCompanies: sifCompanies.map((c: any) => ({
        rank: c.rank,
        name: c.name,
        marketCap: c.marketCap,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
      })),
      firstTen,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-homepage-api] Error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
