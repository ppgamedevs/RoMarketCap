import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Press - RoMarketCap" : "Press - RoMarketCap";
  const description =
    lang === "ro"
      ? "Resurse pentru presă: comunicate de presă, media kit, citate, contact media."
      : "Press resources: press releases, media kit, quotes, media contact.";
  const canonical = `${getSiteUrl()}/press`;

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
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PressPage() {
  const lang = await getLangFromRequest();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Resurse pentru presă" : "Press Resources"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Comunicate de presă, media kit, citate și contact media."
            : "Press releases, media kit, quotes, and media contact."}
        </p>
      </header>

      {/* Press Releases */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">
              {lang === "ro" ? "Comunicate de presă" : "Press Releases"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div>
                <Link href="/press/press-release-ro" className="underline underline-offset-4">
                  {lang === "ro" ? "Comunicat de presă (RO)" : "Press Release (RO)"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Comunicat de presă în limba română pentru lansarea RoMarketCap."
                    : "Press release in Romanian for RoMarketCap launch."}
                </p>
              </div>
              <div>
                <Link href="/press/press-release-en" className="underline underline-offset-4">
                  {lang === "ro" ? "Comunicat de presă (EN)" : "Press Release (EN)"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Comunicat de presă în limba engleză pentru lansarea RoMarketCap."
                    : "Press release in English for RoMarketCap launch."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Media Kit */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">
              {lang === "ro" ? "Media Kit" : "Media Kit"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div>
                <Link href="/press/one-pager" className="underline underline-offset-4">
                  {lang === "ro" ? "One-Pager" : "One-Pager"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Rezumat pe o pagină despre RoMarketCap."
                    : "One-page summary about RoMarketCap."}
                </p>
              </div>
              <div>
                <Link href="/press/founder-bio" className="underline underline-offset-4">
                  {lang === "ro" ? "Biografie fondator" : "Founder Bio"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Biografie a fondatorului pentru utilizare în presă."
                    : "Founder biography for media use."}
                </p>
              </div>
              <div>
                <Link href="/press/journalist-faq" className="underline underline-offset-4">
                  {lang === "ro" ? "FAQ pentru jurnaliști" : "FAQ for Journalists"}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro"
                    ? "Întrebări frecvente pentru jurnaliști."
                    : "Frequently asked questions for journalists."}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Media Contact */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">
              {lang === "ro" ? "Contact media" : "Media Contact"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Pentru interviuri și comentarii:" : "For interviews and comments:"}
                </p>
                <a href="mailto:press@romarketcap.ro" className="text-muted-foreground underline underline-offset-4">
                  press@romarketcap.ro
                </a>
              </div>
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Pentru cereri de date:" : "For data requests:"}
                </p>
                <a href="mailto:data@romarketcap.ro" className="text-muted-foreground underline underline-offset-4">
                  data@romarketcap.ro
                </a>
              </div>
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Răspuns în:" : "Response time:"}
                </p>
                <p className="text-muted-foreground">
                  {lang === "ro" ? "24 de ore" : "24 hours"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Quick Facts */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">
              {lang === "ro" ? "Cifre cheie" : "Key Facts"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Fondat:" : "Founded:"}
                </p>
                <p className="text-muted-foreground">[Year]</p>
              </div>
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Sediul:" : "Headquarters:"}
                </p>
                <p className="text-muted-foreground">Bucharest, Romania</p>
              </div>
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Companii urmărite:" : "Companies Tracked:"}
                </p>
                <p className="text-muted-foreground">[X]</p>
              </div>
              <div>
                <p className="font-medium">
                  {lang === "ro" ? "Utilizatori:" : "Users:"}
                </p>
                <p className="text-muted-foreground">[Y]</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}

