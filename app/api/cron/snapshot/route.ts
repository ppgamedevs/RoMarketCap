import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_SNAPSHOT", true);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Snapshot cron is disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const lockId = await acquireLockWithRetry("cron:snapshot", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeSnapshot();
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:snapshot", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/snapshot", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeSnapshot() {
  const now = new Date();

  // Collect snapshot data
  const companyCount = await prisma.company.count();

  const avgRomcResult = await prisma.company.aggregate({
    _avg: { romcScore: true },
    where: { romcScore: { not: null } },
  });
  const avgRomcScore = avgRomcResult._avg.romcScore;

  // Forecast distribution (count by horizon days)
  const forecastCounts = await prisma.companyForecast.groupBy({
    by: ["horizonDays"],
    _count: { id: true },
    where: { modelVersion: "pred-v1" },
  });
  const forecastDistribution = forecastCounts.map((f) => ({
    horizonDays: f.horizonDays,
    count: f._count.id,
  }));

  // Integrity score distribution (buckets)
  const integrityScores = await prisma.company.findMany({
    where: { romcScore: { not: null } },
    select: { romcScore: true },
    take: 10000, // Sample for distribution
  });
  const buckets = [0, 20, 40, 60, 80, 100];
  const integrityDist: Record<string, number> = {};
  for (let i = 0; i < buckets.length - 1; i++) {
    const min = buckets[i]!;
    const max = buckets[i + 1]!;
    const count = integrityScores.filter((s) => s.romcScore != null && s.romcScore >= min && s.romcScore < max).length;
    integrityDist[`${min}-${max}`] = count;
  }

  // Create snapshot
  const snapshot = await prisma.systemSnapshot.create({
    data: {
      companyCount,
      avgRomcScore: avgRomcScore != null ? new Prisma.Decimal(avgRomcScore) : null,
      forecastDistribution: forecastDistribution as Prisma.InputJsonValue,
      integrityScoreDist: integrityDist as Prisma.InputJsonValue,
      metadata: {
        timestamp: now.toISOString(),
        sampleSize: integrityScores.length,
      } as Prisma.InputJsonValue,
    },
  });

  // Store last snapshot timestamp in KV
  await kv.set("cron:last:snapshot", now.toISOString(), { ex: 60 * 60 * 24 * 30 }).catch(() => null);

  // Cleanup old snapshots (keep last 30 days)
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  await prisma.systemSnapshot.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({
    ok: true,
    snapshotId: snapshot.id,
    companyCount,
    avgRomcScore: avgRomcScore ?? null,
    createdAt: snapshot.createdAt.toISOString(),
  });
}

