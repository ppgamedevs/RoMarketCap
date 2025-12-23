import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { renderCompanyReportHtml } from "@/src/lib/report/renderCompanyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const { slug } = await params;
  const company = await getCompanyBySlugOrThrow(slug);
  const title = lang === "ro" ? `${company.name} - Report | RoMarketCap` : `${company.name} - Report | RoMarketCap`;
  const canonical = `${getSiteUrl()}/company/${encodeURIComponent(slug)}/report`;
  return {
    title,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: { type: "article", title, url: canonical, images: [{ url: `${getSiteUrl()}/company/${encodeURIComponent(slug)}/opengraph-image` }] },
  };
}

export default async function CompanyReportPage({ params }: PageProps) {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  const { slug } = await params;
  const company = await getCompanyBySlugOrThrow(slug);

  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { isPremium: true } }) : null;
  const premium = Boolean(user?.isPremium);

  const forecasts = company.cui
    ? await prisma.companyForecast.findMany({
        where: { companyId: company.id, modelVersion: "pred-v1" },
        orderBy: { horizonDays: "asc" },
        select: {
          horizonDays: true,
          forecastScore: true,
          forecastConfidence: true,
          forecastBandLow: true,
          forecastBandHigh: true,
          reasoning: true,
          computedAt: true,
        },
      })
    : [];

  const html = renderCompanyReportHtml({
    lang,
    company: {
      slug: company.slug,
      name: company.name,
      cui: company.cui ?? null,
      county: company.county ?? null,
      city: company.city ?? null,
      website: company.website ?? null,
      romcScore: company.romcScore ?? null,
      romcConfidence: company.romcConfidence ?? null,
      romcAiScore: company.romcAiScore ?? null,
      valuationRangeLow: company.valuationRangeLow == null ? null : Number(company.valuationRangeLow),
      valuationRangeHigh: company.valuationRangeHigh == null ? null : Number(company.valuationRangeHigh),
      valuationCurrency: company.valuationCurrency ?? null,
      lastScoredAt: company.lastScoredAt ?? null,
      lastEnrichedAt: company.lastEnrichedAt ?? null,
    },
    forecasts: premium ? forecasts : forecasts.map((f) => ({ ...f, reasoning: null })).filter((f) => f.horizonDays === 30),
    showReasoning: premium,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Report" : "Report"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>
        </div>
        <div className="flex gap-3">
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/company/${encodeURIComponent(company.slug)}`}>
            {lang === "ro" ? "Înapoi" : "Back"}
          </Link>
          {!premium ? (
            <Link
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href={`/pricing?ctx_company=${encodeURIComponent(company.name)}&ctx_feature=report`}
            >
              {t(lang, "cta_upgrade")}
            </Link>
          ) : null}
        </div>
      </header>

      {!premium ? (
        <div className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
          <p className="text-sm font-medium">{lang === "ro" ? "Preview (blurred)" : "Preview (blurred)"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{lang === "ro" ? "Deblochează Premium pentru report complet." : "Unlock Premium for the full report."}</p>
          <div className="mt-4 rounded-md border bg-background p-3">
            <div className="pointer-events-none select-none blur-sm" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-md border bg-background">
          <iframe title="report" className="h-[80vh] w-full" srcDoc={html} />
        </div>
      )}
    </main>
  );
}


