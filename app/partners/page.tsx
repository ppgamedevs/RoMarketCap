import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest } from "@/src/lib/i18n";
import { PartnersLeadForm } from "@/components/partners/PartnersLeadForm";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Parteneri - RoMarketCap" : "Partners - RoMarketCap";
  const description =
    lang === "ro"
      ? "API, exporturi, rapoarte și licențiere media. Contactează-ne pentru un demo."
      : "API, exports, reports, and media licensing. Contact us for a demo.";
  const canonical = `${getSiteUrl()}/partners`;
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function PartnersPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{lang === "ro" ? "Parteneri" : "Partners"}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-6">
          {lang === "ro"
            ? "Vindem acces API, exporturi și rapoarte custom. Dacă ești investitor, jurnalist sau operator de date, scrie-ne."
            : "We sell API access, exports, and custom reports. If you are an investor, journalist, or data operator, contact us."}
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Oferte" : "Offerings"}</h2>
          </CardHeader>
          <CardBody>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>{lang === "ro" ? "API access" : "API access"}</li>
              <li>{lang === "ro" ? "Data exports" : "Data exports"}</li>
              <li>{lang === "ro" ? "Custom reports" : "Custom reports"}</li>
              <li>{lang === "ro" ? "Media licensing" : "Media licensing"}</li>
              <li>{lang === "ro" ? "Sponsorship placements" : "Sponsorship placements"}</li>
            </ul>
          </CardBody>
        </Card>
        <PartnersLeadForm lang={lang} />
      </div>
    </main>
  );
}


