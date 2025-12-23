import type { Metadata } from "next";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { notFound } from "next/navigation";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ week: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const { week } = await params;
  const title = lang === "ro" ? `Digest ${week} - RoMarketCap` : `Digest ${week} - RoMarketCap`;
  const description = lang === "ro" ? `Digest săptămânal ROMC pentru ${week}.` : `Weekly ROMC digest for ${week}.`;
  const canonical = `${getSiteUrl()}/digest/${encodeURIComponent(week)}`;
  return { title, description, alternates: { canonical }, openGraph: { type: "article", title, description, url: canonical } };
}

export default async function DigestIssuePage({ params }: PageProps) {
  const lang = await getLangFromRequest();
  const { week } = await params;
  const weekStart = new Date(`${week}T00:00:00.000Z`);
  if (!Number.isFinite(weekStart.getTime())) notFound();

  const issue = await prisma.weeklyDigestIssue.findUnique({
    where: { weekStart },
    select: { weekStart: true, weekEnd: true, subjectRo: true, subjectEn: true, htmlRo: true, htmlEn: true, createdAt: true },
  });
  if (!issue) notFound();

  const canonical = `${getSiteUrl()}/digest/${encodeURIComponent(week)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: lang === "en" ? issue.subjectEn : issue.subjectRo,
    datePublished: issue.createdAt.toISOString(),
    mainEntityOfPage: canonical,
    publisher: { "@type": "Organization", name: "RoMarketCap", url: getSiteUrl() },
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-semibold tracking-tight">{lang === "en" ? issue.subjectEn : issue.subjectRo}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {issue.weekStart.toISOString().slice(0, 10)} - {issue.weekEnd.toISOString().slice(0, 10)}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
      <div className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
        <div dangerouslySetInnerHTML={{ __html: lang === "en" ? issue.htmlEn : issue.htmlRo }} />
      </div>

      <div className="mt-6">
        <NewsletterCta
          lang={lang}
          placement="digest"
          incentives={lang === "ro" ? ["Digest săptămânal automat", "Alertă timpurie despre companii noi"] : ["Automatic weekly digest", "Early alerts on new companies"]}
        />
      </div>
    </main>
  );
}


