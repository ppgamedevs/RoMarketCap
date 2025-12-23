import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PaidAcquisitionBudget } from "@/components/admin/PaidAcquisitionBudget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaidAcquisitionPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Paid Acquisition Budget</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage budget caps and kill-switch for paid acquisition experiments.
        </p>
      </div>

      <PaidAcquisitionBudget />
    </main>
  );
}

