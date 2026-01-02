/**
 * Test market API for specific companies
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    // Fetch page 1 to see what companies appear
    const response = await fetch(`${baseUrl}/api/market?page=1&pageSize=100&lang=ro&sort=marketCap`, {
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

    // Check if data has rows
    if (!data.rows || !Array.isArray(data.rows)) {
      return NextResponse.json({
        ok: false,
        error: "No rows in API response",
        data,
      });
    }

    // Find SIF companies
    const sifCompanies = data.rows.filter((c: any) => 
      c.name?.includes("SIF") || 
      c.name?.includes("Visual Fan") || 
      c.name?.includes("Norofert") || 
      c.name?.includes("2Performant") || 
      c.name?.includes("SafeTech")
    );

    return NextResponse.json({
      ok: true,
      page: data.page,
      totalCompanies: data.total,
      companiesOnPage: data.rows.length,
      freeLimit: data.freeLimit,
      sifCompaniesFound: sifCompanies.length,
      sifCompanies: sifCompanies.map((c: any) => ({
        rank: c.rank,
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
        dataConfidence: c.dataConfidence,
      })),
      lastTenCompanies: data.rows.slice(-10).map((c: any, idx: number) => ({
        rank: data.rows.length - 10 + idx + 1,
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap,
        dataConfidence: c.dataConfidence,
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
