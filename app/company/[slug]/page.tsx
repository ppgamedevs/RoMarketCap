import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/seo/site";
import { CompanyHeader } from "@/components/layout/CompanyHeader";
import { MetricCard } from "@/components/layout/MetricCard";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";
import { Sparkline } from "@/components/charts/Sparkline";
import { prisma } from "@/src/lib/db";
import type { Prisma } from "@prisma/client";
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
    related: Array<{ slug: string; name: string; romcScore: number | null }>;
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
              select: { slug: true, name: true, romcScore: true },
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
    select: { slug: true, name: true, romcScore: true },
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

  const fin = company.financials[0] ?? null;

  const riskFlags = riskFlagsForCompany(company);
  const confidence = latestDaily?.confidence ?? fin?.confidenceScore ?? 50;

  // ROMC v1 is denormalized on Company.
  const romcScore = company.romcScore ?? null;
  const romcConfidence = company.romcConfidence ?? null;

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: websiteUrl,
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
      { "@type": "PropertyValue", name: "ROMC AI", value: typeof company.romcAiScore === "number" ? company.romcAiScore : 0 },
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
    ].filter((p) => p !== null),
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <TrackCompanyView cui={company.cui ?? null} industrySlug={company.industrySlug ?? null} countySlug={company.countySlug ?? null} />
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

      <section className="mt-6 grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-4">
        <Metric label="ROMC Score" value={romcScore != null ? `${romcScore}/100` : "N/A"} delta={confidence ? { value: `${confidence}/100`, direction: "up" } : undefined} />
        <Metric label={lang === "ro" ? "Încredere date" : "Data confidence"} value={company.dataConfidence != null ? `${company.dataConfidence}/100` : "N/A"} />
        <Metric label={lang === "ro" ? "Integritate" : "Integrity"} value={company.companyIntegrityScore != null ? `${company.companyIntegrityScore}/100` : "N/A"} />
        <div className="flex items-center justify-center">
          <ProgressRing value={company.romcAiScore ?? romcScore ?? 0} label={lang === "ro" ? "ROMC AI" : "ROMC AI"} />
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
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

      <section className="mt-6 grid gap-4">
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
        />

        <ScoreExplanation
          lang={lang}
          company={{
            romcScore: company.romcScore,
            romcAiScore: company.romcAiScore,
            previousRomcAiScore: company.previousRomcAiScore,
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

        <RecentChanges lang={lang} changes={recentChanges} />

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

        <RelatedCompanies lang={lang} items={related} />

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
                    {h.romcScore} / {h.romcAiScore} / {h.confidence}
                  </span>
                </li>
              ))
            )}
          </ul>
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
      </section>
    </main>
  );
}


