import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import Link from "next/link";
import { DashboardWatchlistSummary } from "@/components/dashboard/DashboardWatchlistSummary";
import { DashboardRecentAlerts } from "@/components/dashboard/DashboardRecentAlerts";
import { DashboardAccountStatus } from "@/components/dashboard/DashboardAccountStatus";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { TrackDashboardView } from "@/components/analytics/TrackDashboardView";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Dashboard - RoMarketCap" : "Dashboard - RoMarketCap";
  const description =
    lang === "ro"
      ? "Panou de control personal: watchlist, alerte, status cont și acțiuni rapide."
      : "Personal control panel: watchlist, alerts, account status, and quick actions.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      isPremium: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });
  if (!user) redirect("/login");

  // Watchlist summary with ROMC AI and 30d forecast delta
  const watchlistItems = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: {
      company: {
        select: {
          id: true,
          slug: true,
          name: true,
          cui: true,
          romcAiScore: true,
          romcScore: true,
          lastScoredAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get 30d forecast deltas for watchlist companies
  const companyIds = watchlistItems.map((w) => w.company.id);
  const now = new Date();

  const currentForecasts = await prisma.companyForecast.findMany({
    where: {
      companyId: { in: companyIds },
      modelVersion: "pred-v1",
      horizonDays: 30,
    },
    select: {
      companyId: true,
      forecastScore: true,
      computedAt: true,
    },
  });

  // Recent alerts (last 14 days) from CompanyChangeLog for watched companies
  const recentAlerts = await prisma.companyChangeLog.findMany({
    where: {
      companyId: { in: companyIds },
      createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
    },
    include: {
      company: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Account status
  const referralCredits = await prisma.referralCredit.aggregate({
    where: { userId: user.id, status: "PENDING" },
    _sum: { days: true },
  });
  // Note: API keys are admin-created, not user-owned. Count is 0 for regular users.
  const apiKeyCount = 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <TrackDashboardView />
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? "Dashboard" : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Panou de control personal pentru companiile urmărite"
              : "Personal control panel for tracked companies"}
          </p>
        </div>
        <Link href="/watchlist">
          <Button variant="outline" size="sm">{lang === "ro" ? "Vezi watchlist complet" : "View full watchlist"}</Button>
        </Link>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardWatchlistSummary
          lang={lang}
          items={watchlistItems}
          currentForecasts={currentForecasts}
        />
        <DashboardRecentAlerts lang={lang} alerts={recentAlerts} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardAccountStatus
          lang={lang}
          isPremium={user.isPremium}
          subscriptionStatus={user.subscriptionStatus}
          currentPeriodEnd={user.currentPeriodEnd}
          referralCreditDays={referralCredits._sum.days ?? 0}
          apiKeyCount={apiKeyCount}
        />
        <DashboardQuickActions lang={lang} isPremium={user.isPremium} />
      </div>
    </main>
  );
}

