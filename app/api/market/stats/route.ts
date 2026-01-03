/**
 * Market Statistics API
 * 
 * Returns total market cap and historical data
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL = 300; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const cacheKey = "market:stats";
    
    // Try cache first
    const cached = await kv.get<{
      currentTotal: number;
      changePercent: number;
      history: Array<{ date: string; totalMarketCap: number }>;
    }>(cacheKey);
    
    if (cached) {
      return NextResponse.json({ ok: true, ...cached });
    }

    // Calculate current total market cap
    const currentStats = await prisma.company.aggregate({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        marketCap: { not: null },
      },
      _sum: { marketCap: true },
    });

    const currentTotal = currentStats._sum.marketCap ? Number(currentStats._sum.marketCap) : 0;

    // Fetch historical data from KV (daily snapshots)
    const history: Array<{ date: string; totalMarketCap: number }> = [];
    const now = new Date();
    
    // Get last 30 days of snapshots
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      
      const snapshot = await kv.get<number>(`market:cap:snapshot:${dateKey}`);
      if (snapshot) {
        history.push({
          date: dateKey,
          totalMarketCap: snapshot,
        });
      }
    }

    // If we have history, calculate percentage change
    let changePercent: number | null = null;
    if (history.length >= 2) {
      const previous = history[history.length - 2]!.totalMarketCap;
      const current = history[history.length - 1]!.totalMarketCap;
      if (previous > 0) {
        changePercent = ((current - previous) / previous) * 100;
      }
    } else if (history.length === 1) {
      // Compare with current if only one snapshot
      const previous = history[0]!.totalMarketCap;
      if (previous > 0) {
        changePercent = ((currentTotal - previous) / previous) * 100;
      }
    }

    // Add current total to history if not already there
    const todayKey = now.toISOString().split("T")[0];
    if (history.length === 0 || history[history.length - 1]!.date !== todayKey) {
      history.push({
        date: todayKey,
        totalMarketCap: currentTotal,
      });
    }

    const result = {
      ok: true,
      currentTotal,
      changePercent,
      history,
    };

    // Cache result
    await kv.set(cacheKey, result, { ex: CACHE_TTL });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[market/stats] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
