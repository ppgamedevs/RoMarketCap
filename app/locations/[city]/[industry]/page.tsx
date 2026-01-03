/**
 * City + Industry Combination Page
 * 
 * URL Pattern: /locations/[city]/[industry]
 * Example: /locations/bucuresti/software
 * 
 * Lists companies in a specific city and industry combination
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest } from "@/src/lib/i18n";
import { listCompanies } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";
import { industryLabel } from "@/src/lib/taxonomy/industries";
import { getOrSetPageCache, PAGE_CACHE_TTLS, isAdminForCache, getLangForCache } from "@/src/lib/cache/pageCache";
import { prisma } from "@/src/lib/db";
import { generateIndustryMarketOverview } from "@/src/lib/ai/generateIndustryContent";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ city: string; industry: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const { city, industry } = await params;
  const industryLabelText = industryLabel(industry, lang);
  
  // Decode city name (replace hyphens with spaces, capitalize)
  const cityName = city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const title =
    lang === "ro"
      ? `Companii ${industryLabelText} în ${cityName} - RoMarketCap`
      : `${industryLabelText} companies in ${cityName} - RoMarketCap`;
  const description =
    lang === "ro"
      ? `Lista companiilor din industria ${industryLabelText} din ${cityName}, scor ROMC și estimări.`
      : `List of ${industryLabelText} companies in ${cityName}, ROMC score and estimates.`;

  const canonical = `${getSiteUrl()}/locations/${encodeURIComponent(city)}/${encodeURIComponent(industry)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityIndustryPage({ params, searchParams }: PageProps) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const { city, industry } = await params;
  const sp = await searchParams;
  const page = Math.max(Number(asString(sp.page) || "1"), 1);

  // Decode city name
  const cityName = city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const industryLabelText = industryLabel(industry, lang);

  // Find companies by city and industry
  // Note: We need to match city names (case-insensitive, with normalization)
  const cityNormalized = cityName.toLowerCase().trim();
  
  const result = isAdmin
    ? await listCompanies({ 
        industry, 
        sort: "romc_desc", 
        page, 
        pageSize: 25,
        // Note: listCompanies doesn't support city filter yet, so we'll filter manually
      })
    : await getOrSetPageCache(
        { page: "locations", params: { city, industry, page }, lang: langForCache },
        async () => {
          // Query with city filter using raw SQL for case-insensitive matching
          const companies = await prisma.$queryRawUnsafe<Array<{
            id: string;
            slug: string;
            name: string;
            cui: string | null;
            county: string | null;
            industrySlug: string | null;
            romcScore: number | null;
            romcConfidence: number | null;
            valuationRangeLow: unknown;
            valuationRangeHigh: unknown;
          }>>(`
            SELECT id, slug, name, cui, county, industry_slug as "industrySlug", 
                   romc_score as "romcScore", romc_confidence as "romcConfidence",
                   valuation_range_low as "valuationRangeLow", valuation_range_high as "valuationRangeHigh"
            FROM companies
            WHERE is_public = true
              AND visibility_status = 'PUBLIC'
              AND industry_slug = $1
              AND LOWER(TRIM(city)) = LOWER($2)
            ORDER BY romc_score DESC NULLS LAST
            LIMIT $3 OFFSET $4
          `, industry, cityNormalized, 25, (page - 1) * 25);

          const total = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
            SELECT COUNT(*) as count
            FROM companies
            WHERE is_public = true
              AND visibility_status = 'PUBLIC'
              AND industry_slug = $1
              AND LOWER(TRIM(city)) = LOWER($2)
          `, industry, cityNormalized);

          return {
            items: companies.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              cui: c.cui,
              county: c.county,
              industrySlug: c.industrySlug,
              romcScore: c.romcScore,
              romcConfidence: c.romcConfidence,
              valuationRangeLow: c.valuationRangeLow,
              valuationRangeHigh: c.valuationRangeHigh,
            })),
            total: Number(total[0]?.count ?? 0),
            page,
            pageSize: 25,
            totalPages: Math.ceil(Number(total[0]?.count ?? 0) / 25),
          };
        },
        PAGE_CACHE_TTLS.taxonomy,
      );

  if (result.items.length === 0 && page === 1) {
    notFound();
  }

  const canonical = `${getSiteUrl()}/locations/${encodeURIComponent(city)}/${encodeURIComponent(industry)}`;

  // ItemList schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "ro" ? `Companii ${industryLabelText} în ${cityName}` : `${industryLabelText} companies in ${cityName}`,
    numberOfItems: result.total,
    itemListElement: result.items.slice(0, 25).map((c, idx) => ({
      "@type": "ListItem",
      position: (page - 1) * 25 + idx + 1,
      url: `${getSiteUrl()}/company/${encodeURIComponent(c.slug)}`,
      name: c.name,
    })),
  };

  // Get industry stats for content
  const industryStats = await prisma.company.aggregate({
    where: {
      industrySlug: industry,
      city: { contains: cityName, mode: "insensitive" },
      isPublic: true,
      visibilityStatus: "PUBLIC",
      romcScore: { not: null },
    },
    _avg: { romcScore: true },
    _count: true,
    _sum: { revenueLatest: true },
  });

  const marketOverview = await generateIndustryMarketOverview(industry, {
    totalCompanies: industryStats._count,
    avgScore: Math.round(industryStats._avg.romcScore ?? 0),
    totalRevenue: Number(industryStats._sum.revenueLatest ?? 0),
    topCompanies: result.items.slice(0, 3).map((c) => ({
      name: c.name,
      score: c.romcScore ?? 0,
      revenue: null,
    })),
  }).catch(() => null);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Locații" : "Locations", url: "/companies" },
    { name: cityName, url: `/companies?city=${encodeURIComponent(cityName)}` },
    { name: industryLabelText, url: `/industries/${encodeURIComponent(industry)}` },
    { name: `${industryLabelText} în ${cityName}`, url: canonical },
  ]);

  const makePageHref = (p: number) => `/locations/${encodeURIComponent(city)}/${encodeURIComponent(industry)}?page=${p}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? `${industryLabelText} în ${cityName}` : `${industryLabelText} in ${cityName}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro"
              ? `${result.total} companii din industria ${industryLabelText} în ${cityName}`
              : `${result.total} ${industryLabelText} companies in ${cityName}`}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href={`/industries/${encodeURIComponent(industry)}`}>
            {lang === "ro" ? "Industrie" : "Industry"}
          </Link>
          <Link className="underline underline-offset-4" href={`/companies?city=${encodeURIComponent(cityName)}&industry=${encodeURIComponent(industry)}`}>
            {lang === "ro" ? "Director" : "Directory"}
          </Link>
        </div>
      </header>

      {/* Market Overview */}
      {marketOverview && (
        <section className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Prezentare generală piață" : "Market Overview"}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-6">{marketOverview}</p>
        </section>
      )}

      {/* Company List */}
      <section className="mt-6 grid gap-3">
        {result.items.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <p className="text-sm font-medium">{lang === "ro" ? "Nu există companii încă" : "No companies yet"}</p>
          </div>
        ) : (
          result.items.map((c) => (
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
          ))
        )}
      </section>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between text-sm">
          <Link
            className={page <= 1 ? "pointer-events-none opacity-50" : "underline underline-offset-4"}
            href={makePageHref(page - 1)}
          >
            {lang === "ro" ? "Înapoi" : "Prev"}
          </Link>
          <span className="text-muted-foreground">
            {lang === "ro" ? "Pagina" : "Page"} {result.page} / {result.totalPages}
          </span>
          <Link
            className={page >= result.totalPages ? "pointer-events-none opacity-50" : "underline underline-offset-4"}
            href={makePageHref(page + 1)}
          >
            {lang === "ro" ? "Înainte" : "Next"}
          </Link>
        </nav>
      )}
    </main>
  );
}
