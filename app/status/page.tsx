import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { getPlacementsForLocation } from "@/src/lib/placements";
import { Placements } from "@/components/placements/Placements";
import { getFreshnessAggregates } from "@/src/lib/freshness/aggregates";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Status - RoMarketCap" : "Status - RoMarketCap";
  const description = lang === "ro" ? "Status public al serviciului." : "Public service status.";
  const canonical = `${getSiteUrl()}/status`;
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function StatusPage() {
  const lang = await getLangFromRequest();
  const base = getSiteUrl();
  const placements = await getPlacementsForLocation("pricing", lang); // reuse pricing placements for now
  const health = await fetch(`${base}/api/health`, { cache: "no-store" }).then((r) => r.json().catch(() => null));
  const freshness = await getFreshnessAggregates();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Status" : "Status"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro" ? "Informații publice despre uptime și joburi." : "Public uptime and job info."}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Health" : "Health"}</h2>
          </CardHeader>
          <CardBody>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(health, null, 2)}</pre>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Actualizare date" : "Data Freshness"}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {lang === "ro" ? "Scorat în ultimele 7 zile" : "Scored within 7 days"}
                </span>
                <span className="font-medium">
                  {freshness.totalCompanies > 0
                    ? `${Math.round((freshness.scoredWithin7d / freshness.totalCompanies) * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {lang === "ro" ? "Scorat în ultimele 30 zile" : "Scored within 30 days"}
                </span>
                <span className="font-medium">
                  {freshness.totalCompanies > 0
                    ? `${Math.round((freshness.scoredWithin30d / freshness.totalCompanies) * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {lang === "ro" ? "Îmbogățit în ultimele 30 zile" : "Enriched within 30 days"}
                </span>
                <span className="font-medium">
                  {freshness.totalCompanies > 0
                    ? `${Math.round((freshness.enrichedWithin30d / freshness.totalCompanies) * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                {lang === "ro" ? "Total companii" : "Total companies"}: {freshness.totalCompanies}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* PROMPT 55: Ingestion Health */}
        {health?.ingestion && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">{lang === "ro" ? "Ingestion Health" : "Ingestion Health"}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                {health.ingestion.lastRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{lang === "ro" ? "Ultima rulare" : "Last run"}:</span>
                    <span className="text-xs">
                      {new Date(health.ingestion.lastRun.startedAt).toLocaleString(lang === "ro" ? "ro-RO" : "en-GB")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {lang === "ro" ? "Companii văzute în ultimele 30 zile" : "Companies seen in last 30 days"}
                  </span>
                  <span className="font-medium">{health.ingestion.companiesWithSourceSeen ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {lang === "ro" ? "Companii doar manuale" : "Manual-only companies"}
                  </span>
                  <span className="font-medium">{health.ingestion.manualOnly ?? 0}</span>
                </div>
                {health.ingestion.topErrors && health.ingestion.topErrors.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      {lang === "ro" ? "Top erori (ultimele 7 zile)" : "Top errors (last 7 days)"}:
                    </div>
                    {health.ingestion.topErrors.map((err: { code: string; count: number }) => (
                      <div key={err.code} className="flex items-center justify-between text-xs">
                        <span>{err.code}</span>
                        <span>{err.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* PROMPT 56: Coverage Block */}
        {health?.ingestion && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium">{lang === "ro" ? "Coverage" : "Coverage"}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {lang === "ro" ? "Companii indexate" : "Companies indexed"}
                  </span>
                  <span className="font-medium">{freshness.totalCompanies}</span>
                </div>
                {health.ingestion.lastIngestTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {lang === "ro" ? "Ultima ingestion" : "Last ingestion"}
                    </span>
                    <span className="text-xs">
                      {new Date(health.ingestion.lastIngestTime).toLocaleString(lang === "ro" ? "ro-RO" : "en-GB")}
                    </span>
                  </div>
                )}
                {health.ingestion.companiesWithSourceSeen != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {lang === "ro" ? "Văzute din surse (30 zile)" : "Seen from sources (30 days)"}
                    </span>
                    <span className="font-medium">{health.ingestion.companiesWithSourceSeen}</span>
                  </div>
                )}
                {health.ingestion.stats && (
                  <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                    {lang === "ro" ? "Procesate" : "Processed"}: {(health.ingestion.stats as { processed?: number })?.processed || 0}
                    {" | "}
                    {lang === "ro" ? "Create" : "Created"}: {(health.ingestion.stats as { created?: number })?.created || 0}
                    {" | "}
                    {lang === "ro" ? "Actualizate" : "Updated"}: {(health.ingestion.stats as { updated?: number })?.updated || 0}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        <Placements placements={placements} location="status" showEmptyState />
      </div>
    </main>
  );
}


