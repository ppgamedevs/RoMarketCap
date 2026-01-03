/**
 * Company Comparison Page
 * 
 * URL Pattern: /compare/[slug1]-vs-[slug2]
 * Example: /compare/bitdefender-vs-uipath
 * 
 * Generates side-by-side comparison with AI-generated analysis
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest } from "@/src/lib/i18n";
import { prisma } from "@/src/lib/db";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";
import Link from "next/link";
import { generateCompetitiveLandscape } from "@/src/lib/ai/contentGeneration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ companies: string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companies } = await params;
  const lang = await getLangFromRequest();
  
  if (companies.length !== 1) {
    return {
      title: lang === "ro" ? "Comparare companii - RoMarketCap" : "Compare Companies - RoMarketCap",
      robots: { index: false },
    };
  }

  const path = companies[0];
  const slugs = parseComparisonPath(path);
  
  if (slugs.length !== 2) {
    return {
      title: lang === "ro" ? "Comparare companii - RoMarketCap" : "Compare Companies - RoMarketCap",
      robots: { index: false },
    };
  }

  try {
    const [company1, company2] = await Promise.all([
      getCompanyBySlugOrThrow(slugs[0]).catch(() => null),
      getCompanyBySlugOrThrow(slugs[1]).catch(() => null),
    ]);

    if (!company1 || !company2) {
      return {
        title: lang === "ro" ? "Comparare companii - RoMarketCap" : "Compare Companies - RoMarketCap",
        robots: { index: false },
      };
    }

    const title =
      lang === "ro"
        ? `${company1.name} vs ${company2.name} - Comparare ROMC Score | RoMarketCap`
        : `${company1.name} vs ${company2.name} - ROMC Score Comparison | RoMarketCap`;
    const description =
      lang === "ro"
        ? `Comparație detaliată între ${company1.name} și ${company2.name}: ROMC Score, venituri, angajați, capitalizare de piață.`
        : `Detailed comparison between ${company1.name} and ${company2.name}: ROMC score, revenue, employees, market capitalization.`;

    const canonical = `${getSiteUrl()}/compare/${path}`;

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
  } catch {
    return {
      title: lang === "ro" ? "Comparare companii - RoMarketCap" : "Compare Companies - RoMarketCap",
      robots: { index: false },
    };
  }
}

/**
 * Parse comparison path like "bitdefender-vs-uipath" into ["bitdefender", "uipath"]
 */
function parseComparisonPath(path: string): string[] {
  // Split by "-vs-" or "-VS-"
  const parts = path.split(/-vs-/i);
  if (parts.length === 2) {
    return parts.map((p) => p.trim()).filter(Boolean);
  }
  return [];
}

function formatMoney(n: unknown, currency: string, locale: string): string {
  if (n == null) return "N/A";
  const num = typeof n === "number" ? n : Number(String(n));
  if (!Number.isFinite(num)) return "N/A";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
}

