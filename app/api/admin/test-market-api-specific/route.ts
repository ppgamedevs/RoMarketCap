/**
 * Test market API for specific companies
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    // Fetch page 2 where SIFs should appear
    const response = await fetch(`${baseUrl}/api/market?page=2&pageSize=50&lang=ro&sort=marketCap`, {
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
    const sifCompanies = data.companies.filter((c: any) => 
      c.name.includes("SIF") || 
      c.name.includes("Visual Fan") || 
      c.name.includes("Norofert") || 
      c.name.includes("2Performant") || 
      c.name.includes("SafeTech")
    );

    return NextResponse.json({
      ok: true,
      page: data.page,
      totalPages: data.totalPages,
      totalCompanies: data.total,
      companiesOnPage: data.companies.length,
      sifCompanies: sifCompanies.map((c: any) => ({
        rank: c.rank,
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
        dataConfidence: c.dataConfidence,
      })),
      allCompaniesRanks: data.companies.map((c: any, idx: number) => ({
        rank: c.rank || (data.page - 1) * 50 + idx + 1,
        name: c.name,
        marketCap: c.marketCap,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-market-api-specific] Error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
