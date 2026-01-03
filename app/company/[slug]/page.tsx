import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/seo/site";
import { CompanyHeader } from "@/components/layout/CompanyHeader";
import { MetricCard } from "@/components/layout/MetricCard";
import { VerificationBadge } from "@/components/company/VerificationBadge";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";
import { Sparkline } from "@/components/charts/Sparkline";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { PremiumPanel } from "@/components/company/PremiumPanel";
import { ClaimSubmitPanel } from "@/components/company/ClaimSubmitPanel";
import { ClaimCtas } from "@/components/company/ClaimCtas";
import { TrackCompanyView } from "@/components/analytics/TrackCompanyView";
import Link from "next/link";
import { ForecastPanel } from "@/components/company/ForecastPanel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { getPlacementsForLocation } from "@/src/lib/placements";
import { Placements } from "@/components/placements/Placements";
import { getSupportEmail } from "@/src/lib/supportEmail";
import { CorrectionRequestForm } from "@/components/company/CorrectionRequestForm";
import { RelatedCompanies } from "@/components/company/RelatedCompanies";
import { RecentChanges } from "@/components/company/RecentChanges";
import { IntegrityIndicators } from "@/components/company/IntegrityIndicators";
import { ScoreExplanation } from "@/components/company/ScoreExplanation";
import { FreshnessIndicator } from "@/components/company/FreshnessIndicator";
import { getOrSetPageCache, getLangForCache, isAdminForCache, PAGE_CACHE_TTLS } from "@/src/lib/cache/pageCache";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";
import { Metric } from "@/components/ui/Metric";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { SourceId } from "@/src/lib/ingestion/types";
import { FinancialsCard } from "@/components/company/FinancialsCard";
import { CompanyFinancialDataSource } from "@prisma/client";
import { FinancialCharts } from "@/components/company/FinancialCharts";
import { NewsFeed } from "@/components/company/NewsFeed";
import { ActivityFeed } from "@/components/company/ActivityFeed";
import { CompetitorsTable } from "@/components/company/CompetitorsTable";
import { SimilarCompaniesWidget } from "@/components/company/SimilarCompaniesWidget";
import { SocialStats } from "@/components/company/SocialStats";
import {
  generateCompanyMarketPosition,
  generateGrowthAnalysis,
  generateCompetitiveLandscape,
  generateIndustryContext,
  generateKeyInsights,
} from "@/src/lib/ai/contentGeneration";
import { generateCompanyFAQs, generateFAQSchema } from "@/src/lib/seo/generateCompanyFAQs";
import { ROMCAIAssistant } from "@/components/ai/ROMCAIAssistant";
import { AITooltip } from "@/components/ai/AITooltip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatMoney(n: unknown, currency: string, locale: string): string {
  if (n == null) return "N/A";
  const num = typeof n === "number" ? n : Number(String(n));
  if (!Number.isFinite(num)) return "N/A";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
}

