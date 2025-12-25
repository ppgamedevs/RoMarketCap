import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get last run times
    const lastSeap = await kv.get<string>("cron:last:ingest-national:SEAP").catch(() => null);
    const lastEuFunds = await kv.get<string>("cron:last:ingest-national:EU_FUNDS").catch(() => null);

    // Get stats
    const seapStats = await kv.get<string>("cron:stats:ingest-national:SEAP").catch(() => null);
    const euFundsStats = await kv.get<string>("cron:stats:ingest-national:EU_FUNDS").catch(() => null);

    // Get companies discovered via each source
    const seapCompanies = await prisma.companyProvenance.count({
      where: { sourceName: "SEAP" },
    });

    const euFundsCompanies = await prisma.companyProvenance.count({
      where: { sourceName: "EU_FUNDS" },
    });

    // Get top companies by public money (totalValue)
    const topByPublicMoney = await prisma.companyProvenance.findMany({
      where: {
        totalValue: { not: null },
      },
      orderBy: { totalValue: "desc" },
      take: 20,
      select: {
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
            cui: true,
          },
        },
        sourceName: true,
        totalValue: true,
        contractValue: true,
        contractYear: true,
        contractingAuthority: true,
      },
    });

    // Get recent errors (from last 24h)
    const recentErrors = await prisma.importItem.findMany({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        externalId: true,
        error: true,
        createdAt: true,
        importRun: {
          select: {
            source: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      lastRuns: {
        SEAP: lastSeap,
        EU_FUNDS: lastEuFunds,
      },
      stats: {
        SEAP: seapStats ? JSON.parse(seapStats) : null,
        EU_FUNDS: euFundsStats ? JSON.parse(euFundsStats) : null,
      },
      companiesDiscovered: {
        SEAP: seapCompanies,
        EU_FUNDS: euFundsCompanies,
      },
      topByPublicMoney: topByPublicMoney.map((p) => ({
        company: p.company,
        source: p.sourceName,
        totalValue: p.totalValue?.toString() || null,
        contractValue: p.contractValue?.toString() || null,
        contractYear: p.contractYear,
        contractingAuthority: p.contractingAuthority,
      })),
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        externalId: e.externalId,
        error: e.error,
        source: e.importRun.source,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin:national-ingestion] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

