/**
 * PROMPT 61: National Ingestion Stats API
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { prisma } from "@/src/lib/db";
import { readLastRunStats, readCursor } from "@/src/lib/ingestion/national/checkpoint";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check feature flag
    const adminEnabled = await isFlagEnabled("NATIONAL_INGESTION_ADMIN_ENABLED", false);
    if (!adminEnabled) {
      return NextResponse.json(
        { ok: false, error: "National ingestion admin endpoints are disabled via feature flag" },
        { status: 503 }
      );
    }

    // Get last job
    const lastJob = await prisma.nationalIngestJob.findFirst({
      orderBy: { startedAt: "desc" },
      include: {
        errorRecords: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Get recent jobs (last 20)
    const recentJobs = await prisma.nationalIngestJob.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true,
        finishedAt: true,
        status: true,
        mode: true,
        limit: true,
        discovered: true,
        upserted: true,
        errors: true,
      },
    });

    // Get checkpoint stats
    const checkpointStats = await readLastRunStats();
    const currentCursor = await readCursor();

    // Get error summary
    const errorSummary = await prisma.nationalIngestError.groupBy({
      by: ["sourceType"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      _count: true,
      orderBy: {
        _count: {
          sourceType: "desc",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        lastJob,
        recentJobs,
        checkpoint: checkpointStats,
        currentCursor,
        errorSummary: errorSummary.map((e) => ({
          sourceType: e.sourceType,
          count: e._count,
        })),
      },
    });
  } catch (error) {
    console.error("[admin/national-ingestion/stats] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
