import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getMarketingMetrics } from "@/src/lib/marketing/metrics";
import { fetchPlausibleStats } from "@/src/lib/marketing/plausible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketing/metrics
 * Returns marketing KPIs with WoW and MoM deltas
 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [dbMetrics, plausibleStats] = await Promise.all([
      getMarketingMetrics(),
      fetchPlausibleStats(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? ""),
    ]);

    // Merge Plausible stats if available
    if (plausibleStats) {
      dbMetrics.organicTraffic = plausibleStats.organicTraffic;
      dbMetrics.brandSearchTraffic = plausibleStats.brandSearchTraffic;
    }

    return NextResponse.json({ ok: true, metrics: dbMetrics });
  } catch (error) {
    console.error("[marketing] Error fetching metrics:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch metrics" }, { status: 500 });
  }
}

