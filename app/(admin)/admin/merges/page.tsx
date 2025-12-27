/**
 * PROMPT 60: Merge Candidates Admin Page
 */

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { MergeCandidatesClient } from "./MergeCandidatesClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminMergesPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Merge Candidates</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review and approve company merge candidates (PROMPT 60)
      </p>
      <MergeCandidatesClient />
    </main>
  );
}

