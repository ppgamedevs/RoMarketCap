import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { listCompanies, type CompanySort, listCountySlugsWithCounts, listIndustrySlugsWithCounts } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { FiltersBar } from "@/components/companies/FiltersBar";
import { getSiteUrl } from "@/lib/seo/site";
import { getPlacementsForLocation } from "@/src/lib/placements";
import { Placements } from "@/components/placements/Placements";
import { getOrSetPageCache, getLangForCache, isAdminForCache, PAGE_CACHE_TTLS } from "@/src/lib/cache/pageCache";
import { EmptyState } from "@/components/ui/EmptyState";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const sp = await searchParams;
  const q = asString(sp.q).trim();
  const industry = asString(sp.industry).trim();
  const county = asString(sp.county).trim();
  const sort = (asString(sp.sort) as CompanySort) || "romc_desc";
  const page = Math.max(Number(asString(sp.page) || "1"), 1);

  // Build canonical URL with filters (filtered URLs canonicalize to themselves)
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (industry) params.set("industry", industry);
  if (county) params.set("county", county);
  if (sort && sort !== "romc_desc") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const canonical = `${getSiteUrl()}/companies${params.toString() ? `?${params.toString()}` : ""}`;

  const title = lang === "ro" ? "Companii - RoMarketCap" : "Companies - RoMarketCap";
  const description =
    lang === "ro"
      ? "Director public de companii, cu filtre după industrie și județ."
      : "Public company directory with industry and county filters.";
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const session = await getServerSession(authOptions);
  const isPremium = session?.user?.isPremium ?? false;
  const sp = await searchParams;

  const q = asString(sp.q).trim();
  const industry = asString(sp.industry).trim();
  const county = asString(sp.county).trim();
  const sort = (asString(sp.sort) as CompanySort) || "romc_desc";
  const page = Math.max(Number(asString(sp.page) || "1"), 1);

  // Cache only when no search query (search results are dynamic)
  const shouldCache = !q && !isAdmin;
  const result = shouldCache
    ? await getOrSetPageCache(
        { page: "companies", params: { industry: industry || null, county: county || null, sort, page }, lang: langForCache },
        () => listCompanies({ q: "", industry: industry || undefined, county: county || undefined, sort, page, pageSize: 25 }),
        PAGE_CACHE_TTLS.list,
      )
    : await listCompanies({ q, industry: industry || undefined, county: county || undefined, sort, page, pageSize: 25 });

  const [topIndustries, topCounties, placements] = await Promise.all([
    listIndustrySlugsWithCounts(),
    listCountySlugsWithCounts(),
    getPlacementsForLocation("companies", lang),
  ]);

  const makePageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (industry) params.set("industry", industry);
    if (county) params.set("county", county);
    if (sort) params.set("sort", sort);
    params.set("page", String(p));
    return `/companies?${params.toString()}`;
  };

  // ItemList schema for current page (pagination-safe: only current page items)
  const baseUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: result.total,
    itemListElement: result.items.slice(0, 25).map((c, idx) => ({
      "@type": "ListItem",
      position: (page - 1) * 25 + idx + 1,
      url: `${baseUrl}/company/${encodeURIComponent(c.slug)}`,
      name: c.name,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{lang === "ro" ? "Companii" : "Companies"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="rounded-md border px-3 py-2 text-muted-foreground transition hover:text-foreground" href="/industries">
            {lang === "ro" ? "Industrii" : "Industries"}
          </Link>
          <Link className="rounded-md border px-3 py-2 text-muted-foreground transition hover:text-foreground" href="/counties">
            {lang === "ro" ? "Județe" : "Counties"}
          </Link>
        </div>
      </header>

      <div className="mt-6">
        <FiltersBar q={q} industry={industry} county={county} sort={sort} isPremium={isPremium} />
      </div>

      <div className="mt-6">
        <Placements placements={placements} location="companies" showEmptyState />
      </div>

      <section className="mt-6 grid gap-3">
        {result.items.length === 0 ? (
          <EmptyState
            title={lang === "ro" ? "Nicio companie găsită" : "No companies found"}
            description={lang === "ro" ? "Ajustează filtrele sau caută altă industrie." : "Adjust filters or search a different industry."}
            action={lang === "ro" ? "Resetează filtrele" : "Reset filters"}
            href="/companies"
          />
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

      <section className="mt-10 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Explorează" : "Explore"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Pagini indexabile pentru trafic SEO: top industrii și județe."
            : "Indexable SEO pages: top industries and counties."}
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">{lang === "ro" ? "Top industrii" : "Top industries"}</p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {topIndustries.slice(0, 8).map((x) => (
                <Link key={x.slug} className="underline underline-offset-4" href={`/industries/${x.slug}`}>
                  {x.slug} ({x.count})
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">{lang === "ro" ? "Top județe" : "Top counties"}</p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {topCounties.slice(0, 8).map((x) => (
                <Link key={x.slug} className="underline underline-offset-4" href={`/counties/${x.slug}`}>
                  {x.slug} ({x.count})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


