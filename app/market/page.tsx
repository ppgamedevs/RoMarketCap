/**
 * PROMPT 62: Market View Page (CoinMarketCap-style)
 * 
 * Main discovery page showing ranked companies with sparklines, scores, and filters
 */

import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { MarketTable } from "@/components/market/MarketTable";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketCapGraph } from "@/components/market/MarketCapGraph";
import { listIndustrySlugsWithCounts, listCountySlugsWithCounts } from "@/src/lib/db/companyQueries";
import { ROMCAIAssistant } from "@/components/ai/ROMCAIAssistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const sp = await searchParams;
  const page = Math.max(Number(asString(sp.page) || "1"), 1);
  
  const title = lang === "ro" 
    ? "Clasamentul Firmelor Românești | RoMarketCap" 
    : "Romanian Company Market Rankings | RoMarketCap";
  const description = lang === "ro"
    ? "Vizualizează și compară companiile românești după scor ROMC, tendințe și confidență. Descoperă top firmelor din România."
    : "View and compare Romanian companies by ROMC score, trends, and confidence. Discover top companies in Romania.";
  
  const canonical = `${getSiteUrl()}/market`;
  
  // Build pagination meta
  const prevPage = page > 1 ? `${canonical}?page=${page - 1}` : undefined;
  const nextPage = `${canonical}?page=${page + 1}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(prevPage && { prev: prevPage }),
      ...(nextPage && { next: nextPage }),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
    },
  };
}

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function MarketPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const sp = await searchParams;

  // Parse search params
  const page = Math.max(Number(asString(sp.page) || "1"), 1);
  const pageSize = Math.max(Number(asString(sp.pageSize) || "50"), 1);
  const search = asString(sp.search);
  const industry = asString(sp.industry);
  const county = asString(sp.county);
  const confidence = asString(sp.confidence) as "high" | "medium" | "low" | undefined;
  const integrity = asString(sp.integrity) === "true";
  const verified = asString(sp.verified) === "true";
  const fresh = asString(sp.fresh) === "true";
  const sort = (asString(sp.sort) as "romcScore" | "marketCap" | "confidence") || "marketCap";

  // Fetch filter options
  const [industries, counties] = await Promise.all([
    listIndustrySlugsWithCounts(),
    listCountySlugsWithCounts(),
  ]);

  // Build JSON-LD ItemList schema
  const baseUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "ro" ? "Clasamentul Firmelor Românești" : "Romanian Company Market Rankings",
    description: lang === "ro" 
      ? "Clasament complet al companiilor românești după scor ROMC" 
      : "Complete ranking of Romanian companies by ROMC score",
    url: `${baseUrl}/market`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {lang === "ro" ? "Piața Firmelor" : "Company Market"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Clasament complet al companiilor românești după scor ROMC, tendințe și confidență"
              : "Complete ranking of Romanian companies by ROMC score, trends, and confidence"}
          </p>
        </div>

        <MarketFilters
          lang={lang}
          industries={industries}
          counties={counties}
          initialSearch={search}
          initialIndustry={industry}
          initialCounty={county}
          initialConfidence={confidence}
          initialIntegrity={integrity}
          initialVerified={verified}
          initialFresh={fresh}
          initialSort={sort}
        />

        <MarketTable
          lang={lang}
          page={page}
          pageSize={pageSize}
          search={search}
          industry={industry}
          county={county}
          confidence={confidence}
          integrity={integrity}
          verified={verified}
          fresh={fresh}
          sort={sort}
        />
      </main>
      <ROMCAIAssistant
        lang={lang}
        context={{
          page: "market",
          industrySlug: industry || undefined,
          countySlug: county || undefined,
        }}
      />
    </>
  );
}

