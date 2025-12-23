import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { kv } from "@vercel/kv";
import { getSiteUrl } from "@/lib/seo/site";
import { EnrichmentOpsPanel } from "@/components/admin/EnrichmentOpsPanel";
import { getAllFlags } from "@/src/lib/flags/flags";
import { prisma } from "@/src/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getJson(key: string) {
  const v = await kv.get<string>(key).catch(() => null);
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export default async function AdminOpsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const [health, lastRecalc, lastDigest, lastAlerts, cursorRecent, cursorAll, lastEnrich, flags, lastSnapshot, lockContention] = await Promise.all([
    fetch(`${getSiteUrl()}/api/admin/health`, { cache: "no-store" }).then((r) => r.json().catch(() => null)),
    getJson("cron:last:recalculate"),
    getJson("cron:last:weekly-digest"),
    getJson("cron:last:watchlist-alerts"),
    kv.get("cron:recalc:cursor:recent").catch(() => null),
    kv.get("cron:recalc:cursor:all").catch(() => null),
    kv.get<string>("cron:last:enrich").catch(() => null),
    getAllFlags(),
    kv.get<string>("cron:last:snapshot").catch(() => null),
    kv.get<number>("locks:contention:count").catch(() => null),
  ]);

  // Get recent audit log count
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentAuditCount = await prisma.adminAuditLog.count({
    where: { createdAt: { gte: oneDayAgo } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ops</h1>
        <p className="mt-2 text-sm text-muted-foreground">Health and operational shortcuts.</p>
      </header>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Health</h2>
        </CardHeader>
        <CardBody>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(health, null, 2)}</pre>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Feature Flags</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 text-xs">
            {Object.entries(flags).map(([flag, enabled]) => (
              <div key={flag} className="flex items-center justify-between rounded-md border p-2">
                <span className="font-mono">{flag}</span>
                <Badge variant={enabled ? "success" : "warning"}>{enabled ? "ENABLED" : "DISABLED"}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/admin/flags">
              <Button variant="outline" size="sm">Manage Flags</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Diagnostics</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Lock Contention</p>
              <p className="mt-1 text-xs text-muted-foreground">Recent lock conflicts: {lockContention ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Audit Logs (24h)</p>
              <p className="mt-1 text-xs text-muted-foreground">{recentAuditCount} entries</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Last Snapshot</p>
              <p className="mt-1 text-xs text-muted-foreground">{lastSnapshot ? new Date(lastSnapshot).toLocaleString() : "Never"}</p>
              <Link href="/admin/snapshots" className="mt-2 inline-block">
                <Button variant="ghost" size="sm">View Snapshots</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Cron</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Recalculate</p>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(lastRecalc, null, 2)}</pre>
              <p className="mt-2 text-xs text-muted-foreground">Cursor recent: {String(cursorRecent ?? "null")}</p>
              <p className="text-xs text-muted-foreground">Cursor all: {String(cursorAll ?? "null")}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Weekly digest</p>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(lastDigest, null, 2)}</pre>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Watchlist alerts</p>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(lastAlerts, null, 2)}</pre>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Shortcuts</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/api-keys">
              <Button variant="outline" size="sm">API Keys</Button>
            </Link>
            <Link href="/admin/leads">
              <Button variant="outline" size="sm">Leads</Button>
            </Link>
            <Link href="/admin/audit">
              <Button variant="outline" size="sm">Audit</Button>
            </Link>
            <Link href="/admin/moderation">
              <Button variant="outline" size="sm">Moderation</Button>
            </Link>
            <Link href="/api/health">
              <Button variant="outline" size="sm">Public health</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <section className="mt-6">
        <EnrichmentOpsPanel lastEnrich={lastEnrich ?? null} />
      </section>
    </main>
  );
}


