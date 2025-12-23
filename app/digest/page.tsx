import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Digest - RoMarketCap" : "Digest - RoMarketCap";
  const description = lang === "ro" ? "Arhivă de digest-uri săptămânale ROMC." : "Archive of weekly ROMC digests.";
  const canonical = `${getSiteUrl()}/digest`;
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function DigestIndexPage() {
  const lang = await getLangFromRequest();
  const issues = await prisma.weeklyDigestIssue.findMany({
    orderBy: { weekStart: "desc" },
    take: 20,
    select: { weekStart: true, weekEnd: true, subjectRo: true, subjectEn: true },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Digest" : "Digest"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
      </header>

      <div className="mt-6">
        <NewsletterCta
          lang={lang}
          placement="digest"
          incentives={lang === "ro" ? ["Digest săptămânal automat", "Alertă timpurie despre companii noi"] : ["Automatic weekly digest", "Early alerts on new companies"]}
        />
      </div>

      <section className="mt-6 space-y-3">
        {issues.length === 0 ? (
          <EmptyState
            title={lang === "ro" ? "Niciun digest încă" : "No digests yet"}
            description={lang === "ro" ? "Digest-urile săptămânale vor apărea aici." : "Weekly digests will appear here."}
          />
        ) : null}
        {issues.length > 0 ? (
          issues.map((i) => {
            const week = i.weekStart.toISOString().slice(0, 10);
            return (
              <Card key={week} asChild>
                <Link href={`/digest/${week}`} className="block hover:bg-accent transition-colors">
                  <CardBody>
                    <p className="text-sm font-medium">{lang === "en" ? i.subjectEn : i.subjectRo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {i.weekStart.toISOString().slice(0, 10)} - {i.weekEnd.toISOString().slice(0, 10)}
                    </p>
                  </CardBody>
                </Link>
              </Card>
            );
          })
        ) : null}
      </section>
    </main>
  );
}


