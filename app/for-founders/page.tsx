import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";
import { track } from "@/src/lib/analytics";
import { TrackFoundersLandingView } from "@/components/analytics/TrackFoundersLandingView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title =
    lang === "ro"
      ? "Pentru fondatori - Revendică compania ta | RoMarketCap"
      : "For founders - Claim your company | RoMarketCap";
  const description =
    lang === "ro"
      ? "Revendică compania ta, actualizează datele și îmbunătățește scorul ROMC. Acces la funcții premium pentru fondatori."
      : "Claim your company, update data and improve ROMC score. Access premium features for founders.";
  const canonical = `${getSiteUrl()}/for-founders`;

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

export default async function ForFoundersPage() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <TrackFoundersLandingView />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Pentru fondatori" : "For founders"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Revendică compania ta și controlează cum apare pe RoMarketCap."
            : "Claim your company and control how it appears on RoMarketCap."}
        </p>
      </header>

      {/* Value Proposition */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "De ce să revendici?" : "Why claim?"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Actualizează datele" : "Update data"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Actualizează cifra de afaceri, profit, angajați și alte informații pentru un scor ROMC mai precis."
                    : "Update revenue, profit, employees and other information for a more accurate ROMC score."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Îmbunătățește scorul" : "Improve score"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Date complete și actualizate duc la un scor ROMC mai ridicat și mai multă vizibilitate."
                    : "Complete and updated data leads to a higher ROMC score and more visibility."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Acces premium" : "Premium access"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "După revendicare, accesează forecast-uri, analize detaliate și comparații cu concurenții."
                    : "After claiming, access forecasts, detailed analysis and comparisons with competitors."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* How It Works */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Cum funcționează" : "How it works"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="neutral">1</Badge>
                <div>
                  <p className="font-medium">{lang === "ro" ? "Găsește compania ta" : "Find your company"}</p>
                  <p className="mt-1 text-muted-foreground">
                    {lang === "ro"
                      ? "Caută compania ta pe RoMarketCap folosind nume sau CUI."
                      : "Search for your company on RoMarketCap using name or CUI."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="neutral">2</Badge>
                <div>
                  <p className="font-medium">{lang === "ro" ? "Revendică" : "Claim"}</p>
                  <p className="mt-1 text-muted-foreground">
                    {lang === "ro"
                      ? "Completează formularul de revendicare și așteaptă aprobarea (1-2 zile)."
                      : "Complete the claim form and wait for approval (1-2 days)."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="neutral">3</Badge>
                <div>
                  <p className="font-medium">{lang === "ro" ? "Actualizează și controlează" : "Update and control"}</p>
                  <p className="mt-1 text-muted-foreground">
                    {lang === "ro"
                      ? "După aprobare, actualizează datele și accesează funcții premium."
                      : "After approval, update data and access premium features."}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* CTAs */}
      <section className="mt-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">{lang === "ro" ? "Revendică acum" : "Claim now"}</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-foreground mb-4">
                {lang === "ro"
                  ? "Găsește compania ta și începe procesul de revendicare."
                  : "Find your company and start the claim process."}
              </p>
              <Link href="/companies">
                <Button className="w-full">{lang === "ro" ? "Caută compania" : "Search company"}</Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">{lang === "ro" ? "Vezi prețuri" : "See pricing"}</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-foreground mb-4">
                {lang === "ro"
                  ? "Funcții premium pentru fondatori: forecast-uri, analize, export-uri."
                  : "Premium features for founders: forecasts, analysis, exports."}
              </p>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">
                  {lang === "ro" ? "Prețuri Premium" : "Premium pricing"}
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mt-8">
        <NewsletterCta
          lang={lang}
          placement="inline"
          incentives={
            lang === "ro"
              ? ["Alertă timpurie despre companii noi", "Ranking-uri exclusive"]
              : ["Early alerts on new companies", "Exclusive rankings"]
          }
        />
      </section>
    </main>
  );
}

