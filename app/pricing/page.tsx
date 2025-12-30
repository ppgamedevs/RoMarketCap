import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { TrackPricingView } from "@/components/analytics/TrackPricingView";
import { PricingCtas } from "@/components/pricing/PricingCtas";
import { Faq, type FaqItem } from "@/components/seo/Faq";
import { normalizeLaunchOfferText } from "@/src/lib/offer";
import { getPlacementsForLocation } from "@/src/lib/placements";
import { Placements } from "@/components/placements/Placements";
import { WhyPayAccordion } from "@/components/pricing/WhyPayAccordion";
import { RefundNote } from "@/components/pricing/RefundNote";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";
import { Tooltip } from "@/components/ui/Tooltip";

export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function PricingPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  const offer = normalizeLaunchOfferText(process.env.NEXT_PUBLIC_LAUNCH_OFFER_TEXT);
  const placements = await getPlacementsForLocation("pricing", lang);
  const sp = await searchParams;
  const ctxCompany = asString(sp.ctx_company).trim();
  const ctxFeature = asString(sp.ctx_feature).trim();

  const faqs: FaqItem[] =
    lang === "ro"
      ? [
          { q: "Valorile sunt estimate?", a: "Da. Valorile sunt estimări orientative, bazate pe date publice și reguli deterministe." },
          { q: "Este consultanță financiară?", a: "Nu. RoMarketCap oferă informații și estimări, nu consultanță financiară." },
          { q: "De unde vin datele?", a: "Din importuri, surse publice, semnale și actualizări trimise de utilizatori, aprobate prin moderare." },
          { q: "Cum funcționează ROMC?", a: "ROMC v1 este determinist. ROMC AI e separat și măsoară completitudine și încredere." },
          { q: "Rambursări?", a: "Dacă ai o problemă, contactează-ne și vom analiza cazul." },
        ]
      : [
          { q: "Are values estimated?", a: "Yes. Values are indicative estimates based on public data and deterministic rules." },
          { q: "Is this financial advice?", a: "No. RoMarketCap provides information and estimates, not financial advice." },
          { q: "Where does data come from?", a: "Imports, public sources, signals, and user-submitted updates approved via moderation." },
          { q: "How does ROMC work?", a: "ROMC v1 is deterministic. ROMC AI is separate and measures completeness and trust." },
          { q: "Refunds?", a: "If you have an issue, contact us and we will review the case." },
        ];

  const features = lang === "ro"
    ? [
        {
          name: "Profiluri companii",
          tooltip: "Acces complet la toate datele publice despre companiile românești: CUI, adresă, industrie, județ, venituri, profit, angajați și multe altele.",
          free: "Da",
          premium: "Da",
          partner: "Da",
        },
        {
          name: "Insight-uri Premium",
          tooltip: "Valuation estimată, forecast-uri detaliate, explicații despre scoruri și componente, analize avansate și recomandări personalizate.",
          free: "Nu",
          premium: "Da",
          partner: "Da",
        },
        {
          name: "Orizonturi forecast (30/90/180)",
          tooltip: "Forecast-uri pentru evoluția companiei la 30, 90 și 180 de zile. Free include doar 30d, Premium include toate cele trei.",
          free: "30d",
          premium: "30/90/180",
          partner: "30/90/180",
        },
        {
          name: "Raționament forecast",
          tooltip: "Explicații detaliate despre cum sunt calculate forecast-urile, ce factori sunt luați în considerare și de ce s-a ajuns la acele valori.",
          free: "Nu",
          premium: "Da",
          partner: "Da",
        },
        {
          name: "Rapoarte companii",
          tooltip: "Rapoarte complete PDF cu toate datele, analizele și insight-urile despre o companie, perfecte pentru prezentări sau arhivare.",
          free: "Preview",
          premium: "Da",
          partner: "Da",
        },
        {
          name: "Acces API",
          tooltip: "API REST complet pentru integrare în propriile sisteme, aplicații sau platforme. Include autentificare, rate limiting și documentație completă.",
          free: "Nu",
          premium: "Nu",
          partner: "Da",
        },
        {
          name: "Exporturi de date",
          tooltip: "Export CSV/JSON pentru analiză offline, integrare în Excel, sau import în alte sisteme. Include toate datele disponibile.",
          free: "Nu",
          premium: "Nu",
          partner: "Da",
        },
        {
          name: "Placement-uri sponsorizate",
          tooltip: "Posibilitatea de a plasa conținut sponsorizat pe platformă, perfect pentru parteneri care doresc să-și promoveze serviciile sau produsele.",
          free: "Nu",
          premium: "Nu",
          partner: "Da",
        },
      ]
    : [
        {
          name: "Company profiles",
          tooltip: "Full access to all public data about Romanian companies: CUI, address, industry, county, revenue, profit, employees, and more.",
          free: "Yes",
          premium: "Yes",
          partner: "Yes",
        },
        {
          name: "Premium insights",
          tooltip: "Estimated valuation, detailed forecasts, score explanations and components, advanced analytics, and personalized recommendations.",
          free: "No",
          premium: "Yes",
          partner: "Yes",
        },
        {
          name: "Forecast horizons (30/90/180)",
          tooltip: "Forecasts for company evolution at 30, 90, and 180 days. Free includes only 30d, Premium includes all three.",
          free: "30d",
          premium: "30/90/180",
          partner: "30/90/180",
        },
        {
          name: "Forecast reasoning",
          tooltip: "Detailed explanations of how forecasts are calculated, what factors are considered, and why those values were reached.",
          free: "No",
          premium: "Yes",
          partner: "Yes",
        },
        {
          name: "Company reports",
          tooltip: "Complete PDF reports with all data, analyses, and insights about a company, perfect for presentations or archiving.",
          free: "Preview",
          premium: "Yes",
          partner: "Yes",
        },
        {
          name: "API access",
          tooltip: "Complete REST API for integration into your own systems, applications, or platforms. Includes authentication, rate limiting, and full documentation.",
          free: "No",
          premium: "No",
          partner: "Yes",
        },
        {
          name: "Data exports",
          tooltip: "CSV/JSON exports for offline analysis, Excel integration, or import into other systems. Includes all available data.",
          free: "No",
          premium: "No",
          partner: "Yes",
        },
        {
          name: "Sponsorship placements",
          tooltip: "Ability to place sponsored content on the platform, perfect for partners who want to promote their services or products.",
          free: "No",
          premium: "No",
          partner: "Yes",
        },
      ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <TrackPricingView />

      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {lang === "ro" ? "Prețuri" : "Pricing"}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          {lang === "ro"
            ? "Alege planul potrivit pentru nevoile tale. Upgrade la Premium pentru forecast complet, explicații și insight-uri avansate."
            : "Choose the right plan for your needs. Upgrade to Premium for full forecasts, reasoning, and advanced insights."}
        </p>
        {ctxCompany || ctxFeature ? (
          <Alert variant="info" className="mt-6 max-w-2xl mx-auto">
            <p className="font-medium">{lang === "ro" ? "Ai încercat să deblochezi Premium" : "You tried to unlock Premium"}</p>
            <p className="mt-1 text-sm">
              {lang === "ro"
                ? `${ctxCompany ? `Companie: ${ctxCompany}. ` : ""}${ctxFeature ? `Funcționalitate: ${ctxFeature}. ` : ""}Alege planul potrivit mai jos.`
                : `${ctxCompany ? `Company: ${ctxCompany}. ` : ""}${ctxFeature ? `Feature: ${ctxFeature}. ` : ""}Pick the right plan below.`}
            </p>
          </Alert>
        ) : null}
        {offer ? (
          <Alert variant="info" className="mt-6 max-w-2xl mx-auto">
            <p className="text-sm">{offer}</p>
          </Alert>
        ) : null}
        <div className="mt-8">
          <PricingCtas isAuthed={Boolean(session?.user?.id)} lang={lang} />
        </div>
      </header>

      <div className="mb-12">
        <Placements placements={placements} location="pricing" showEmptyState />
      </div>

      <Card className="mb-12 border-2 shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <h2 className="text-xl font-semibold">
            {lang === "ro" ? "Comparare planuri" : "Plan Comparison"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Compară funcționalitățile disponibile în fiecare plan"
              : "Compare features available in each plan"}
          </p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="min-w-[240px] px-6 py-4 text-left">
                    {lang === "ro" ? "Funcționalitate" : "Feature"}
                  </TH>
                  <TH className="min-w-[120px] px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{lang === "ro" ? "Free" : "Free"}</span>
                      <Badge variant="outline" className="text-xs">
                        {lang === "ro" ? "Gratuit" : "Free"}
                      </Badge>
                    </div>
                  </TH>
                  <TH className="min-w-[120px] px-6 py-4 text-center bg-primary/5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{lang === "ro" ? "Premium" : "Premium"}</span>
                      <Badge className="text-xs">{lang === "ro" ? "Recomandat" : "Recommended"}</Badge>
                    </div>
                  </TH>
                  <TH className="min-w-[120px] px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{lang === "ro" ? "Partner/API" : "Partner/API"}</span>
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        {lang === "ro" ? "Enterprise" : "Enterprise"}
                      </Badge>
                    </div>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {features.map((feature, idx) => (
                  <TR key={idx} className="hover:bg-muted/50 transition-colors">
                    <TD className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feature.name}</span>
                        <Tooltip content={feature.tooltip} side="right">
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 bg-muted/50 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={lang === "ro" ? "Mai multe detalii" : "More details"}
                          >
                            ?
                          </button>
                        </Tooltip>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-center">
                      <span className={feature.free === "Da" || feature.free === "Yes" ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {feature.free}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-center bg-primary/5">
                      <span className={feature.premium === "Da" || feature.premium === "Yes" ? "font-medium text-primary" : "text-muted-foreground"}>
                        {feature.premium}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-center">
                      <span className={feature.partner === "Da" || feature.partner === "Yes" ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {feature.partner}
                      </span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <div className="border-t bg-muted/20 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {lang === "ro"
                  ? "Interesat de planul Partner/API? Contactează echipa noastră pentru detalii personalizate."
                  : "Interested in the Partner/API plan? Contact our team for custom details."}
              </p>
              <Link href="/partners">
                <Button variant="outline" size="lg">
                  {lang === "ro" ? "Contactează echipa" : "Contact Sales"}
                </Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-10">
        <WhyPayAccordion lang={lang} />
      </div>

      <div className="mt-6">
        <RefundNote lang={lang} />
      </div>

      <div className="mb-12 grid gap-6 lg:grid-cols-2">
        <Card className="border-2 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <h2 className="text-lg font-semibold">{lang === "ro" ? "De ce Premium?" : "Why Premium?"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === "ro"
                ? "Beneficii exclusive pentru utilizatori Premium"
                : "Exclusive benefits for Premium users"}
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                <span className="text-muted-foreground">
                  {lang === "ro"
                    ? "Forecast complet (90/180 zile) cu explicații detaliate și componente."
                    : "Full forecast (90/180 days) with detailed explanations and components."}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                <span className="text-muted-foreground">
                  {lang === "ro"
                    ? "Mai mult context pentru decizii informate și research avansat."
                    : "More context for informed decisions and advanced research."}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                <span className="text-muted-foreground">
                  {lang === "ro"
                    ? "Acces rapid la insight-uri și analize personalizate."
                    : "Fast access to insights and personalized analytics."}
                </span>
              </li>
            </ul>
            <div className="pt-4 border-t">
              <Link href={session?.user?.id ? "/billing" : "/login"}>
                <Button size="lg" className="w-full">
                  {t(lang, "cta_upgrade")}
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
        <Card className="border-2 shadow-md">
          <CardHeader className="border-b">
            <h2 className="text-lg font-semibold">{lang === "ro" ? "Notă importantă" : "Important Note"}</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground leading-6">{t(lang, "disclaimer")}</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-10">
        <Faq items={faqs} />
      </div>

      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <Link className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors" href="/companies">
          {t(lang, "nav_company")}
        </Link>
        <Link className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors" href="/about">
          {t(lang, "nav_about")}
        </Link>
        <Link className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors" href="/billing">
          {t(lang, "nav_billing")}
        </Link>
      </div>
    </main>
  );
}


