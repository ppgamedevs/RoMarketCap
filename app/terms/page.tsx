import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Termeni - RoMarketCap" : "Terms - RoMarketCap";
  const canonical = `${getSiteUrl()}/terms`;
  return { title, alternates: { canonical } };
}

export default async function TermsPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Termeni" : "Terms"}</h1>
      </header>
      <Card className="mt-6">
        <CardBody className="space-y-4 text-sm text-muted-foreground leading-6">
        <p>
          {lang === "ro"
            ? "Prin folosirea RoMarketCap accepți acești termeni. Serviciul oferă pagini publice, estimări și funcționalități Premium."
            : "By using RoMarketCap you agree to these terms. The service provides public pages, estimates, and Premium features."}
        </p>
        <p>
          {lang === "ro"
            ? "Nu garantăm acuratețea completă a datelor. Estimările sunt orientative și pot fi actualizate."
            : "We do not guarantee complete accuracy. Estimates are indicative and may change."}
        </p>
        <p>
          {lang === "ro"
            ? "Accesul Premium este condiționat de abonament activ. Dacă ai probleme, contactează-ne."
            : "Premium access requires an active subscription. If you have issues, contact us."}
        </p>
        </CardBody>
      </Card>
    </main>
  );
}


