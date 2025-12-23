import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { listCompanies } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";
import { Faq, type FaqItem } from "@/components/seo/Faq";
import { countyLabel } from "@/src/lib/taxonomy/counties";
import { getOrSetPageCache, PAGE_CACHE_TTLS, isAdminForCache, getLangForCache } from "@/src/lib/cache/pageCache";

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
  const label = countyLabel(slug, lang);
  const title =
    lang === "ro"
      ? `Top companii in ${label} - scor ROMC si evaluari | RoMarketCap`
      : `Top companies in ${label} - ROMC score and valuations | RoMarketCap`;
  const description =
    lang === "ro"
      ? `Lista publică cu companii din ${label}, scor ROMC și estimări. ${t(lang, "disclaimer")}`
      : `Public list of companies in ${label}, ROMC score and estimates. ${t(lang, "disclaimer")}`;
  const canonical = `${getSiteUrl()}/counties/${encodeURIComponent(slug)}`;
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

export default async function CountyLandingPage({ params, searchParams }: PageProps) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(Number(asString(sp.page) || "1"), 1);
  const label = countyLabel(slug, lang);

  const result = isAdmin
    ? await listCompanies({ county: slug, sort: "romc_desc", page, pageSize: 25 })
    : await getOrSetPageCache(
        { page: "counties", params: { slug, page }, lang: langForCache },
        () => listCompanies({ county: slug, sort: "romc_desc", page, pageSize: 25 }),
        PAGE_CACHE_TTLS.taxonomy,
      );

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

  const faqs: FaqItem[] =
    lang === "ro"
      ? [
          { q: "Ce include această listă?", a: "Companii publice cu date disponibile, filtrate după județ." },
          { q: "Ce înseamnă scorul?", a: "ROMC este un scor determinist. Este o estimare, nu consultanță." },
        ]
      : [
          { q: "What does this list include?", a: "Public companies with available data, filtered by county." },
          { q: "What does the score mean?", a: "ROMC is deterministic. It is an estimate, not advice." },
        ];

  const makePageHref = (p: number) => `/counties/${encodeURIComponent(slug)}?page=${p}`;

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Județe" : "Counties", url: "/counties" },
    { name: label, url: `/counties/${encodeURIComponent(slug)}` },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro" ? "Top companii private din România, în acest județ." : "Top private Romanian companies in this county."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/counties">
            {lang === "ro" ? "Toate județele" : "All counties"}
          </Link>
          <Link className="underline underline-offset-4" href={`/companies?county=${encodeURIComponent(slug)}`}>
            {lang === "ro" ? "Filtrează în director" : "Filter in directory"}
          </Link>
          <Link className="underline underline-offset-4" href={`/top?county=${encodeURIComponent(slug)}`}>
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
              <Link className="underline underline-offset-4" href="/counties">
                {lang === "ro" ? "Toate județele" : "All counties"}
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

      <div className="mt-10 grid gap-6">
        <Faq items={faqs} />
      </div>
    </main>
  );
}


