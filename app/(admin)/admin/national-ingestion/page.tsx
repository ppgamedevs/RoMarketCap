/**
 * PROMPT 61: National Ingestion Admin Page
 */

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { NationalIngestionClient } from "./NationalIngestionClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminNationalIngestionPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">National Ingestion</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Monitor and trigger automated company ingestion from SEAP, EU funds, and other sources (PROMPT 61)
      </p>
      <NationalIngestionClient />
    </main>
  );
}
