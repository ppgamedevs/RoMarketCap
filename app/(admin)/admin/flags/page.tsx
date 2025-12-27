import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getAllFlags, type FeatureFlag } from "@/src/lib/flags/flags";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLAG_DESCRIPTIONS: Record<FeatureFlag, { label: string; description: string; risky: boolean }> = {
  PREMIUM_PAYWALLS: {
    label: "Premium Paywalls",
    description: "Enable/disable premium subscription paywalls",
    risky: false,
  },
  FORECASTS: {
    label: "Forecasts",
    description: "Enable/disable forecast API and UI",
    risky: false,
  },
  ENRICHMENT: {
    label: "Enrichment",
    description: "Enable/disable company data enrichment",
    risky: true,
  },
  ALERTS: {
    label: "Alerts",
    description: "Enable/disable user alert system",
    risky: false,
  },
  PLACEMENTS: {
    label: "Placements",
    description: "Enable/disable sponsor placements",
    risky: false,
  },
  API_ACCESS: {
    label: "API Access",
    description: "Enable/disable API endpoints",
    risky: false,
  },
  NEWSLETTER_SENDS: {
    label: "Newsletter Sends",
    description: "Enable/disable newsletter email sends",
    risky: true,
  },
  CRON_RECALCULATE: {
    label: "Cron: Recalculate",
    description: "Enable/disable score recalculation cron",
    risky: true,
  },
  CRON_ENRICH: {
    label: "Cron: Enrich",
    description: "Enable/disable enrichment cron",
    risky: true,
  },
  CRON_WEEKLY_DIGEST: {
    label: "Cron: Weekly Digest",
    description: "Enable/disable weekly digest cron",
    risky: false,
  },
  CRON_WATCHLIST_ALERTS: {
    label: "Cron: Watchlist Alerts",
    description: "Enable/disable watchlist alerts cron",
    risky: false,
  },
  CRON_BILLING_RECONCILE: {
    label: "Cron: Billing Reconcile",
    description: "Enable/disable billing reconciliation cron",
    risky: true,
  },
  CRON_SNAPSHOT: {
    label: "Cron: Snapshot",
    description: "Enable/disable daily snapshot cron",
    risky: false,
  },
  CRON_PROVIDERS_ENRICH: {
    label: "Cron: Providers Enrich",
    description: "Enable/disable automated provider-based enrichment cron",
    risky: true,
  },
  CRON_INGEST_NATIONAL: {
    label: "Cron: Ingest National",
    description: "Enable/disable national data ingestion cron (SEAP + EU Funds)",
    risky: true,
  },
  CRON_VERIFY_ANAF: {
    label: "Cron: Verify ANAF",
    description: "Enable/disable ANAF verification cron",
    risky: true,
  },
  FLAG_INGEST_NATIONAL: {
    label: "Flag: Ingest National",
    description: "Enable/disable national ingestion orchestrator (SEAP, EU Funds, ANAF, third-party)",
    risky: true,
  },
  FLAG_UNIVERSE_INGEST: {
    label: "Flag: Universe Ingest",
    description: "Enable/disable universe ingestion (skeleton companies from SEAP, EU Funds, ANAF)",
    risky: true,
  },
  INGEST_ENABLED: {
    label: "Ingest Enabled",
    description: "Enable/disable unified ingestion v2 (PROMPT 55)",
    risky: true,
  },
  FINANCIAL_SYNC_ENABLED: {
    label: "Financial Sync: Enabled",
    description: "Enable/disable ANAF financial sync feature (PROMPT 58)",
    risky: true,
  },
  FINANCIAL_SYNC_CRON_ENABLED: {
    label: "Financial Sync: Cron",
    description: "Enable/disable automated financial sync cron job (PROMPT 58)",
    risky: true,
  },
  FINANCIAL_SYNC_ADMIN_ENABLED: {
    label: "Financial Sync: Admin",
    description: "Enable/disable admin endpoints for financial sync (PROMPT 58)",
    risky: false,
  },
  MERGE_CANDIDATES_ENABLED: {
    label: "Merge Candidates: Enabled",
    description: "Enable/disable merge candidates feature (PROMPT 60)",
    risky: true,
  },
  MERGE_CANDIDATES_CRON_ENABLED: {
    label: "Merge Candidates: Cron",
    description: "Enable/disable automated merge candidates cron job (PROMPT 60)",
    risky: true,
  },
  MERGE_ADMIN_ENABLED: {
    label: "Merge: Admin",
    description: "Enable/disable admin endpoints for merge management (PROMPT 60)",
    risky: false,
  },
  NATIONAL_INGESTION_ENABLED: {
    label: "National Ingestion: Enabled",
    description: "Enable/disable national ingestion feature (PROMPT 61)",
    risky: true,
  },
  NATIONAL_INGESTION_CRON_ENABLED: {
    label: "National Ingestion: Cron",
    description: "Enable/disable automated national ingestion cron job (PROMPT 61)",
    risky: true,
  },
  NATIONAL_INGESTION_ADMIN_ENABLED: {
    label: "National Ingestion: Admin",
    description: "Enable/disable admin endpoints for national ingestion (PROMPT 61)",
    risky: false,
  },
  READ_ONLY_MODE: {
    label: "Read-Only Mode",
    description: "Enable read-only mode (blocks all mutations)",
    risky: false,
  },
};

export default async function AdminFlagsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const flags = await getAllFlags();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
      <p className="mt-2 text-sm text-muted-foreground">Kill-switch system for operational control.</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">⚠️ Emergency Controls</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Risky flags default to DISABLED (fail-closed). Safe flags default to ENABLED (fail-open).
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {Object.entries(FLAG_DESCRIPTIONS).map(([flag, info]) => {
          const isEnabled = flags[flag as FeatureFlag];
          return (
            <div key={flag} className="rounded-xl border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{info.label}</h3>
                    {info.risky && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Risky</span>}
                    <span className={`rounded px-2 py-0.5 text-xs ${isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {isEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{info.description}</p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">Flag: {flag}</p>
                </div>
                <form action="/api/admin/flags/toggle" method="POST" className="flex-shrink-0">
                  <input type="hidden" name="flag" value={flag} />
                  <input type="hidden" name="value" value={isEnabled ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`rounded-md px-3 py-2 text-sm ${
                      isEnabled ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isEnabled ? "Disable" : "Enable"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/ops">
          Ops
        </Link>
        <Link className="underline underline-offset-4" href="/admin/audit">
          Audit
        </Link>
      </div>
    </main>
  );
}

