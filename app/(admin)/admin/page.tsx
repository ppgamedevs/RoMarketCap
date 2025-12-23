import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.user.email}</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">Scoring</p>
        <p className="mt-1 text-sm text-muted-foreground">Trigger a recompute via protected API.</p>
        <div className="mt-4 flex gap-3 text-sm">
          <Link className="underline underline-offset-4" href="/billing">
            Billing
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use curl (with session cookie) to call POST /api/admin/score/recompute.
        </p>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">User</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Role: {session.user.role}. Premium: {me?.isPremium ? "yes" : "no"}.
        </p>
      </div>
    </main>
  );
}


