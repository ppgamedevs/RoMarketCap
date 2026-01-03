/**
 * Test Founding Date Fetching
 * 
 * Test endpoint to manually check if founding date fetching works for a specific company.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { fetchFoundingDate } from "@/src/lib/connectors/foundingDate/fetchFoundingDate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const companyName = url.searchParams.get("name") || "MedLife";
    const website = url.searchParams.get("website") || null;
    const skipCache = url.searchParams.get("skipCache") === "true";

    console.log(`[test-founding-date] Testing for: "${companyName}" (website: ${website || "none"})`);

    const startTime = Date.now();
    const result = await fetchFoundingDate(companyName, website, { skipCache });
    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      companyName,
      website,
      skipCache,
      result: result ? result.toISOString() : null,
      year: result ? result.getFullYear() : null,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error("[test-founding-date] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
