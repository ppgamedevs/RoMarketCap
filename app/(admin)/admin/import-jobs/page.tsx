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

  const jobs = await prisma.importJob.findMany({
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Import Jobs</h1>
      <p className="mt-2 text-sm text-muted-foreground">CSV import jobs with streaming processing and error tracking.</p>

      <ImportJobsClient initialJobs={jobs} />

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

