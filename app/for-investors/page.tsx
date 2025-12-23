import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";
import { TrackInvestorsLandingView } from "@/components/analytics/TrackInvestorsLandingView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title =
    lang === "ro"
      ? "Pentru investitori - Dealflow românesc | RoMarketCap"
      : "For investors - Romanian dealflow | RoMarketCap";
  const description =
    lang === "ro"
      ? "Dealflow automat, date complete despre companii private și instrumente pentru investitori și fonduri."
      : "Automated dealflow, complete data on private companies and tools for investors and funds.";
  const canonical = `${getSiteUrl()}/for-investors`;

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

export default async function ForInvestorsPage() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <TrackInvestorsLandingView />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Pentru investitori" : "For investors"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Dealflow automat și date complete pentru investitori și fonduri din România."
            : "Automated dealflow and complete data for investors and funds in Romania."}
        </p>
      </header>

      {/* Value Proposition */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Dealflow automat" : "Automated dealflow"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Descoperă oportunități" : "Discover opportunities"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Scoruri ROMC actualizate zilnic, forecast-uri 90/180 zile și filtre avansate pentru dealflow sourcing."
                    : "Daily updated ROMC scores, 90/180 day forecasts and advanced filters for dealflow sourcing."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Due diligence rapid" : "Rapid due diligence"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Accesează date complete, forecast-uri și analize pentru evaluare rapidă."
                    : "Access complete data, forecasts and analysis for rapid evaluation."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Monitoring portofoliu" : "Portfolio monitoring"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Urmărește companiile din portofoliu și primește alertări despre schimbări semnificative."
                    : "Track portfolio companies and receive alerts about significant changes."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Features */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Funcții pentru investitori" : "Features for investors"}</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "Watchlist-uri personalizate" : "Customized watchlists"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "Alertări personalizate" : "Customized alerts"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "Export CSV/JSON" : "CSV/JSON exports"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "API access" : "API access"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "Forecast-uri 90/180 zile" : "90/180 day forecasts"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">✓</span>
                <span>{lang === "ro" ? "Comparații cu concurenții" : "Competitor comparisons"}</span>
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
              <h3 className="text-sm font-medium">{lang === "ro" ? "Creează watchlist" : "Create watchlist"}</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-foreground mb-4">
                {lang === "ro"
                  ? "Urmărește companiile de interes și primește alertări."
                  : "Track companies of interest and receive alerts."}
              </p>
              <Link href="/watchlist">
                <Button className="w-full">{lang === "ro" ? "Accesează watchlist" : "Go to watchlist"}</Button>
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
                  ? "Premium oferă funcții avansate pentru investitori."
                  : "Premium offers advanced features for investors."}
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
              ? ["Dealflow săptămânal automat", "Alertă timpurie despre companii noi"]
              : ["Automatic weekly dealflow", "Early alerts on new companies"]
          }
        />
      </section>
    </main>
  );
}

