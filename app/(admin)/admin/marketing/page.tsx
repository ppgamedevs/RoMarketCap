import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getSiteUrl } from "@/lib/seo/site";
import { MarketingDashboardClient } from "./MarketingDashboardClient";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const baseUrl = getSiteUrl();
  const metricsUrl = `${baseUrl}/api/admin/marketing/metrics`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Marketing Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Marketing KPIs and conversion metrics. Single source of truth for growth tracking.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Metrics Overview</h2>
        </CardHeader>
        <CardBody>
          <MarketingDashboardClient metricsUrl={metricsUrl} />
        </CardBody>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Traffic metrics require <code>PLAUSIBLE_API_KEY</code> to be configured. Database
          metrics are always available.
        </p>
        <p className="mt-2">
          See <code>docs/MARKETING_METRICS.md</code> for metric definitions and tracking details.
        </p>
      </div>
    </main>
  );
}

