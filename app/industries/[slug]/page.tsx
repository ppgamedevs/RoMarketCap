import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { listCompanies } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Faq, type FaqItem } from "@/components/seo/Faq";
import { industryLabel } from "@/src/lib/taxonomy/industries";
import { getOrSetPageCache, PAGE_CACHE_TTLS, isAdminForCache, getLangForCache } from "@/src/lib/cache/pageCache";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";
import {
  generateIndustryMarketOverview,
  generateIndustryKeyTrends,
  generateTopPerformersAnalysis,
  generateRegionalDistribution,
  generateGrowthOpportunities,
} from "@/src/lib/ai/generateIndustryContent";
import { ROMCAIAssistant } from "@/components/ai/ROMCAIAssistant";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const { slug } = await params;
  const label = industryLabel(slug, lang);
  const title =
    lang === "ro"
      ? `Top companii in ${label} - scor ROMC si evaluari | RoMarketCap`
      : `Top ${label} companies in Romania - ROMC score and valuations | RoMarketCap`;
  const description =
    lang === "ro"
      ? `Lista publică cu companii din industria ${label}, scor ROMC și estimări. ${t(lang, "disclaimer")}`
      : `Public list of companies in ${label}, ROMC score and estimates. ${t(lang, "disclaimer")}`;
  const canonical = `${getSiteUrl()}/industries/${encodeURIComponent(slug)}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ro: canonical,
        en: canonical,
        "x-default": canonical,
      },
    },
    openGraph: { type: "website", title, description, url: canonical, images: [{ url: `${canonical}/opengraph-image` }] },
    twitter: { card: "summary_large_image", title, description, images: [`${canonical}/opengraph-image`] },
  };
}

export default async function IndustryLandingPage({ params, searchParams }: PageProps) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(Number(asString(sp.page) || "1"), 1);
  const label = industryLabel(slug, lang);

  const result = isAdmin
    ? await listCompanies({ industry: slug, sort: "romc_desc", page, pageSize: 25 })
    : await getOrSetPageCache(
        { page: "industries", params: { slug, page }, lang: langForCache },
        () => listCompanies({ industry: slug, sort: "romc_desc", page, pageSize: 25 }),
        PAGE_CACHE_TTLS.taxonomy,
      );

  const canonical = `${getSiteUrl()}/industries/${encodeURIComponent(slug)}`;
  // ItemList schema for current page only (pagination-safe: only current page items)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: result.total,
    itemListElement: result.items.slice(0, 25).map((c, idx) => ({
      "@type": "ListItem",
      position: (page - 1) * 25 + idx + 1,
      url: `${getSiteUrl()}/company/${encodeURIComponent(c.slug)}`,
      name: c.name,
    })),
  };

  // Fetch industry stats for content generation
  const industryStats = await prisma.company.aggregate({
    where: {
      industrySlug: slug,
      isPublic: true,
      visibilityStatus: "PUBLIC",
      romcScore: { not: null },
    },
    _avg: { romcScore: true },
    _count: true,
    _sum: { revenueLatest: true },
  });

  const topCompanies = await prisma.company.findMany({
    where: {
      industrySlug: slug,
      isPublic: true,
      visibilityStatus: "PUBLIC",
    },
    orderBy: [{ romcScore: "desc" }],
    take: 3,
    select: {
      name: true,
      romcScore: true,
      revenueLatest: true,
      marketCap: true,
    },
  });

  // Generate SEO content
  const industryData = {
    totalCompanies: industryStats._count,
    avgScore: Math.round(industryStats._avg.romcScore ?? 0),
    totalRevenue: Number(industryStats._sum.revenueLatest ?? 0),
    topCompanies: topCompanies.map((c) => ({
      name: c.name,
      score: c.romcScore ?? 0,
      revenue: c.revenueLatest ? Number(c.revenueLatest) : null,
    })),
  };

  const [marketOverview, topPerformersAnalysis] = await Promise.all([
    generateIndustryMarketOverview(slug, industryData).catch(() => null),
    generateTopPerformersAnalysis(
      slug,
      topCompanies.map((c) => ({
        name: c.name,
        score: c.romcScore ?? 0,
        revenue: c.revenueLatest ? Number(c.revenueLatest) : null,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
      }))
    ).catch(() => null),
  ]);

  // Get regional distribution
  const countyDistribution = await prisma.company.groupBy({
    by: ["county"],
    where: {
      industrySlug: slug,
      isPublic: true,
      visibilityStatus: "PUBLIC",
      county: { not: null },
    },
    _count: true,
    _avg: { romcScore: true },
  });

  const regionalDistribution = await generateRegionalDistribution(
    slug,
    countyDistribution
      .filter((d) => d.county)
      .map((d) => ({
        county: d.county!,
        count: d._count,
        avgScore: Math.round(d._avg.romcScore ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  ).catch(() => null);

  const faqs: FaqItem[] =
    lang === "ro"
      ? [
          { q: "Ce este ROMC Score?", a: "Un scor determinist bazat pe semnale și completitudine. Este o estimare." },
          { q: "Cât de des se actualizează?", a: "În funcție de datele disponibile și de recalculări periodice." },
        ]
      : [
          { q: "What is ROMC Score?", a: "A deterministic score based on simple signals and completeness. It is an estimate." },
          { q: "How often is it updated?", a: "Based on available data and periodic recomputation." },
        ];

  const makePageHref = (p: number) => `/industries/${encodeURIComponent(slug)}?page=${p}`;

  const baseUrl = getSiteUrl();
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Companii" : "Companies", url: `${baseUrl}/companies` },
    { name: lang === "ro" ? "Industrii" : "Industries", url: `${baseUrl}/industries` },
    { name: label, url: `${baseUrl}/industries/${encodeURIComponent(slug)}` },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Top companii private din România, în această industrie."
              : "Top private Romanian companies in this industry."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/industries">
            {lang === "ro" ? "Toate industriile" : "All industries"}
          </Link>
          <Link className="underline underline-offset-4" href={`/companies?industry=${encodeURIComponent(slug)}`}>
            {lang === "ro" ? "Filtrează în director" : "Filter in directory"}
          </Link>
          <Link className="underline underline-offset-4" href={`/top?industry=${encodeURIComponent(slug)}`}>
            {lang === "ro" ? "Top" : "Top"}
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-3">
        {result.items.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <p className="text-sm font-medium">{lang === "ro" ? "Nu există companii încă" : "No companies yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "ro"
                ? "Încearcă directorul sau revino mai târziu."
                : "Try the directory or check back later."}
            </p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link className="underline underline-offset-4" href="/companies">
                {lang === "ro" ? "Director companii" : "Company directory"}
              </Link>
              <Link className="underline underline-offset-4" href="/industries">
                {lang === "ro" ? "Toate industriile" : "All industries"}
              </Link>
            </div>
          </div>
        ) : null}
        {result.items.map((c) => (
          <CompanyCard
            key={c.id}
            slug={c.slug}
            name={c.name}
            cui={c.cui}
            county={c.county}
            industrySlug={c.industrySlug}
            romcScore={c.romcScore}
            romcConfidence={c.romcConfidence}
            valuationRangeLow={c.valuationRangeLow}
            valuationRangeHigh={c.valuationRangeHigh}
          />
        ))}
      </section>

      <nav className="mt-8 flex items-center justify-between text-sm">
        <Link className={page <= 1 ? "pointer-events-none opacity-50" : "underline underline-offset-4"} href={makePageHref(page - 1)}>
          {lang === "ro" ? "Înapoi" : "Prev"}
        </Link>
        <span className="text-muted-foreground">
          Page {result.page} / {result.totalPages}
        </span>
        <Link
          className={page >= result.totalPages ? "pointer-events-none opacity-50" : "underline underline-offset-4"}
          href={makePageHref(page + 1)}
        >
          {lang === "ro" ? "Înainte" : "Next"}
        </Link>
      </nav>

      {/* Market Overview */}
      {marketOverview && (
        <section className="mt-10 rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Prezentare generală piață" : "Market Overview"}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-6">{marketOverview}</p>
        </section>
      )}

      {/* Top Performers Analysis */}
      {topPerformersAnalysis && (
        <section className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Analiza liderilor" : "Top Performers Analysis"}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-6">{topPerformersAnalysis}</p>
        </section>
      )}

      {/* Regional Distribution */}
      {regionalDistribution && (
        <section className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Distribuție regională" : "Regional Distribution"}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-6">{regionalDistribution}</p>
        </section>
      )}

      <div className="mt-10 grid gap-6">
        <section className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Despre pagina" : "About this page"}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-6">
            {lang === "ro"
              ? "Aceasta este o pagină programmatic SEO. Lista include companii publice cu date disponibile."
              : "This is a programmatic SEO page. The list includes public companies with available data."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Canonical: {canonical}</p>
        </section>
        <Faq items={faqs} />
      </div>
      <ROMCAIAssistant
        lang={lang}
        context={{
          page: "industry",
          industrySlug: slug,
        }}
      />
    </main>
  );
}


