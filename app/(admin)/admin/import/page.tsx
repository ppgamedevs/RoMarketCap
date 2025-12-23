import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { CsvImportForm } from "@/components/admin/CsvImportForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin import</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste CSV with header columns: cui,name,county,city,caen,website,foundedYear,employees,revenueLatest,profitLatest,description
      </p>
      <div className="mt-6">
        <CsvImportForm />
      </div>
    </main>
  );
}


