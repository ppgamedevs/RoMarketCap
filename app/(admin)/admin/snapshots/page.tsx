import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSnapshotsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const snapshots = await prisma.systemSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">System Snapshots</h1>
      <p className="mt-2 text-sm text-muted-foreground">Daily immutable snapshots for rollback safety.</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">⚠️ Rollback Safety</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Snapshots capture system state at a point in time. Use for &quot;oh shit&quot; moments and data integrity verification.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {snapshots.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No snapshots yet. First snapshot will be created when cron runs.
          </div>
        ) : (
          snapshots.map((snapshot) => {
            const avgRomc = snapshot.avgRomcScore ? Number(snapshot.avgRomcScore) : null;
            const forecastDist = snapshot.forecastDistribution as Array<{ horizonDays: number; count: number }> | null;
            const integrityDist = snapshot.integrityScoreDist as Record<string, number> | null;

            return (
              <div key={snapshot.id} className="rounded-xl border bg-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {new Date(snapshot.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <span className="font-medium">Companies:</span> {snapshot.companyCount.toLocaleString()}
                      </div>
                      {avgRomc != null ? (
                        <div>
                          <span className="font-medium">Avg ROMC:</span> {avgRomc.toFixed(2)}
                        </div>
                      ) : null}
                      {forecastDist && forecastDist.length > 0 ? (
                        <div>
                          <span className="font-medium">Forecasts:</span> {forecastDist.map((f) => `${f.horizonDays}d: ${f.count}`).join(", ")}
                        </div>
                      ) : null}
                      {integrityDist ? (
                        <div>
                          <span className="font-medium">Score dist:</span>{" "}
                          {Object.entries(integrityDist)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs font-mono text-muted-foreground">ID: {snapshot.id}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/ops">
          Ops
        </Link>
        <Link className="underline underline-offset-4" href="/admin/flags">
          Flags
        </Link>
      </div>
    </main>
  );
}

