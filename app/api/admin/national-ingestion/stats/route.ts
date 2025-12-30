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
    const errorSummaryRaw = await prisma.nationalIngestError.groupBy({
      by: ["sourceType"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      _count: {
        _all: true,
      },
    });

    // Sort by count descending (manually since Prisma's orderBy for groupBy is limited)
    errorSummaryRaw.sort((a, b) => (b._count._all || 0) - (a._count._all || 0));

    // Ensure sourceType is always a string (handle both string and object cases)
    const errorSummary = errorSummaryRaw.map((e) => {
      let sourceTypeStr: string;
      if (typeof e.sourceType === "string") {
        sourceTypeStr = e.sourceType;
      } else if (e.sourceType && typeof e.sourceType === "object") {
        // If it's an object, try to extract the key or stringify it safely
        const keys = Object.keys(e.sourceType);
        sourceTypeStr = keys.length > 0 ? keys[0] : "UNKNOWN";
      } else {
        sourceTypeStr = "UNKNOWN";
      }
      return {
        sourceType: sourceTypeStr,
        count: e._count._all || 0,
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        lastJob: lastJob ? {
          ...lastJob,
          errorRecords: lastJob.errorRecords.map((e) => {
            let sourceTypeStr: string;
            if (typeof e.sourceType === "string") {
              sourceTypeStr = e.sourceType;
            } else if (e.sourceType && typeof e.sourceType === "object") {
              const keys = Object.keys(e.sourceType);
              sourceTypeStr = keys.length > 0 ? keys[0] : "UNKNOWN";
            } else {
              sourceTypeStr = "UNKNOWN";
            }
            return {
              ...e,
              sourceType: sourceTypeStr,
            };
          }),
        } : null,
        recentJobs,
        checkpoint: checkpointStats,
        currentCursor,
        errorSummary,
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
