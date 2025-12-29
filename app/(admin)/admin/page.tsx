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
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.user.email}</p>

      {/* Import Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Import Companies</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* National Ingestion */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium mb-2">National Ingestion (Automated)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automated pipeline that fetches companies from SEAP, EU funds, and other sources. 
              Continuously brings real Romanian companies into the database.
            </p>
            <Link 
              href="/admin/national-ingestion"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open National Ingestion →
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              View stats, trigger runs, manage checkpoints
            </p>
          </div>

          {/* CSV Import */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium mb-2">CSV Import</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a CSV file to import companies manually. Supports batch processing 
              with validation and deduplication.
            </p>
            <Link 
              href="/admin/import-jobs"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open CSV Import →
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Upload CSV, track import jobs, view results
            </p>
          </div>

          {/* Universe Dashboard */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium mb-2">Universe Dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View company universe statistics and trigger ingestion runs 
              for specific sources (SEAP, EU funds, etc.).
            </p>
            <Link 
              href="/admin/universe"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open Universe Dashboard →
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Stats, source-specific ingestion, dry runs
            </p>
          </div>

          {/* Coverage Dashboard */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium mb-2">Coverage Dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor data completeness, source coverage, duplicate risk, 
              and field-level statistics across all companies.
            </p>
            <Link 
              href="/admin/coverage"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open Coverage Dashboard →
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Data quality metrics, missing data segments
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link 
            href="/admin/merges"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">Merge Candidates</p>
            <p className="text-xs text-muted-foreground mt-1">Review duplicate companies</p>
          </Link>
          <Link 
            href="/admin/flags"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">Feature Flags</p>
            <p className="text-xs text-muted-foreground mt-1">Manage system features</p>
          </Link>
          <Link 
            href="/admin/ingest"
            className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">Ingestion Queue</p>
            <p className="text-xs text-muted-foreground mt-1">Monitor ingestion jobs</p>
          </Link>
        </div>
      </div>

      {/* User Info */}
      <div className="mt-8 rounded-xl border bg-card p-6">
        <p className="text-sm font-medium">User Info</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Role: <span className="font-medium">{session.user.role}</span>. 
          Premium: <span className="font-medium">{me?.isPremium ? "yes" : "no"}</span>.
        </p>
      </div>
    </main>
  );
}


