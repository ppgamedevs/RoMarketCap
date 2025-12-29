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
            ? "Folosim autentificare (email/parolă), plăți (Stripe) și emailuri tranzacționale (Resend)."
            : "We use authentication (email/password), payments (Stripe), and transactional emails (Resend)."}
        </p>
        <p>
          {lang === "ro" ? (
            <>
              Colectăm date minime pentru cont și abonament. Folosim Google Analytics pentru a înțelege cum este utilizat site-ul. Consultați{" "}
              <a href="/cookie-policy" className="text-primary underline underline-offset-4">
                politica noastră de cookie-uri
              </a>{" "}
              pentru mai multe detalii.
            </>
          ) : (
            <>
              We collect minimal data for account and subscription. We use Google Analytics to understand how the website is used. See our{" "}
              <a href="/cookie-policy" className="text-primary underline underline-offset-4">
                cookie policy
              </a>{" "}
              for more details.
            </>
          )}
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


