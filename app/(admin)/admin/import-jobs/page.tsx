import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { ImportJobsClient } from "./ImportJobsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminImportJobsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  let jobs: Awaited<ReturnType<typeof prisma.importJob.findMany>> = [];
  let tableError: string | null = null;

  try {
    jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        errors: {
          take: 10,
          orderBy: { rowNumber: "asc" },
        },
        _count: {
          select: { errors: true },
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2021" && error?.meta?.target?.includes("import_jobs")) {
      tableError = "The import_jobs table does not exist. Please run the migration endpoint first.";
    } else {
      tableError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Import Jobs</h1>
      <p className="mt-2 text-sm text-muted-foreground">CSV import jobs with streaming processing and error tracking.</p>

      {tableError ? (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 font-medium">Table Missing</p>
          <p className="text-sm text-yellow-700 mt-1">{tableError}</p>
          <p className="text-sm text-yellow-700 mt-2">
            Run this migration endpoint:{" "}
            <code className="bg-yellow-100 px-2 py-1 rounded">
              /api/admin/add-import-jobs-tables?secret=temp-migration-2024
            </code>
          </p>
        </div>
      ) : (
        <ImportJobsClient initialJobs={jobs} />
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/ops">
          Ops
        </Link>
        <Link className="underline underline-offset-4" href="/admin/audit">
          Audit
        </Link>
      </div>
    </main>
  );
}

