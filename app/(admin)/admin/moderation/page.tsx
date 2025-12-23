import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getCooldownRemainingSeconds } from "@/src/lib/cooldown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const pendingClaims = await prisma.companyClaim.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { company: { select: { id: true, name: true, slug: true, cui: true } }, user: { select: { id: true, email: true } } },
    take: 100,
  });

  const pendingSubs = await prisma.companySubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { company: { select: { id: true, name: true, slug: true, cui: true } }, user: { select: { id: true, email: true } } },
    take: 100,
  });

  const claimSignals = await Promise.all(
    pendingClaims.map(async (c) => {
      const [approvedClaims, approvedSubs, cd] = await Promise.all([
        prisma.companyClaim.count({ where: { userId: c.userId, status: "APPROVED" } }),
        prisma.companySubmission.count({ where: { userId: c.userId, status: "APPROVED" } }),
        getCooldownRemainingSeconds("claim", c.userId, c.companyId),
      ]);
      return { id: c.id, approvedClaims, approvedSubs, cooldownSeconds: cd };
    }),
  );
  const claimSignalMap = new Map(claimSignals.map((x) => [x.id, x]));

  const subSignals = await Promise.all(
    pendingSubs.map(async (s) => {
      const [approvedClaims, approvedSubs, cd] = await Promise.all([
        prisma.companyClaim.count({ where: { userId: s.userId, status: "APPROVED" } }),
        prisma.companySubmission.count({ where: { userId: s.userId, status: "APPROVED" } }),
        getCooldownRemainingSeconds("submission", s.userId, s.companyId),
      ]);
      return { id: s.id, approvedClaims, approvedSubs, cooldownSeconds: cd };
    }),
  );
  const subSignalMap = new Map(subSignals.map((x) => [x.id, x]));

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review pending claims and submissions.</p>

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Claims (pending)</h2>
        <div className="mt-4 space-y-3">
          {pendingClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">N/A</p>
          ) : (
            pendingClaims.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="text-sm">
                  <span className="font-medium">{c.company.name}</span> (CUI {c.company.cui ?? "N/A"}) - role {c.role}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Submitted by {c.user.email ?? "N/A"} on {c.createdAt.toISOString().slice(0, 10)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Signals: approved claims {claimSignalMap.get(c.id)?.approvedClaims ?? 0}, approved submissions{" "}
                  {claimSignalMap.get(c.id)?.approvedSubs ?? 0}, cooldown{" "}
                  {claimSignalMap.get(c.id)?.cooldownSeconds ? `${claimSignalMap.get(c.id)!.cooldownSeconds}s` : "0s"}
                </div>
                {c.note ? <div className="mt-2 text-sm text-muted-foreground">Note: {c.note}</div> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <form action={`/api/admin/moderation/claims/${c.id}/approve`} method="post" className="flex gap-2">
                    <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" name="note" placeholder="Optional review note" />
                    <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">
                      Approve
                    </button>
                  </form>
                  <form action={`/api/admin/moderation/claims/${c.id}/reject`} method="post" className="flex gap-2">
                    <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" name="note" placeholder="Optional review note" />
                    <button className="rounded-md border px-3 py-2 text-sm" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Submissions (pending)</h2>
        <div className="mt-4 space-y-3">
          {pendingSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">N/A</p>
          ) : (
            pendingSubs.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="text-sm">
                  <span className="font-medium">{s.company.name}</span> (CUI {s.company.cui ?? "N/A"}) - {s.type}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Submitted by {s.user.email ?? "N/A"} on {s.createdAt.toISOString().slice(0, 10)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Signals: approved claims {subSignalMap.get(s.id)?.approvedClaims ?? 0}, approved submissions{" "}
                  {subSignalMap.get(s.id)?.approvedSubs ?? 0}, cooldown{" "}
                  {subSignalMap.get(s.id)?.cooldownSeconds ? `${subSignalMap.get(s.id)!.cooldownSeconds}s` : "0s"}
                </div>
                <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(s.payload, null, 2)}</pre>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <form action={`/api/admin/moderation/submissions/${s.id}/approve`} method="post" className="flex gap-2">
                    <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" name="note" placeholder="Optional review note" />
                    <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">
                      Approve
                    </button>
                  </form>
                  <form action={`/api/admin/moderation/submissions/${s.id}/reject`} method="post" className="flex gap-2">
                    <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" name="note" placeholder="Optional review note" />
                    <button className="rounded-md border px-3 py-2 text-sm" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}


