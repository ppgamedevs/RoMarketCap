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
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";

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
          { q: "Refunds?", a: "Dacă ai o problemă, contactează-ne și vom analiza cazul." },
        ]
      : [
          { q: "Are values estimated?", a: "Yes. Values are indicative estimates based on public data and deterministic rules." },
          { q: "Is this financial advice?", a: "No. RoMarketCap provides information and estimates, not financial advice." },
          { q: "Where does data come from?", a: "Imports, public sources, signals, and user-submitted updates approved via moderation." },
          { q: "How does ROMC work?", a: "ROMC v1 is deterministic. ROMC AI is separate and measures completeness and trust." },
          { q: "Refunds?", a: "If you have an issue, contact us and we will review the case." },
        ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <TrackPricingView />

      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{lang === "ro" ? "Prețuri" : "Pricing"}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-6">
            {lang === "ro"
              ? "Upgrade la Premium pentru forecast complet, explicații și insight-uri."
              : "Upgrade to Premium for full forecasts, reasoning, and insights."}
          </p>
        </div>
        {ctxCompany || ctxFeature ? (
          <Alert variant="info">
            <p className="font-medium">{lang === "ro" ? "Ai încercat să deblochezi Premium" : "You tried to unlock Premium"}</p>
            <p className="mt-1 text-sm">
              {lang === "ro"
                ? `${ctxCompany ? `Companie: ${ctxCompany}. ` : ""}${ctxFeature ? `Feature: ${ctxFeature}. ` : ""}Alege planul potrivit.`
                : `${ctxCompany ? `Company: ${ctxCompany}. ` : ""}${ctxFeature ? `Feature: ${ctxFeature}. ` : ""}Pick the right plan.`}
            </p>
          </Alert>
        ) : null}
        {offer ? (
          <Alert variant="info">
            <p className="text-sm">{offer}</p>
          </Alert>
        ) : null}
        <PricingCtas isAuthed={Boolean(session?.user?.id)} />
      </header>

      <div className="mt-6">
        <Placements placements={placements} location="pricing" showEmptyState />
      </div>

      <Card className="mt-10">
        <CardHeader>
          <h2 className="text-sm font-medium">{lang === "ro" ? "Plan comparison" : "Plan comparison"}</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>{lang === "ro" ? "Free" : "Free"}</th>
                  <th>{lang === "ro" ? "Premium" : "Premium"}</th>
                  <th>{lang === "ro" ? "Partner/API" : "Partner/API"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Company profiles", "Yes", "Yes", "Yes"],
                  ["Premium insights", "No", "Yes", "Yes"],
                  ["Forecast horizons (30/90/180)", "30d", "30/90/180", "30/90/180"],
                  ["Forecast reasoning", "No", "Yes", "Yes"],
                  ["Company reports", "Preview", "Yes", "Yes"],
                  ["API access", "No", "No", "Yes"],
                  ["Data exports", "No", "No", "Yes"],
                  ["Sponsorship placements", "No", "No", "Yes"],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="font-medium">{row[0]}</td>
                    <td className="text-muted-foreground">{row[1]}</td>
                    <td className="text-muted-foreground">{row[2]}</td>
                    <td className="text-muted-foreground">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="mt-4">
            <Link href="/partners">
              <Button variant="outline">{lang === "ro" ? "Partner/API: contact sales" : "Partner/API: contact sales"}</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="mt-10">
        <WhyPayAccordion lang={lang} />
      </div>

      <div className="mt-6">
        <RefundNote lang={lang} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "De ce Premium?" : "Why Premium?"}</h2>
          </CardHeader>
          <CardBody>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>{lang === "ro" ? "Forecast complet (90/180) și explicații." : "Full forecast (90/180) and reasoning."}</li>
              <li>{lang === "ro" ? "Mai mult context pentru decizii și research." : "More context for research and decisions."}</li>
              <li>{lang === "ro" ? "Acces rapid la insight-uri." : "Fast access to insights."}</li>
            </ul>
            <div className="mt-4">
              <Link href={session?.user?.id ? "/billing" : "/login"}>
                <Button>{t(lang, "cta_upgrade")}</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Note" : "Notes"}</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground leading-6">{t(lang, "disclaimer")}</p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-10">
        <Faq items={faqs} />
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/companies">
          {t(lang, "nav_company")}
        </Link>
        <Link className="underline underline-offset-4" href="/about">
          {t(lang, "nav_about")}
        </Link>
        <Link className="underline underline-offset-4" href="/billing">
          {t(lang, "nav_billing")}
        </Link>
      </div>
    </main>
  );
}