function riskFlagsForCompany(c: {
  website?: string | null;
  caenCode?: string | null;
  employeeCountEstimate?: number | null;
}): string[] {
  const flags: string[] = [];
  if (!c.website) flags.push("MISSING_WEBSITE");
  if (!c.caenCode) flags.push("MISSING_CAEN");
  if (!c.employeeCountEstimate) flags.push("MISSING_EMPLOYEE_COUNT");
  if (c.employeeCountEstimate != null && c.employeeCountEstimate < 5) flags.push("LOW_EMPLOYEE_COUNT");
  return flags;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlugOrThrow(slug);

  const lang = await getLangFromRequest();
  const title =
    lang === "ro"
      ? `${company.name} (${company.cui ?? "N/A"}) - ROMC Score si evaluare - RoMarketCap`
      : `${company.name} (${company.cui ?? "N/A"}) - ROMC score and valuation - RoMarketCap`;

  const score = company.romcScore ?? 0;
  const conf = company.romcConfidence ?? 0;
  const vLow = company.valuationRangeLow ? Number(String(company.valuationRangeLow)) : null;
  const vHigh = company.valuationRangeHigh ? Number(String(company.valuationRangeHigh)) : null;
  const vText = vLow != null && vHigh != null ? `${vLow}-${vHigh} EUR` : "N/A";
  const last = company.lastScoredAt ? company.lastScoredAt.toISOString().slice(0, 10) : "N/A";

  const description =
    lang === "ro"
      ? `ROMC Score ${score}/100, încredere ${conf}/100, interval evaluare ${vText}, ultima calculare ${last}. ${t(lang, "disclaimer")}`
      : `ROMC score ${score}/100, confidence ${conf}/100, valuation range ${vText}, last computed ${last}. ${t(lang, "disclaimer")}`;

  const base = getSiteUrl();
  // Use canonicalSlug if available, otherwise use slug
  const canonicalSlug = company.canonicalSlug ?? company.slug;
  const canonical = `${base}/company/${encodeURIComponent(canonicalSlug)}`;
  const ogImage = `${canonical}/opengraph-image`;

  // PROMPT 57: Set noindex for skeleton companies with low confidence
  const isSkeleton = company.isSkeleton === true;
  const confidence = company.universeConfidence ?? company.dataConfidence ?? 0;
  const shouldNoIndex = isSkeleton && confidence < 50; // Threshold: 50

  return {
    title,
    description,
    alternates: {
      canonical,
      // Note: Currently single-language site (RO default), but structure supports future EN expansion
      languages: {
        ro: canonical,
        "x-default": canonical,
      },
    },
    robots: shouldNoIndex ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url: canonical, images: [{ url: ogImage }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function CompanyPage({ params }: PageProps) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const session = await getServerSession(authOptions);
  const { slug } = await params;
  const isAdmin = await isAdminForCache();

  // Fetch company (not cached as it's needed for cache key)
  const company = await getCompanyBySlugOrThrow(slug);

  // Redirect to canonical slug if different
  const canonicalSlug = company.canonicalSlug ?? company.slug;
  if (slug !== canonicalSlug) {
    redirect(`/company/${encodeURIComponent(canonicalSlug)}`);
  }

  // Cache public data (bypass for admins)
  // Use canonicalSlug for cache key to ensure consistency
  const cacheKey = {
    page: "company",
    params: { slug: canonicalSlug },
    lang: langForCache,
  };

  type CachedData = {
    related: Array<{ slug: string; name: string; romcScore: number | null; industry: string | null }>;
    metrics: Prisma.CompanyMetricsGetPayload<Record<string, never>> | null;
    latestDaily: Prisma.CompanyScoreSnapshotGetPayload<Record<string, never>> | null;
    history: Prisma.CompanyScoreSnapshotGetPayload<Record<string, never>>[];
    latestYearly: Prisma.CompanyMetricGetPayload<Record<string, never>> | null;
    recentChanges: Prisma.CompanyChangeLogGetPayload<Record<string, never>>[];
  };

  const cachedData = isAdmin
    ? null
    : await getOrSetPageCache<CachedData>(
        cacheKey,
        async () => {
          const [related, metrics, latestDaily, history, latestYearly, recentChanges] = await Promise.all([
            prisma.company.findMany({
              where: {
                id: { not: company.id },
                isPublic: true,
                visibilityStatus: "PUBLIC",
                OR: [
                  ...(company.industrySlug ? [{ industrySlug: company.industrySlug }] : []),
                  ...(company.countySlug ? [{ countySlug: company.countySlug }] : []),
                ],
              },
              orderBy: [{ romcScore: "desc" }],
              take: 6,
              select: { slug: true, name: true, romcScore: true, industry: true },
            }),
            prisma.companyMetrics.findUnique({ where: { companyId: company.id } }),
            prisma.companyScoreSnapshot.findFirst({
              where: { companyId: company.id },
              orderBy: { asOfDate: "desc" },
            }),
            prisma.companyScoreSnapshot.findMany({
              where: { companyId: company.id },
              orderBy: { asOfDate: "desc" },
              take: 30,
            }),
            prisma.companyMetric.findFirst({
              where: { companyId: company.id },
              orderBy: { year: "desc" },
            }),
            prisma.companyChangeLog.findMany({
              where: { companyId: company.id },
              orderBy: { createdAt: "desc" },
              take: 10,
            }),
          ]);

          return {
            related,
            metrics,
            latestDaily,
            history,
            latestYearly,
            recentChanges,
          };
        },
        PAGE_CACHE_TTLS.company,
      );

  // Fetch verification (not cached, always fresh)
  const verification = await prisma.companyVerification.findUnique({
    where: { companyId: company.id },
  });

  // Fetch user-specific data (not cached)
  const isWatched =
    session?.user?.id
      ? (await prisma.watchlistItem.findUnique({ where: { userId_companyId: { userId: session.user.id, companyId: company.id } } })) != null
      : false;

  // Check if company is claimed by current user
  const isClaimed =
    session?.user?.id
      ? (await prisma.companyClaim.findFirst({
          where: {
            companyId: company.id,
            userId: session.user.id,
            status: { in: ["PENDING", "APPROVED"] },
          },
        })) != null
      : false;

  // Use cached or fresh data
  const related = cachedData?.related ?? (await prisma.company.findMany({
    where: {
      id: { not: company.id },
      isPublic: true,
      visibilityStatus: "PUBLIC",
      OR: [
        ...(company.industrySlug ? [{ industrySlug: company.industrySlug }] : []),
        ...(company.countySlug ? [{ countySlug: company.countySlug }] : []),
      ],
    },
    orderBy: [{ romcScore: "desc" }],
    take: 6,
    select: { slug: true, name: true, romcScore: true, industry: true },
  }));
  const metrics = cachedData?.metrics ?? (await prisma.companyMetrics.findUnique({ where: { companyId: company.id } }));
  const latestDaily = cachedData?.latestDaily ?? (await prisma.companyScoreSnapshot.findFirst({
    where: { companyId: company.id },
    orderBy: { asOfDate: "desc" },
  }));
  const history = cachedData?.history ?? (await prisma.companyScoreSnapshot.findMany({
    where: { companyId: company.id },
    orderBy: { asOfDate: "desc" },
    take: 30,
  }));
  const latestYearly = cachedData?.latestYearly ?? (await prisma.companyMetric.findFirst({
    where: { companyId: company.id },
    orderBy: { year: "desc" },
  }));
  const recentChanges = cachedData?.recentChanges ?? (await prisma.companyChangeLog.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  }));

  const placements = await getPlacementsForLocation("company", lang);
  const supportEmail = getSupportEmail();

  // Note: financials are now fetched separately below to handle missing employees column
  const fin = null; // Will use financialSnapshots instead

  // Fetch financial snapshots for FinancialsCard (PROMPT 58)
  const financialSnapshots = await prisma.companyFinancialSnapshot.findMany({
    where: {
      companyId: company.id,
      dataSource: CompanyFinancialDataSource.ANAF_WS,
    },
    orderBy: { fiscalYear: "desc" },
    take: 3,
    select: {
      fiscalYear: true,
      revenue: true,
      profit: true,
      currency: true,
      dataSource: true,
      fetchedAt: true,
      employees: true,
    },
  }).catch((error) => {
    // If employees column doesn't exist yet, fallback to query without it
    console.error("[company-page] Error fetching financial snapshots (employees column may not exist):", error);
    return [];
  });

  const riskFlags = riskFlagsForCompany(company);
  // Use confidence from latestDaily or financialSnapshots, fallback to 50
  const confidence = latestDaily?.confidence ?? (financialSnapshots[0] ? 70 : 50);

  // ROMC v1 is denormalized on Company.
  const romcScore = company.romcScore ?? null;
  const romcConfidence = company.romcConfidence ?? null;

  // Fetch industry stats and competitors for SEO content generation
  let industryStats: { avgScore: number; totalCompanies: number; topScore: number } | undefined;
  let competitors: Array<{ name: string; romcScore: number | null; marketCap: number | null }> = [];
  
  if (company.industrySlug) {
    // Get industry stats
    const industryCompanies = await prisma.company.findMany({
      where: {
        industrySlug: company.industrySlug,
        isPublic: true,
        visibilityStatus: "PUBLIC",
        romcScore: { not: null },
      },
      select: { romcScore: true },
      take: 100,
    });

    if (industryCompanies.length > 0) {
      const scores = industryCompanies.map((c) => c.romcScore ?? 0).filter((s) => s > 0);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const topScore = Math.max(...scores, 0);
      industryStats = {
        avgScore: Math.round(avgScore),
        totalCompanies: industryCompanies.length,
        topScore,
      };
    }

    // Get top competitors (excluding current company)
    const competitorsRaw = await prisma.company.findMany({
      where: {
        industrySlug: company.industrySlug,
        id: { not: company.id },
        isPublic: true,
        visibilityStatus: "PUBLIC",
      },
      orderBy: [{ romcScore: "desc" }],
      take: 5,
      select: {
        name: true,
        romcScore: true,
        marketCap: true,
      },
    });
    competitors = competitorsRaw.map((c) => ({
      name: c.name,
      romcScore: c.romcScore,
      marketCap: c.marketCap ? Number(c.marketCap) : null,
    }));
  }

  // Generate SEO content (cached, async - don't block page render)
  const [marketPosition, growthAnalysis, competitiveLandscape, industryContext, keyInsights] = await Promise.all([
    generateCompanyMarketPosition(company, industryStats).catch(() => null),
    generateGrowthAnalysis(
      company,
      history.map((h) => ({ score: h.romcScore, date: h.asOfDate }))
    ).catch(() => null),
    generateCompetitiveLandscape(company, competitors).catch(() => null),
    generateIndustryContext(company, industryStats ? {
      totalCompanies: industryStats.totalCompanies,
      avgScore: industryStats.avgScore,
      topCompanies: competitors.slice(0, 3).map((c) => ({ name: c.name, score: c.romcScore ?? 0 })),
    } : undefined).catch(() => null),
    generateKeyInsights(company).catch(() => []),
  ]);

  // Generate FAQs
  const faqs = generateCompanyFAQs(company, lang);
  const faqSchema = generateFAQSchema(faqs, company.name);

  const baseUrl = getSiteUrl();
  // canonicalSlug already declared above in redirect check
  const canonical = `${baseUrl}/company/${encodeURIComponent(canonicalSlug)}`;

  // Breadcrumb structured data
  const breadcrumbItems = [
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Companii" : "Companies", url: "/companies" },
    ...(company.industrySlug
      ? [{ name: company.industry ?? company.industrySlug, url: `/industries/${encodeURIComponent(company.industrySlug)}` }]
      : []),
    ...(company.countySlug
      ? [{ name: company.county ?? company.countySlug, url: `/counties/${encodeURIComponent(company.countySlug)}` }]
      : []),
    { name: company.name, url: `/company/${encodeURIComponent(canonicalSlug)}` },
  ];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbItems);

  // Ensure website URL is absolute
  const websiteUrl = company.website
    ? company.website.startsWith("http")
      ? company.website
      : `https://${company.website.replace(/^https?:\/\//, "")}`
    : canonical;

  // Add aggregateRating with ROMC score
  const aggregateRating = company.romcScore !== null ? {
    "@type": "AggregateRating",
    ratingValue: company.romcScore,
    bestRating: 100,
    worstRating: 0,
    ratingCount: 1,
  } : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: websiteUrl,
    aggregateRating,
    sameAs:
      company.socials && typeof company.socials === "object"
        ? Object.values(company.socials as Record<string, unknown>)
            .filter((v): v is string => typeof v === "string" && v.length > 0 && v.startsWith("http"))
            .slice(0, 4)
        : undefined,
    address:
      company.city || company.county
        ? {
            "@type": "PostalAddress",
            streetAddress: company.address ?? undefined,
            addressLocality: company.city ?? undefined,
            addressRegion: company.county ?? undefined,
            addressCountry: company.country ?? "RO",
          }
        : undefined,
    identifier: company.cui ? { "@type": "PropertyValue", name: "CUI", value: company.cui } : undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "ROMC (v1)", value: typeof romcScore === "number" ? romcScore : 0 },
      { "@type": "PropertyValue", name: "Confidence (v1)", value: typeof romcConfidence === "number" ? romcConfidence : 0 },
      ...(typeof company.companyIntegrityScore === "number"
        ? [{ "@type": "PropertyValue", name: "Integrity Score", value: company.companyIntegrityScore }]
        : []),
      ...(typeof company.dataConfidence === "number"
        ? [{ "@type": "PropertyValue", name: "Data Confidence", value: company.dataConfidence }]
        : []),
      {
        "@type": "PropertyValue",
        name: "Valuation range (EUR)",
        value:
          company.valuationRangeLow && company.valuationRangeHigh
            ? `${Number(company.valuationRangeLow)}-${Number(company.valuationRangeHigh)}`
            : "N/A",
      },
      { "@type": "PropertyValue", name: "Last scored", value: company.lastScoredAt?.toISOString().slice(0, 10) ?? "N/A" },
      { "@type": "PropertyValue", name: "Last enriched", value: company.lastEnrichedAt?.toISOString().slice(0, 10) ?? "N/A" },
      { "@type": "PropertyValue", name: "Last updated", value: company.lastUpdatedAt.toISOString().slice(0, 10) },
    ],
    dateModified: company.lastUpdatedAt.toISOString(),
    datePublished: company.createdAt.toISOString(),
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <TrackCompanyView cui={company.cui ?? null} industrySlug={company.industrySlug ?? null} countySlug={company.countySlug ?? null} />
      
      {/* Company Header - Full Width */}
      <CompanyHeader
        locale="ro"
        slug={company.slug}
        name={company.name}
        city={company.city}
        county={company.county}
        industry={company.industry}
        cui={company.cui}
        website={company.website}
      />

      {verification && (
        <div className="mt-4">
          <VerificationBadge
            verification={{
              isActive: verification.isActive,
              isVatRegistered: verification.isVatRegistered,
              lastReportedYear: verification.lastReportedYear,
              verifiedAt: verification.verifiedAt,
              verificationStatus: verification.verificationStatus as "SUCCESS" | "ERROR" | "PENDING",
              errorMessage: verification.errorMessage,
            }}
            lang={lang}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lang === "ro" ? "Watchlist" : "Watchlist"}
        </div>
        <WatchlistButton
          authed={Boolean(session?.user?.id)}
          companyId={company.id}
          initialWatched={isWatched}
        />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Key Metrics - Full Width */}
      <section className="mt-6 grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Metric label="ROMC Score" value={romcScore != null ? `${romcScore}/100` : "N/A"} delta={confidence ? { value: `${confidence}/100`, direction: "up" } : undefined} />
          <AITooltip
            question={lang === "ro" ? "Ce este scorul ROMC?" : "What is ROMC score?"}
            context={lang === "ro" ? `Pentru ${company.name}` : `For ${company.name}`}
            lang={lang}
            variant="icon"
          />
        </div>
        <div className="flex items-center gap-2">
          <Metric label={lang === "ro" ? "Încredere date" : "Data confidence"} value={company.dataConfidence != null ? `${company.dataConfidence}/100` : "N/A"} />
          <AITooltip
            question={lang === "ro" ? "Ce înseamnă confidența datelor?" : "What does data confidence mean?"}
            lang={lang}
            variant="icon"
          />
        </div>
        <div className="flex items-center gap-2">
          <Metric label={lang === "ro" ? "Integritate" : "Integrity"} value={company.companyIntegrityScore != null ? `${company.companyIntegrityScore}/100` : "N/A"} />
          <AITooltip
            question={lang === "ro" ? "Ce înseamnă scorul de integritate?" : "What does integrity score mean?"}
            lang={lang}
            variant="icon"
          />
        </div>
      </section>

      {/* Two-Column Layout */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Main Content - Left Column (70%) */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <section className="grid gap-4 sm:grid-cols-4">
        <MetricCard
          label={t(lang, "valuation_range")}
          value={
            company.valuationRangeLow && company.valuationRangeHigh
              ? `${formatMoney(company.valuationRangeLow, "EUR", lang === "ro" ? "ro-RO" : "en-GB")} - ${formatMoney(company.valuationRangeHigh, "EUR", lang === "ro" ? "ro-RO" : "en-GB")}`
              : "N/A"
          }
          hint={t(lang, "disclaimer")}
        />
        <MetricCard
          label={t(lang, "romc_score")}
          value={romcScore != null ? `${romcScore}/100` : "N/A"}
          hint="v1"
        />
        <MetricCard label={t(lang, "confidence")} value={`${(romcConfidence ?? confidence)}/100`} hint="v1" />
        <MetricCard label="Risk flags" value={riskFlags.length ? `${riskFlags.length}` : "0"} />
          </section>

          {/* Financial Charts */}
          <FinancialCharts
            data={financialSnapshots.map((s) => ({
              year: s.fiscalYear,
              revenue: s.revenue ? Number(String(s.revenue)) : null,
              profit: s.profit ? Number(String(s.profit)) : null,
              employees: s.employees ?? null,
            }))}
            currency={company.currency ?? "EUR"}
            lang={lang}
          />

          {/* Score Explanation */}
          <ScoreExplanation
            lang={lang}
            company={{
              romcScore: company.romcScore,
              romcAiScore: null, // Removed - no longer displayed
              previousRomcAiScore: null, // Removed - no longer displayed
              revenueLatest: company.revenueLatest ? Number(String(company.revenueLatest)) : null,
              profitLatest: company.profitLatest ? Number(String(company.profitLatest)) : null,
              employees: company.employees,
              enrichVersion: company.enrichVersion,
              lastEnrichedAt: company.lastEnrichedAt,
              industrySlug: company.industrySlug,
              countySlug: company.countySlug,
            }}
            isPremium={session?.user?.isPremium ?? false}
          />

          {/* Competitors Comparison */}
          <CompetitorsTable
            company={{
              name: company.name,
              romcScore: company.romcScore ?? null,
              revenue: company.revenueLatest ? Number(String(company.revenueLatest)) : null,
              employees: company.employees,
            }}
            competitors={related.map(r => ({
              slug: r.slug,
              name: r.name,
              romcScore: r.romcScore,
              revenueLatest: null,
              employees: null,
            }))}
            lang={lang}
            currency={company.currency ?? "EUR"}
          />

          {/* Company Overview */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Data sources" : "Data sources"}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                {lang === "ro"
                  ? "Public filings, user submissions (verificate), semnale automate. Nu este consultanță financiară."
                  : "Public filings, verified user submissions, automated signals. Not financial advice."}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{t(lang, "company_summary")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t(lang, "romc_score")}</p>
                  <p className="mt-1 text-lg font-semibold">{romcScore != null ? `${romcScore}/100` : "N/A"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t(lang, "confidence")}</p>
                  <p className="mt-1 text-lg font-semibold">{romcConfidence != null ? `${romcConfidence}/100` : "N/A"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t(lang, "last_scored")}</p>
                  <p className="mt-1 text-lg font-semibold">{company.lastScoredAt ? company.lastScoredAt.toISOString().slice(0, 10) : "N/A"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{lang === "ro" ? "Last enriched" : "Last enriched"}</p>
                  <p className="mt-1 text-lg font-semibold">{company.lastEnrichedAt ? company.lastEnrichedAt.toISOString().slice(0, 10) : "N/A"}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
            </div>

            <IntegrityIndicators
              lang={lang}
              scoreStabilityProfile={company.scoreStabilityProfile}
              dataConfidence={company.dataConfidence}
              companyIntegrityScore={company.companyIntegrityScore}
              companyRiskFlags={company.companyRiskFlags}
            />

            <FreshnessIndicator
              lang={lang}
              lastEnrichedAt={company.lastEnrichedAt}
              lastScoredAt={company.lastScoredAt}
              dataConfidence={company.dataConfidence}
              integrityScore={company.companyIntegrityScore}
              lastSeenAtFromSources={company.lastSeenAtFromSources}
              fieldProvenance={company.fieldProvenance ? (company.fieldProvenance as unknown as Record<string, { sourceId: SourceId; sourceRef: string; seenAt: Date; confidence: number }>) : null}
            />

            <FinancialsCard
              lang={lang}
              revenueLatest={company.revenueLatest ? Number(String(company.revenueLatest)) : null}
              profitLatest={company.profitLatest ? Number(String(company.profitLatest)) : null}
              employees={company.employees}
              currency={company.currency}
              lastFinancialSyncAt={company.lastFinancialSyncAt}
              financialSource={company.financialSource}
              financialSnapshots={financialSnapshots.map((s) => ({
                fiscalYear: s.fiscalYear,
                revenue: s.revenue ? Number(String(s.revenue)) : null,
                profit: s.profit ? Number(String(s.profit)) : null,
                employees: s.employees ?? null,
                currency: s.currency,
                dataSource: s.dataSource,
                fetchedAt: s.fetchedAt,
              }))}
            />

            <details className="rounded-xl border bg-card p-6 text-card-foreground">
              <summary className="cursor-pointer text-sm font-medium">{t(lang, "how_romc_works")}</summary>
              <p className="mt-3 text-sm text-muted-foreground leading-6">{t(lang, "how_romc_body")}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-6">
                {lang === "ro"
                  ? "Enrichment v1 folosește doar website-ul companiei (dacă există) pentru a extrage titlu, descriere și linkuri sociale, cu timeout și limite stricte."
                  : "Enrichment v1 uses only the company website (if present) to extract title, description, and social links, with strict timeouts and limits."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
            </details>

            {company.cui ? <PremiumPanel lang={lang} cui={company.cui} /> : null}

            <Placements placements={placements} location="company" showEmptyState />

            {company.cui ? <ForecastPanel lang={lang} cui={company.cui} /> : null}

            {/* Claim CTAs - show if not claimed */}
            {company.cui && session?.user?.id && !isClaimed ? (
              <ClaimCtas
                lang={lang}
                companySlug={company.slug}
                companyCui={company.cui}
                romcScore={company.romcScore}
                isClaimed={isClaimed}
                isPremium={session.user.isPremium ?? false}
              />
            ) : null}

            {company.cui ? <ClaimSubmitPanel lang={lang} cui={company.cui} /> : null}
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">{lang === "ro" ? "Linkuri" : "Links"}</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {company.industrySlug ? (
                <Link className="underline underline-offset-4" href={`/industries/${encodeURIComponent(company.industrySlug)}`}>
                  {lang === "ro" ? "Industrie" : "Industry"}: {company.industrySlug}
                </Link>
              ) : null}
              {company.countySlug ? (
                <Link className="underline underline-offset-4" href={`/counties/${encodeURIComponent(company.countySlug)}`}>
                  {lang === "ro" ? "Județ" : "County"}: {company.countySlug}
                </Link>
              ) : null}
              {company.industrySlug ? (
                <Link className="underline underline-offset-4" href={`/companies?industry=${encodeURIComponent(company.industrySlug)}`}>
                  {lang === "ro" ? "Director (industria)" : "Directory (industry)"}
                </Link>
              ) : null}
              {company.countySlug ? (
                <Link className="underline underline-offset-4" href={`/companies?county=${encodeURIComponent(company.countySlug)}`}>
                  {lang === "ro" ? "Director (județ)" : "Directory (county)"}
                </Link>
              ) : null}
              {company.cui ? (
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
                    `Report issue: ${company.name} (CUI ${company.cui})`,
                  )}`}
                >
                  {lang === "ro" ? "Raportează o problemă" : "Report an issue"}
                </a>
              ) : null}
            </div>
          </div>

          <CorrectionRequestForm lang={lang} companyId={company.id} companyCui={company.cui ?? undefined} />

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">{lang === "ro" ? "Metrici (ultimul an)" : "Metrics (latest year)"}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">{lang === "ro" ? "An" : "Year"}</th>
                    <th className="py-2">{lang === "ro" ? "Venituri" : "Revenue"}</th>
                    <th className="py-2">{lang === "ro" ? "Profit" : "Profit"}</th>
                    <th className="py-2">{lang === "ro" ? "Angajați" : "Employees"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-2">{latestYearly?.year ?? "N/A"}</td>
                    <td className="py-2">{latestYearly ? formatMoney(latestYearly.revenue, latestYearly.currency, "ro-RO") : "N/A"}</td>
                    <td className="py-2">{latestYearly ? formatMoney(latestYearly.profit, latestYearly.currency, "ro-RO") : "N/A"}</td>
                    <td className="py-2">{latestYearly?.employees ?? "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">{lang === "ro" ? "ROMC v1 (componente)" : "ROMC v1 (components)"}</h2>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
              {company.romcComponents ? JSON.stringify(company.romcComponents, null, 2) : "N/A"}
            </pre>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">Scoruri (istoric)</h2>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Ultima actualizare metrici:{" "}
                <span className="font-medium">
                  {metrics?.updatedAt ? metrics.updatedAt.toLocaleDateString("ro-RO") : "N/A"}
                </span>
              </div>
              <div className="text-foreground">
                <Sparkline values={history.slice().reverse().map((x) => x.romcScore)} />
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {history.length === 0 ? (
                <li className="text-muted-foreground">N/A</li>
              ) : (
                history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{h.asOfDate.toISOString().slice(0, 10)}</span>
                    <span className="font-medium">
                      {h.romcScore} / {h.confidence}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Market Position Analysis */}
          {marketPosition && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Poziție pe piață" : "Market Position"}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{marketPosition}</p>
            </div>
          )}

          {/* Growth Trends */}
          {growthAnalysis && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Tendințe de creștere" : "Growth Trends"}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{growthAnalysis}</p>
            </div>
          )}

          {/* Competitive Landscape */}
          {competitiveLandscape && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Peisaj competitiv" : "Competitive Landscape"}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{competitiveLandscape}</p>
            </div>
          )}

          {/* Industry Context */}
          {industryContext && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Context industrie" : "Industry Context"}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{industryContext}</p>
            </div>
          )}

          {/* Key Insights */}
          {keyInsights && keyInsights.length > 0 && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Insight-uri cheie" : "Key Insights"}</h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {keyInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAQ Section */}
          {faqs.length > 0 && (
            <div className="rounded-xl border bg-card p-6 text-card-foreground">
              <h2 className="text-sm font-medium">{lang === "ro" ? "Întrebări frecvente" : "Frequently Asked Questions"}</h2>
              <div className="mt-4 space-y-4">
                {faqs.map((faq, idx) => (
                  <details key={idx} className="rounded-md border p-4">
                    <summary className="cursor-pointer text-sm font-medium">{faq.question}</summary>
                    <p className="mt-2 text-sm text-muted-foreground leading-6">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated Date */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">{lang === "ro" ? "Actualizare date" : "Data Update"}</h2>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {company.lastScoredAt && (
                <p>
                  {lang === "ro" ? "Ultima calculare scor:" : "Last score calculation:"}{" "}
                  <span className="font-medium text-foreground">
                    {company.lastScoredAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
                  </span>
                </p>
              )}
              {company.lastEnrichedAt && (
                <p>
                  {lang === "ro" ? "Ultima actualizare date:" : "Last data update:"}{" "}
                  <span className="font-medium text-foreground">
                    {company.lastEnrichedAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
                  </span>
                </p>
              )}
              {company.lastUpdatedAt && (
                <p>
                  {lang === "ro" ? "Ultima modificare:" : "Last modified:"}{" "}
                  <span className="font-medium text-foreground">
                    {company.lastUpdatedAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">{lang === "ro" ? "Overview" : "Overview"}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-6">
              {lang === "en"
                ? company.descriptionEn ??
                  `This is an informational page for ${company.name}. Data and estimates will improve as sources and models are added.`
                : company.descriptionRo ??
                  `Aceasta este o pagină informativă pentru ${company.name}. Datele și estimările vor fi îmbunătățite pe măsură ce integrăm surse și modele.`}
            </p>
            <div className="mt-4">
              <a
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                href={`/claim?company=${encodeURIComponent(company.slug)}`}
              >
                Claim this company
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">Signals</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>- Hiring velocity: (placeholder)</li>
              <li>- Web traffic change: (placeholder)</li>
              <li>- News mentions: (placeholder)</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">Valuation model inputs</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>- Revenue & profit history (ANAF)</li>
              <li>- Employee estimates</li>
              <li>- Web presence & traffic</li>
              <li>- Press mentions</li>
              <li>- Government contracts</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <h2 className="text-sm font-medium">Disclaimer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estimările sunt orientative și nu reprezintă consultanță financiară. RoMarketCap nu intermediază tranzacții.
            </p>
          </div>
        </div>

        {/* Sidebar - Right Column (30%) */}
        <aside className="space-y-6">
          {/* News Feed */}
          {company.cui && (
            <NewsFeed
              companyName={company.name}
              companyCui={company.cui}
              lang={lang}
              limit={5}
            />
          )}

          {/* Activity Feed */}
          <ActivityFeed changes={recentChanges} lang={lang} />

          {/* Social Stats */}
          <SocialStats
            socials={company.socials ? (company.socials as any) : null}
            website={company.website}
            lang={lang}
          />

          {/* Similar Companies */}
          <SimilarCompaniesWidget companies={related} lang={lang} />

          {/* Related Companies (legacy) */}
          <RelatedCompanies lang={lang} items={related} />
        </aside>
      </div>
      <ROMCAIAssistant
        lang={lang}
        context={{
          page: "company",
          companySlug: company.slug,
          companyName: company.name,
          industrySlug: company.industrySlug || undefined,
          countySlug: company.countySlug || undefined,
        }}
      />
    </main>
  );
}


