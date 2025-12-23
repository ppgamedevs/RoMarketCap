import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { listCompanies } from "@/src/lib/db/companyQueries";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { getSiteUrl } from "@/lib/seo/site";
import { getOrSetPageCache, getLangForCache, isAdminForCache, PAGE_CACHE_TTLS } from "@/src/lib/cache/pageCache";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";
import { industryLabel, STARTER_INDUSTRIES } from "@/src/lib/taxonomy/industries";
import { countyLabel, ROMANIA_COUNTIES } from "@/src/lib/taxonomy/counties";
import { Faq } from "@/components/seo/Faq";
import { getNewIndustryFaq, getNewCountyFaq } from "@/src/lib/seo/faq-templates";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimum companies required to index page
const MIN_COMPANIES_FOR_INDEX = 5;

type PageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function isIndustrySlug(slug: string): boolean {
  return STARTER_INDUSTRIES.some((i) => i.slug === slug);
}

function isCountySlug(slug: string): boolean {
  return ROMANIA_COUNTIES.some((c) => c.slug === slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const { slug } = await params;
  if (slug.length !== 1) {
    return { robots: { index: false, follow: true } };
  }

  const segment = slug[0]!;
  const isIndustry = isIndustrySlug(segment);
  const isCounty = isCountySlug(segment);

  if (!isIndustry && !isCounty) {
    return { robots: { index: false, follow: true } };
  }

  const label = isIndustry ? industryLabel(segment, lang) : countyLabel(segment, lang);

  // Check if has enough companies
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const isDemoMode = getEffectiveDemoMode();
  const count = await prisma.company.count({
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      ...(isIndustry ? { industrySlug: segment } : { countySlug: segment }),
      ...(isDemoMode ? {} : { isDemo: false }),
    },
  });

  if (count < MIN_COMPANIES_FOR_INDEX) {
    return {
      robots: { index: false, follow: true },
    };
  }

  const title =
    lang === "ro"
      ? `Companii noi ${label} - adăugate recent | RoMarketCap`
      : `New ${label} companies - recently added | RoMarketCap`;
  const description =
    lang === "ro"
      ? `Lista cu companiile noi ${isIndustry ? `din industria ${label}` : `din județul ${label}`} adăugate sau actualizate recent. ${t(lang, "disclaimer")}`
      : `List of new companies ${isIndustry ? `in the ${label} industry` : `in ${label} county`} recently added or updated. ${t(lang, "disclaimer")}`;
  const canonical = `${getSiteUrl()}/new/${encodeURIComponent(segment)}`;

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
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
    },
  };
}

export default async function NewFilteredPage({ params, searchParams }: PageProps) {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(Number(asString(sp.page) || "1"), 1);

  if (slug.length !== 1) {
    notFound();
  }

  const segment = slug[0]!;
  const isIndustry = isIndustrySlug(segment);
  const isCounty = isCountySlug(segment);

  if (!isIndustry && !isCounty) {
    notFound();
  }

  // Verify exists and has enough companies
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const isDemoMode = getEffectiveDemoMode();
  const totalCount = await prisma.company.count({
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      ...(isIndustry ? { industrySlug: segment } : { countySlug: segment }),
      ...(isDemoMode ? {} : { isDemo: false }),
    },
  });

  if (totalCount < MIN_COMPANIES_FOR_INDEX) {
    notFound();
  }

  const label = isIndustry ? industryLabel(segment, lang) : countyLabel(segment, lang);

  const result = isAdmin
    ? await listCompanies({
        ...(isIndustry ? { industry: segment } : { county: segment }),
        sort: "newest",
        page,
        pageSize: 25,
      })
    : await getOrSetPageCache(
        { page: "new-filtered", params: { segment, type: isIndustry ? "industry" : "county", page }, lang: langForCache },
        () =>
          listCompanies({
            ...(isIndustry ? { industry: segment } : { county: segment }),
            sort: "newest",
            page,
            pageSize: 25,
          }),
        PAGE_CACHE_TTLS.taxonomy,
      );

  const canonical = `${getSiteUrl()}/new/${encodeURIComponent(segment)}`;
  const baseUrl = getSiteUrl();

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Companii noi" : "New companies", url: "/new" },
    { name: label, url: canonical },
  ]);

  // ItemList schema (pagination-safe)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: result.total,
    itemListElement: result.items.map((c, idx) => ({
      "@type": "ListItem",
      position: (page - 1) * 25 + idx + 1,
      url: `${baseUrl}/company/${encodeURIComponent(c.slug)}`,
      name: c.name,
    })),
  };

  // FAQ JSON-LD
  const faqItems = isIndustry ? getNewIndustryFaq(lang, label) : getNewCountyFaq(lang, label);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const prevPage = page > 1 ? `${canonical}${page > 2 ? `?page=${page - 1}` : ""}` : null;
  const nextPage = page < result.totalPages ? `${canonical}?page=${page + 1}` : null;

  const backLink = isIndustry ? `/industries/${encodeURIComponent(segment)}` : `/counties/${encodeURIComponent(segment)}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {prevPage && <link rel="prev" href={prevPage} />}
      {nextPage && <link rel="next" href={nextPage} />}

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "ro" ? `Companii noi ${label}` : `New ${label} companies`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/new">
            {lang === "ro" ? "Toate noi" : "All new"}
          </Link>
          <Link className="underline underline-offset-4" href={backLink}>
            {lang === "ro" ? "Toate companiile" : "All companies"}
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
        <Link
          className={page <= 1 ? "pointer-events-none opacity-50" : "underline underline-offset-4"}
          href={page > 2 ? `${canonical}?page=${page - 1}` : canonical}
        >
          {lang === "ro" ? "Înapoi" : "Prev"}
        </Link>
        <span className="text-muted-foreground">
          {lang === "ro" ? "Pagina" : "Page"} {result.page} / {result.totalPages}
        </span>
        <Link
          className={page >= result.totalPages ? "pointer-events-none opacity-50" : "underline underline-offset-4"}
          href={`${canonical}?page=${page + 1}`}
        >
          {lang === "ro" ? "Înainte" : "Next"}
        </Link>
      </nav>

      <div className="mt-12">
        <Faq items={faqItems} lang={lang} />
      </div>
    </main>
  );
}

