import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const sp = await searchParams;
  const action = asString(sp.action).trim();
  const entityType = asString(sp.entityType).trim();

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { email: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin audit</h1>
      <p className="mt-2 text-sm text-muted-foreground">Latest admin actions (200).</p>

      <form className="mt-6 grid gap-3 sm:grid-cols-3" action="/admin/audit" method="get">
        <input name="action" defaultValue={action} placeholder="action" className="rounded-md border bg-background px-3 py-2 text-sm" />
        <input
          name="entityType"
          defaultValue={entityType}
          placeholder="entityType"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">
          Filter
        </button>
      </form>

      <div className="mt-3 text-sm">
        <Link className="underline underline-offset-4" href="/admin/audit">
          Reset
        </Link>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-6">
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">N/A</p> : null}
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                {l.action} · {l.entityType} · {l.entityId}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l.createdAt.toISOString()} · {l.actor.email ?? "N/A"}
              </p>
              {l.metadata ? <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(l.metadata, null, 2)}</pre> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}


