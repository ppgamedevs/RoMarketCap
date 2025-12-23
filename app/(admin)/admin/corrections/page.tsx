import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCorrectionsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const rows = await prisma.correctionRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { company: { select: { slug: true, name: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Correction requests</h1>
      <p className="mt-2 text-sm text-muted-foreground">Latest 200.</p>

      <section className="mt-6 rounded-xl border bg-card p-6">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">N/A</p> : null}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                {r.company ? (
                  <>
                    {r.company.name} ({r.company.slug})
                  </>
                ) : (
                  "N/A"
                )}{" "}
                · {r.status}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.createdAt.toISOString()} · {r.email}
              </p>
              <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{r.message}</pre>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}


