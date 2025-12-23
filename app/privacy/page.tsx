import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Confidențialitate - RoMarketCap" : "Privacy - RoMarketCap";
  const canonical = `${getSiteUrl()}/privacy`;
  return { title, alternates: { canonical } };
}

export default async function PrivacyPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Confidențialitate" : "Privacy"}</h1>
      </header>
      <Card className="mt-6">
        <CardBody className="space-y-4 text-sm text-muted-foreground leading-6">
        <p>
          {lang === "ro"
            ? "Folosim autentificare (GitHub), plăți (Stripe) și emailuri tranzacționale (Resend)."
            : "We use authentication (GitHub), payments (Stripe), and transactional emails (Resend)."}
        </p>
        <p>
          {lang === "ro"
            ? "Colectăm date minime pentru cont și abonament. Evenimentele de analytics sunt cookie-less (Plausible), dacă este activat."
            : "We collect minimal data for account and subscription. Analytics events are cookie-less (Plausible) when enabled."}
        </p>
        <p>
          {lang === "ro"
            ? "Poți solicita ștergerea contului prin email."
            : "You can request account deletion via email."}
        </p>
        </CardBody>
      </Card>
    </main>
  );
}


