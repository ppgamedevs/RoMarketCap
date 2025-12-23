import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth" });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  const userId = session.user.id;

  const [user, watchlist, alertRules, comparisons, newsletter, partnerLeads, correctionRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isPremium: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      include: { company: { select: { id: true, slug: true, name: true, cui: true } } },
    }),
    prisma.userAlertRule.findMany({ where: { userId } }),
    prisma.savedComparison.findMany({ where: { userId } }),
    prisma.newsletterSubscriber.findUnique({ where: { email: session.user.email ?? undefined } }),
    prisma.partnerLead.findMany({ where: { email: session.user.email ?? undefined } }),
    prisma.correctionRequest.findMany({ where: { email: session.user.email ?? undefined } }),
    // API keys are not directly linked to users in current schema
    // If they were, we'd query them here
    Promise.resolve([]),
  ]);

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const exportData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      isPremium: user.isPremium,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
    },
    watchlist: watchlist.map((w) => ({
      companyId: w.company.id,
      companySlug: w.company.slug,
      companyName: w.company.name,
      companyCui: w.company.cui,
      addedAt: w.createdAt,
    })),
    alertRules: alertRules.map((r) => ({
      id: r.id,
      name: r.name,
      metric: r.metric,
      operator: r.operator,
      threshold: r.threshold,
      scope: r.scope,
      companyId: r.companyId,
      industrySlug: r.industrySlug,
      countySlug: r.countySlug,
      lookbackDays: r.lookbackDays,
      active: r.active,
      createdAt: r.createdAt,
    })),
    comparisons: comparisons.map((c) => ({
      id: c.id,
      name: c.name,
      cuis: c.cuis,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    newsletter: newsletter
      ? {
          email: newsletter.email,
          lang: newsletter.lang,
          status: newsletter.status,
          createdAt: newsletter.createdAt,
          confirmedAt: newsletter.confirmedAt,
        }
      : null,
    partnerLeads: partnerLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      useCase: l.useCase,
      message: l.message,
      status: l.status,
      createdAt: l.createdAt,
    })),
    correctionRequests: correctionRequests.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyCui: r.companyCui,
      name: r.name,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    })),
    apiKeys: [], // API keys are not directly linked to users in current schema
    exportedAt: new Date().toISOString(),
  };

  const filename = `romarketcap-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...rl.headers,
    },
  });
}

