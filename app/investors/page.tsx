import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { track } from "@/src/lib/analytics";
import { InvestorCtas } from "@/components/investors/InvestorCtas";
import { TrackInvestorPageView } from "@/components/analytics/TrackInvestorPageView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title =
    lang === "ro"
      ? "Investitori - Dealflow și date pentru investitori | RoMarketCap"
      : "Investors - Dealflow and data for investors | RoMarketCap";
  const description =
    lang === "ro"
      ? "Acces la dealflow românesc, date complete despre companii private, watchlist-uri personalizate și alertări. Pentru investitori și fonduri."
      : "Access to Romanian dealflow, complete data on private companies, personalized watchlists, and alerts. For investors and funds.";
  const canonical = `${getSiteUrl()}/investors`;

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

export default async function InvestorsPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  const isPremium = session?.user?.isPremium ?? false;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <TrackInvestorPageView />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Pentru investitori" : "For investors"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Dealflow românesc, date complete despre companii private, și instrumente pentru investitori."
            : "Romanian dealflow, complete data on private companies, and tools for investors."}
        </p>
      </header>

      {/* Value Proposition */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "De ce RoMarketCap?" : "Why RoMarketCap?"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Dealflow automat" : "Automated dealflow"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Descoperă companii noi și în creștere rapidă din România. Scoruri ROMC actualizate zilnic, forecast-uri 90/180 zile."
                    : "Discover new and fast-growing companies in Romania. Daily updated ROMC scores, 90/180 day forecasts."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Date complete" : "Complete data"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Cifră de afaceri, profit, angajați, evaluări, scoruri de integritate, și analize detaliate pentru fiecare companie."
                    : "Revenue, profit, employees, valuations, integrity scores, and detailed analysis for each company."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Watchlist-uri și alertări" : "Watchlists and alerts"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Urmărește companiile de interes și primește notificări când scorurile se schimbă sau apar semnale noi."
                    : "Track companies of interest and receive notifications when scores change or new signals appear."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "API și export-uri" : "API and exports"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Acces API pentru integrare în sisteme proprii, export CSV/JSON pentru analiză offline."
                    : "API access for integration into your own systems, CSV/JSON exports for offline analysis."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Data Samples */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Exemple de date" : "Data samples"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">ROMC Score</span>
                  <Badge variant="success">72/100</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Scor compus care combină factori financiari, creștere, și semnale de piață."
                    : "Composite score combining financial factors, growth, and market signals."}
                </p>
              </div>
              <div className="rounded-md border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{lang === "ro" ? "Forecast 90 zile" : "90-day forecast"}</span>
                  <Badge variant="success">+5%</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Proiecție ML pentru evoluția scorului în următoarele 90 de zile."
                    : "ML projection for score evolution over the next 90 days."}
                </p>
              </div>
              <div className="rounded-md border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{lang === "ro" ? "Integritate date" : "Data integrity"}</span>
                  <Badge variant="success">85/100</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Scor de încredere în calitatea și completitudinea datelor."
                    : "Confidence score in data quality and completeness."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Use Cases */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Cazuri de utilizare" : "Use cases"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Dealflow sourcing" : "Dealflow sourcing"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Folosește filtre avansate pentru a găsi companii care se aliniază cu criteriile tale de investiție."
                    : "Use advanced filters to find companies that align with your investment criteria."}
                </p>
              </div>
              <div>
                <h3 className="font-medium">{lang === "ro" ? "Due diligence" : "Due diligence"}</h3>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Accesează date complete, forecast-uri, și analize pentru evaluare rapidă."
                    : "Access complete data, forecasts, and analysis for rapid evaluation."}
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

      {/* CTAs */}
      <section className="mt-8">
        <InvestorCtas lang={lang} isPremium={isPremium} isAuthed={Boolean(session?.user?.id)} />
      </section>

      {/* Premium Features */}
      {!isPremium && (
        <section className="mt-8">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">{lang === "ro" ? "Funcții Premium" : "Premium features"}</h2>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">✓</span>
                  <span>
                    {lang === "ro"
                      ? "Filtre avansate (industrie, județ, scor ROMC, creștere)"
                      : "Advanced filters (industry, county, ROMC score, growth)"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">✓</span>
                  <span>
                    {lang === "ro"
                      ? "Forecast-uri 90/180 zile pentru toate companiile"
                      : "90/180 day forecasts for all companies"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">✓</span>
                  <span>
                    {lang === "ro"
                      ? "Export CSV/JSON pentru analiză offline"
                      : "CSV/JSON exports for offline analysis"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">✓</span>
                  <span>
                    {lang === "ro"
                      ? "API access pentru integrare în sisteme proprii"
                      : "API access for integration into your own systems"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">✓</span>
                  <span>
                    {lang === "ro"
                      ? "Alertări personalizate pentru watchlist-uri"
                      : "Customized alerts for watchlists"}
                  </span>
                </li>
              </ul>
              <div className="mt-4">
                <Link href="/pricing">
                  <Button>{lang === "ro" ? "Vezi prețuri" : "See pricing"}</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </section>
      )}
    </main>
  );
}

