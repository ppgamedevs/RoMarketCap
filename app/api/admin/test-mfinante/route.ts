/**
 * Test endpoint for MFinante connector
 * Used to debug and verify HTML parsing
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { fetchCompanyDataFromMFinante } from "@/src/lib/connectors/mfinante/fetchCompanyData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const cui = url.searchParams.get("cui");

    if (!cui) {
      return NextResponse.json({
        ok: false,
        error: "Missing cui parameter. Use ?cui=12345678",
        example: "/api/admin/test-mfinante?cui=5022670",
      }, { status: 400 });
    }

    const skipCache = url.searchParams.get("skipCache") === "true";

    const data = await fetchCompanyDataFromMFinante(cui, { skipCache });

    return NextResponse.json({
      ok: true,
      cui,
      skipCache,
      data: data ? {
        ...data,
        foundingDate: data.foundingDate?.toISOString(),
        registrationDate: data.registrationDate?.toISOString(),
        fetchedAt: data.fetchedAt.toISOString(),
      } : null,
      note: data
        ? "Successfully fetched data from mfinante.gov.ro"
        : "No data found or parsing failed. Check HTML structure may have changed.",
    });
  } catch (error) {
    console.error("[admin/test-mfinante] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      hint: error instanceof Error && error.message.includes("Rate limit")
        ? "Wait 2 seconds and try again"
        : "Check if mfinante.gov.ro is accessible and CUI is valid",
    }, { status: 500 });
  }
}
