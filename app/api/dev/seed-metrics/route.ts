import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { scoreCompanyV0 } from "@/src/lib/scoring/scoreCompany";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

function todayUtcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  const existing = await prisma.companyMetrics.count();
  if (existing > 0) {
    return NextResponse.json({ ok: false, error: "Metrics already exist" }, { status: 409 });
  }

  const companies = await prisma.company.findMany({ take: 10, orderBy: { slug: "asc" } });
  const now = new Date();
  const asOfDate = todayUtcDate(now);

  for (const c of companies) {
    const h = hashSlug(c.slug);
    const employees = (h % 500) + 5;
    const revenue = 5_000_000 + (h % 80_000_000);
    const profit = Math.round(revenue * (0.03 + ((h >>> 8) % 12) / 100));
    const traffic = (h % 500_000) + 1000;
    const mentions = (h % 200) + 1;
    const seapValue = (h % 10) === 0 ? 0 : (h % 30_000_000);
    const seapCount = seapValue > 0 ? (h % 200) : 0;
    const linkedinFollowers = (h % 50_000) + 100;
    const linkedinGrowth90d = ((h % 170) - 20) / 100; // -0.2..1.5-ish
    const fundingSignals = (h % 5) === 0 ? 1 : 0;

    const metrics = await prisma.companyMetrics.create({
      data: {
        companyId: c.id,
        employeesCount: employees,
        revenueLastYear: revenue,
        profitLastYear: profit,
        seapContractsCount: seapCount,
        seapContractsValue: seapValue,
        linkedinFollowers,
        linkedinGrowth90d,
        websiteTrafficMonthly: traffic,
        mentions30d: mentions,
        fundingSignals,
      },
    });

    const scored = scoreCompanyV0({
      company: { id: c.id, slug: c.slug, name: c.name, website: c.website },
      metrics,
      now,
    });

    await prisma.companyScoreSnapshot.create({
      data: {
        companyId: c.id,
        asOfDate,
        romcScore: scored.romcScore,
        romcAiScore: scored.romcAiScore,
        confidence: scored.confidence,
        componentsJson: scored.components as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ ok: true, createdCompanies: companies.length });
}


