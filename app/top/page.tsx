import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { listCompanies, type CompanySort } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { getSiteUrl } from "@/lib/seo/site";
import { getOrSetPageCache, getLangForCache, isAdminForCache, PAGE_CACHE_TTLS } from "@/src/lib/cache/pageCache";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const sp = await searchParams;
  const industry = asString(sp.industry).trim();
  const county = asString(sp.county).trim();
  const pageNum = Math.max(Number(asString(sp.page) || "1"), 1);

  // Build canonical URL with filters
  const params = new URLSearchParams();
  if (industry) params.set("industry", industry);
  if (county) params.set("county", county);
  if (pageNum > 1) params.set("page", String(pageNum));
  const canonical = `${getSiteUrl()}/top${params.toString() ? `?${params.toString()}` : ""}`;

  const title = lang === "ro" ? "Top companii - RoMarketCap" : "Top companies - RoMarketCap";
  const description = lang === "ro" ? "Top companii după scorul ROMC." : "Top companies by ROMC score.";
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function TopPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const sp = await searchParams;
  const industry = asString(sp.industry).trim();
  const county = asString(sp.county).trim();
  const pageNum = Math.max(Number(asString(sp.page) || "1"), 1);

  const sort: CompanySort = "romc_desc";
  const result = isAdmin
    ? await listCompanies({ q: "", industry: industry || undefined, county: county || undefined, sort, page: pageNum, pageSize: 25 })
    : await getOrSetPageCache(
        { page: "top", params: { industry: industry || null, county: county || null, page: pageNum }, lang: langForCache },
        () => listCompanies({ q: "", industry: industry || undefined, county: county || undefined, sort, page: pageNum, pageSize: 25 }),
        PAGE_CACHE_TTLS.list,
      );

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (industry) params.set("industry", industry);
    if (county) params.set("county", county);
    params.set("page", String(p));
    return `/top?${params.toString()}`;
  };

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Top companii" : "Top companies", url: "/top" },
  ]);

  // ItemList schema for current page (pagination-safe)
  const baseUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: result.total,
    itemListElement: result.items.slice(0, 25).map((c, idx) => ({
      "@type": "ListItem",
      position: (pageNum - 1) * 25 + idx + 1,
      url: `${baseUrl}/company/${encodeURIComponent(c.slug)}`,
      name: c.name,
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Top companii" : "Top companies"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/new">
            {lang === "ro" ? "Noi" : "New"}
          </Link>
          <Link className="underline underline-offset-4" href="/companies">
            {lang === "ro" ? "Director" : "Directory"}
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-3">
        {result.items.length === 0 ? <p className="text-sm text-muted-foreground">N/A</p> : null}
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
        <Link className={pageNum <= 1 ? "pointer-events-none opacity-50" : "underline underline-offset-4"} href={makeHref(pageNum - 1)}>
          {lang === "ro" ? "Înapoi" : "Prev"}
        </Link>
        <span className="text-muted-foreground">
          Page {result.page} / {result.totalPages}
        </span>
        <Link className={pageNum >= result.totalPages ? "pointer-events-none opacity-50" : "underline underline-offset-4"} href={makeHref(pageNum + 1)}>
          {lang === "ro" ? "Înainte" : "Next"}
        </Link>
      </nav>
    </main>
  );
}


