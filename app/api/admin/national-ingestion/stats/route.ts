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

    // Get top companies by public money (sum of contract values)
    // Use raw SQL to aggregate contract values per company
    const topByPublicMoneyRaw = await prisma.$queryRaw<Array<{
      company_id: string;
      company_slug: string;
      company_name: string;
      company_cui: string | null;
      source_name: string;
      total_value: bigint | number;
      max_contract_value: bigint | number | null;
      max_contract_year: number | null;
      max_contracting_authority: string | null;
    }>>`
      SELECT 
        c.id::text as company_id,
        c.slug as company_slug,
        c.name as company_name,
        c.cui as company_cui,
        cp.source_name,
        COALESCE(SUM(cp.contract_value), 0) as total_value,
        MAX(cp.contract_value) as max_contract_value,
        MAX(cp.contract_year) as max_contract_year,
        MAX(cp.contracting_authority) as max_contracting_authority
      FROM company_provenance cp
      JOIN companies c ON cp.company_id = c.id
      WHERE cp.contract_value IS NOT NULL
      GROUP BY c.id, c.slug, c.name, c.cui, cp.source_name
      ORDER BY total_value DESC
      LIMIT 20
    `;

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
      topByPublicMoney: topByPublicMoneyRaw.map((p) => ({
        company: {
          id: p.company_id,
          slug: p.company_slug,
          name: p.company_name,
          cui: p.company_cui,
        },
        source: p.source_name,
        totalValue: p.total_value ? String(p.total_value) : null,
        contractValue: p.max_contract_value ? String(p.max_contract_value) : null,
        contractYear: p.max_contract_year,
        contractingAuthority: p.max_contracting_authority,
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

