import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Disclaimer - RoMarketCap" : "Disclaimer - RoMarketCap";
  const canonical = `${getSiteUrl()}/disclaimer`;
  return { title, alternates: { canonical } };
}

export default async function DisclaimerPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Disclaimer</h1>
      </header>
      <Card className="mt-6">
        <CardBody className="space-y-4 text-sm text-muted-foreground leading-6">
        <p>
          {lang === "ro"
            ? "RoMarketCap oferă estimări și informații despre companii private. Nu este consultanță financiară."
            : "RoMarketCap provides estimates and information about private companies. Not financial advice."}
        </p>
        <p>
          {lang === "ro"
            ? "Scorurile și intervalele de evaluare sunt deterministe și pot avea erori. Folosește-le ca punct de plecare pentru research."
            : "Scores and valuation ranges are deterministic and can be wrong. Use them as a starting point for research."}
        </p>
        <p>
          {lang === "ro"
            ? "Nu recomandăm investiții sau tranzacții. Deciziile sunt responsabilitatea ta."
            : "We do not recommend investments or transactions. Decisions are your responsibility."}
        </p>
        </CardBody>
      </Card>
    </main>
  );
}