export default async function CompareCompaniesPage({ params }: PageProps) {
  const lang = await getLangFromRequest();
  const { companies } = await params;

  if (companies.length !== 1) {
    notFound();
  }

  const path = companies[0];
  const slugs = parseComparisonPath(path);

  if (slugs.length !== 2) {
    notFound();
  }

  // Fetch both companies
  const [company1, company2] = await Promise.all([
    getCompanyBySlugOrThrow(slugs[0]).catch(() => null),
    getCompanyBySlugOrThrow(slugs[1]).catch(() => null),
  ]);

  if (!company1 || !company2) {
    notFound();
  }

  // Generate comparison analysis
  const comparisonAnalysis = await generateCompetitiveLandscape(company1, [
    { name: company2.name, romcScore: company2.romcScore, marketCap: company2.marketCap ? Number(company2.marketCap) : null },
  ]).catch(() => null);

  // Find related comparisons (other companies in same industry)
  const relatedComparisons = await prisma.company.findMany({
    where: {
      id: { notIn: [company1.id, company2.id] },
      isPublic: true,
      visibilityStatus: "PUBLIC",
      OR: [
        ...(company1.industrySlug ? [{ industrySlug: company1.industrySlug }] : []),
        ...(company2.industrySlug ? [{ industrySlug: company2.industrySlug }] : []),
      ],
    },
    orderBy: [{ romcScore: "desc" }],
    take: 5,
    select: { slug: true, name: true },
  });

  const baseUrl = getSiteUrl();
  const canonical = `${baseUrl}/compare/${path}`;

  // Comparison schema (custom extension)
  const comparisonSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "ro" ? `Comparare: ${company1.name} vs ${company2.name}` : `Comparison: ${company1.name} vs ${company2.name}`,
    description: lang === "ro" ? "Comparație detaliată între două companii" : "Detailed comparison between two companies",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Organization",
          name: company1.name,
          url: `${baseUrl}/company/${encodeURIComponent(company1.slug)}`,
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Organization",
          name: company2.name,
          url: `${baseUrl}/company/${encodeURIComponent(company2.slug)}`,
        },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonSchema) }} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {lang === "ro" ? "Comparare companii" : "Company Comparison"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Comparație detaliată între două companii românești"
            : "Detailed comparison between two Romanian companies"}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="mt-6 rounded-xl border bg-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">{lang === "ro" ? "Metrică" : "Metric"}</th>
                <th className="py-3 px-4 text-center">
                  <Link href={`/company/${encodeURIComponent(company1.slug)}`} className="font-medium hover:underline">
                    {company1.name}
                  </Link>
                </th>
                <th className="py-3 px-4 text-center">
                  <Link href={`/company/${encodeURIComponent(company2.slug)}`} className="font-medium hover:underline">
                    {company2.name}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "ROMC Score" : "ROMC Score"}</td>
                <td className="py-3 px-4 text-center">{company1.romcScore ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.romcScore ?? "N/A"}</td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "ROMC AI Score" : "ROMC AI Score"}</td>
                <td className="py-3 px-4 text-center">{company1.romcAiScore ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.romcAiScore ?? "N/A"}</td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Încredere date" : "Data Confidence"}</td>
                <td className="py-3 px-4 text-center">{company1.dataConfidence ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.dataConfidence ?? "N/A"}</td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Venituri" : "Revenue"}</td>
                <td className="py-3 px-4 text-center">
                  {company1.revenueLatest ? formatMoney(company1.revenueLatest, company1.currency ?? "RON", lang === "ro" ? "ro-RO" : "en-GB") : "N/A"}
                </td>
                <td className="py-3 px-4 text-center">
                  {company2.revenueLatest ? formatMoney(company2.revenueLatest, company2.currency ?? "RON", lang === "ro" ? "ro-RO" : "en-GB") : "N/A"}
                </td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Angajați" : "Employees"}</td>
                <td className="py-3 px-4 text-center">{company1.employees ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.employees ?? "N/A"}</td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Capitalizare piață" : "Market Cap"}</td>
                <td className="py-3 px-4 text-center">
                  {company1.marketCap ? formatMoney(company1.marketCap, "RON", lang === "ro" ? "ro-RO" : "en-GB") : "N/A"}
                </td>
                <td className="py-3 px-4 text-center">
                  {company2.marketCap ? formatMoney(company2.marketCap, "RON", lang === "ro" ? "ro-RO" : "en-GB") : "N/A"}
                </td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Interval evaluare" : "Valuation Range"}</td>
                <td className="py-3 px-4 text-center">
                  {company1.valuationRangeLow && company1.valuationRangeHigh
                    ? `${formatMoney(company1.valuationRangeLow, "EUR", lang === "ro" ? "ro-RO" : "en-GB")} - ${formatMoney(company1.valuationRangeHigh, "EUR", lang === "ro" ? "ro-RO" : "en-GB")}`
                    : "N/A"}
                </td>
                <td className="py-3 px-4 text-center">
                  {company2.valuationRangeLow && company2.valuationRangeHigh
                    ? `${formatMoney(company2.valuationRangeLow, "EUR", lang === "ro" ? "ro-RO" : "en-GB")} - ${formatMoney(company2.valuationRangeHigh, "EUR", lang === "ro" ? "ro-RO" : "en-GB")}`
                    : "N/A"}
                </td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Industrie" : "Industry"}</td>
                <td className="py-3 px-4 text-center">{company1.industry ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.industry ?? "N/A"}</td>
              </tr>
              <tr className="border-t">
                <td className="py-3 pr-4 font-medium">{lang === "ro" ? "Județ" : "County"}</td>
                <td className="py-3 px-4 text-center">{company1.county ?? "N/A"}</td>
                <td className="py-3 px-4 text-center">{company2.county ?? "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AI-Generated Comparison Analysis */}
      {comparisonAnalysis && (
        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Analiză comparativă" : "Comparative Analysis"}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-6">{comparisonAnalysis}</p>
        </div>
      )}

      {/* Which is Better Analysis */}
      <div className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{lang === "ro" ? "Care este mai bună?" : "Which is Better?"}</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          {company1.romcScore !== null && company2.romcScore !== null && (
            <p>
              {company1.romcScore > company2.romcScore
                ? lang === "ro"
                  ? `${company1.name} are un ROMC Score mai mare (${company1.romcScore} vs ${company2.romcScore}), indicând o poziție mai puternică pe piață.`
                  : `${company1.name} has a higher ROMC Score (${company1.romcScore} vs ${company2.romcScore}), indicating a stronger market position.`
                : company2.romcScore > company1.romcScore
                  ? lang === "ro"
                    ? `${company2.name} are un ROMC Score mai mare (${company2.romcScore} vs ${company1.romcScore}), indicând o poziție mai puternică pe piață.`
                    : `${company2.name} has a higher ROMC Score (${company2.romcScore} vs ${company1.romcScore}), indicating a stronger market position.`
                  : lang === "ro"
                    ? "Ambele companii au același ROMC Score."
                    : "Both companies have the same ROMC Score."}
            </p>
          )}
          {company1.marketCap && company2.marketCap && (
            <p>
              {Number(company1.marketCap) > Number(company2.marketCap)
                ? lang === "ro"
                  ? `${company1.name} are o capitalizare de piață mai mare.`
                  : `${company1.name} has a higher market capitalization.`
                : lang === "ro"
                  ? `${company2.name} are o capitalizare de piață mai mare.`
                  : `${company2.name} has a higher market capitalization.`}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === "ro"
              ? "Această analiză este bazată pe date estimate și doar informațională. Nu este consultanță financiară."
              : "This analysis is based on estimated data and is informational only. Not financial advice."}
          </p>
        </div>
      </div>

      {/* Related Comparisons */}
      {relatedComparisons.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">{lang === "ro" ? "Comparații similare" : "Similar Comparisons"}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {relatedComparisons.slice(0, 3).map((comp) => (
              <li key={comp.slug}>
                <Link
                  href={`/compare/${company1.slug}-vs-${comp.slug}`}
                  className="text-primary hover:underline"
                >
                  {company1.name} vs {comp.name}
                </Link>
              </li>
            ))}
            {relatedComparisons.length > 3 && (
              <li>
                <Link
                  href={`/compare/${company2.slug}-vs-${relatedComparisons[3].slug}`}
                  className="text-primary hover:underline"
                >
                  {company2.name} vs {relatedComparisons[3].name}
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Links to individual company pages */}
      <div className="mt-6 flex gap-4">
        <Link
          href={`/company/${encodeURIComponent(company1.slug)}`}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          {lang === "ro" ? "Vezi" : "View"} {company1.name}
        </Link>
        <Link
          href={`/company/${encodeURIComponent(company2.slug)}`}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          {lang === "ro" ? "Vezi" : "View"} {company2.name}
        </Link>
      </div>
    </main>
  );
}
