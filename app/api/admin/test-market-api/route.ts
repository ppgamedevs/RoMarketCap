/**
 * Test what the market API actually returns
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    // Call the market API
    const response = await fetch(`${baseUrl}/api/market?pageSize=20&sort=marketCap`, {
      cache: "no-store",
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      ok: true,
      apiResponse: data,
      companies: data.rows?.slice(0, 10).map((r: any) => ({
        rank: r.rank,
        name: r.name,
        cui: r.cui,
        marketCap: r.marketCap,
        confidence: r.dataConfidence,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
