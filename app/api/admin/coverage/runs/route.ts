/**
 * PROMPT 56: Recent ingestion runs API
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get stats from KV
    const statsJson = await kv.get<string>("cron:stats:ingest-national").catch(() => null);
    const lastRun = await kv.get<string>("cron:last:ingest-national").catch(() => null);

    const runs: Array<{
      timestamp: string;
      processed: number;
      created: number;
      updated: number;
      errors: number;
      duration: number;
      perSource?: Record<string, unknown>;
    }> = [];

    if (statsJson) {
      try {
        const stats = JSON.parse(statsJson);
        runs.push({
          timestamp: stats.timestamp || lastRun || new Date().toISOString(),
          processed: stats.processed || 0,
          created: stats.created || 0,
          updated: stats.updated || 0,
          errors: stats.errors || 0,
          duration: stats.duration || 0,
          perSource: stats.perSource,
        });
      } catch (e) {
        console.error("Failed to parse stats:", e);
      }
    }

    // Also check per-source last runs
    const sources = ["SEAP", "EU_FUNDS", "ANAF_VERIFY", "THIRD_PARTY"];
    for (const source of sources) {
      const sourceLast = await kv.get<string>(`cron:last:ingest-national:${source}`).catch(() => null);
      if (sourceLast) {
        runs.push({
          timestamp: sourceLast,
          processed: 0,
          created: 0,
          updated: 0,
          errors: 0,
          duration: 0,
        });
      }
    }

    // Sort by timestamp desc
    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ ok: true, runs: runs.slice(0, 30) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

