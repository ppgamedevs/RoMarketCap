import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { DemoAdminClient } from "./DemoAdminClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDemoPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const demoCount = await prisma.company.count({ where: { isDemo: true } });
  const totalCount = await prisma.company.count();
  const isDemoMode = process.env.DEMO_MODE === "1";

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Demo Mode & Seed Data</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage demo companies and seed data.</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Status</h2>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Demo Mode:</span>
            <span className={isDemoMode ? "text-green-600" : "text-gray-600"}>{isDemoMode ? "ENABLED" : "DISABLED"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Demo Companies:</span>
            <span>{demoCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Companies:</span>
            <span>{totalCount}</span>
          </div>
        </div>
        {!isDemoMode && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3 text-xs text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
            <p>Demo mode is disabled. Set DEMO_MODE=1 to enable demo banner.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <DemoAdminClient demoCount={demoCount} />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/launch">
          Launch Control
        </Link>
      </div>
    </main>
  );
}

