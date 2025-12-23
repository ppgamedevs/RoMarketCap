import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { TrackNewsletterView } from "@/components/analytics/TrackNewsletterView";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Newsletter - RoMarketCap" : "Newsletter - RoMarketCap";
  const description =
    lang === "ro"
      ? "Primește săptămânal ROMC Movers și semnale, direct pe email."
      : "Get weekly ROMC Movers and signals in your inbox.";
  const canonical = `${getSiteUrl()}/newsletter`;
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function NewsletterPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <TrackNewsletterView />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{lang === "ro" ? "Newsletter" : "Newsletter"}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-6">
          {lang === "ro"
            ? "Un rezumat săptămânal cu Movers, semnale și context. Util pentru investitori, fondatori și jurnaliști."
            : "A weekly digest with Movers, signals, and context. Useful for investors, founders, and journalists."}
        </p>
      </header>

      <Card className="mt-8">
        <CardBody>
          <p className="text-sm font-medium mb-3">{lang === "ro" ? "Ce primești:" : "What you get:"}</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>{lang === "ro" ? "Top Movers (creșteri și scăderi)." : "Top Movers (up and down)."}</li>
            <li>{lang === "ro" ? "Industrii și județe în trend." : "Trending industries and counties."}</li>
            <li>{lang === "ro" ? "Linkuri către pagini publice și watchlist." : "Links to public pages and watchlist."}</li>
          </ul>
        </CardBody>
      </Card>

      <div className="mt-8">
        <NewsletterForm lang={lang} />
      </div>
    </main>
  );
}


