/**
 * Market Cap Snapshot Cron Job
 * 
 * Daily snapshot of total market cap for historical tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { requireCronSecret } from "@/src/lib/security/cronGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = requireCronSecret(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  try {
    // Calculate current total market cap
    const stats = await prisma.company.aggregate({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        marketCap: { not: null },
      },
      _sum: { marketCap: true },
    });

    const totalMarketCap = stats._sum.marketCap ? Number(stats._sum.marketCap) : 0;

    // Store snapshot in KV with today's date as key
    const today = new Date();
    const dateKey = today.toISOString().split("T")[0];
    const snapshotKey = `market:cap:snapshot:${dateKey}`;

    await kv.set(snapshotKey, totalMarketCap, { ex: 60 * 60 * 24 * 90 }); // Keep for 90 days

    // Also store in a list for easy retrieval
    await kv.lpush("market:cap:snapshots", JSON.stringify({ date: dateKey, totalMarketCap }));
    await kv.ltrim("market:cap:snapshots", 0, 89); // Keep last 90 days
    await kv.expire("market:cap:snapshots", 60 * 60 * 24 * 90);

    return NextResponse.json({
      ok: true,
      date: dateKey,
      totalMarketCap,
      message: "Market cap snapshot saved",
    });
  } catch (error) {
    console.error("[cron/market-cap-snapshot] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
