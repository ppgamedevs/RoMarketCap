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

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const sp = await searchParams;
  const statusRaw = asString(sp.status).trim();
  const status = statusRaw === "NEW" || statusRaw === "CONTACTED" || statusRaw === "CLOSED" ? statusRaw : "";

  const leads = await prisma.partnerLead.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Partner Leads</h1>
      <div className="mt-4 flex gap-3 text-sm">
        <Link className="underline underline-offset-4" href="/admin/leads">
          All
        </Link>
        <Link className="underline underline-offset-4" href="/admin/leads?status=NEW">
          NEW
        </Link>
        <Link className="underline underline-offset-4" href="/admin/leads?status=CONTACTED">
          CONTACTED
        </Link>
        <Link className="underline underline-offset-4" href="/admin/leads?status=CLOSED">
          CLOSED
        </Link>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-6">
        {leads.length === 0 ? <p className="text-sm text-muted-foreground">N/A</p> : null}
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {l.company} - {l.useCase} ({l.status})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.name} · {l.email} · {l.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <form action={`/api/admin/leads/${l.id}/status`} method="post" className="flex gap-2">
                  <select name="status" defaultValue={l.status} className="rounded-md border bg-background px-2 py-1 text-sm">
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">
                    Save
                  </button>
                </form>
              </div>
              <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{l.message}</pre>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}


