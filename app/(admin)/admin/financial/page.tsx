/**
 * PROMPT 58: Admin Financial Sync Page
 */

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { FinancialSyncClient } from "./FinancialSyncClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminFinancialPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Financial Sync (ANAF)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sync company financials from ANAF web service (PROMPT 58)
      </p>
      <FinancialSyncClient />
    </main>
  );
}

