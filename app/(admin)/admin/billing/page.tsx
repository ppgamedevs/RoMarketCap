import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/login");

  const lang = await getLangFromRequest();

  const [auditLogs, lastReconcile, stats] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: {
        action: { in: ["BILLING_WEBHOOK", "BILLING_RECONCILE_FLIP"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: {
          select: { email: true },
        },
      },
    }),
    kv.get<string>("cron:last:billing").catch(() => null),
    kv.get<string>("cron:stats:billing").catch(() => null),
  ]);

  const statsParsed = stats ? JSON.parse(stats) : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Billing Audit" : "Billing Audit"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ro" ? "Vizualizează evenimente de facturare și reconciliere." : "View billing and reconciliation events."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Status reconciliere" : "Reconciliation Status"}</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{lang === "ro" ? "Ultima rulare" : "Last run"}</span>
              <span className="font-medium">{lastReconcile ? new Date(lastReconcile).toLocaleString() : "N/A"}</span>
            </div>
            {statsParsed && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ro" ? "Procesate" : "Processed"}</span>
                  <span className="font-medium">{statsParsed.processed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ro" ? "Schimbări" : "Flipped"}</span>
                  <span className="font-medium">{statsParsed.flipped ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ro" ? "Erori" : "Errors"}</span>
                  <span className="font-medium">{statsParsed.errors ?? 0}</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href={`${getSiteUrl()}/api/cron/billing-reconcile?dry=1&limit=10`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              {lang === "ro" ? "Dry run (link)" : "Dry run (link)"}
            </a>
            <p className="text-xs text-muted-foreground">
              {lang === "ro"
                ? "Notă: Rulează manual cu x-cron-secret header pentru execuție reală."
                : "Note: Run manually with x-cron-secret header for real execution."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Ultimele evenimente" : "Recent Events"}</h2>
          <div className="mt-4 space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{lang === "ro" ? "Nu există evenimente" : "No events"}</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {log.actor.email && <span>Actor: {log.actor.email}</span>}
                      {log.metadata && typeof log.metadata === "object" && (
                        <pre className="mt-1 overflow-auto text-xs">{JSON.stringify(log.metadata, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

