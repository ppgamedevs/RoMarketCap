/**
 * PROMPT 60: Coverage Dashboard
 */

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { CoverageDashboardClient } from "./CoverageDashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCoveragePage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">National Coverage Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Monitor coverage, duplicates, and data completeness (PROMPT 60)
      </p>
      <CoverageDashboardClient />
    </main>
  );
}
