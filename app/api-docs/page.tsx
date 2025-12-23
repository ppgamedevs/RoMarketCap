import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest } from "@/src/lib/i18n";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "API Docs - RoMarketCap" : "API Docs - RoMarketCap";
  const description = lang === "ro" ? "Documentație API publică pentru parteneri." : "Public API docs for partners.";
  const canonical = `${getSiteUrl()}/api-docs`;
  const indexable = process.env.API_DOCS_INDEXABLE === "1";
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: false },
  };
}

export default async function ApiDocsPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">API Docs</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-6">
          {lang === "ro"
            ? "Trimite header x-api-key pentru acces partener. Cheile sunt gestionate de admin."
            : "Send x-api-key header for partner access. Keys are managed by admin."}
        </p>
      </header>

      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-sm font-medium">Endpoints</h2>
        </CardHeader>
        <CardBody>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              <code className="rounded bg-muted px-1 py-0.5">/api/search?q=</code>
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">/api/company/&lt;cui&gt;/insights</code>
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">/api/company/&lt;cui&gt;/forecast</code>
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">/api/company/&lt;cui&gt;/premium</code> (requires Premium/Partner plan)
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Rata de cereri depinde de plan și de tier-ul configurat pentru cheie."
              : "Rate limits depend on plan and the configured key tier."}
          </p>
        </CardBody>
      </Card>

      <div className="mt-6">
        <Link href="/partners">
          <Button variant="outline">{lang === "ro" ? "Contact pentru acces API" : "Contact for API access"}</Button>
        </Link>
      </div>
    </main>
  );
}


