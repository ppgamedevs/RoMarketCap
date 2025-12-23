"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";

type ImportJob = Prisma.ImportJobGetPayload<{
  include: {
    errors: true;
    _count: { select: { errors: true } };
  };
}>;

export function ImportJobsClient({ initialJobs }: { initialJobs: ImportJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("csv") as File | null;
    const sourceName = (formData.get("sourceName") as string) || "csv_import";

    if (!file) {
      setError("Please select a CSV file");
      setUploading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("csv", file);
      uploadFormData.append("sourceName", sourceName);

      const res = await fetch("/api/admin/import/stream", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Refresh jobs list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      RUNNING: "bg-blue-100 text-blue-800",
      SUCCESS: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`rounded px-2 py-0.5 text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Upload Form */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Upload CSV</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a CSV file with company data. Columns: name, cui, domain, county, city, address, industry, website, etc.
        </p>
        <form onSubmit={handleUpload} className="mt-4 space-y-4">
          <div>
            <label htmlFor="sourceName" className="block text-sm font-medium">
              Source Name
            </label>
            <input
              type="text"
              id="sourceName"
              name="sourceName"
              defaultValue="csv_import"
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., source0, anaf_export"
            />
          </div>
          <div>
            <label htmlFor="csv" className="block text-sm font-medium">
              CSV File
            </label>
            <input
              type="file"
              id="csv"
              name="csv"
              accept=".csv"
              required
              className="mt-1 block w-full text-sm"
              disabled={uploading}
            />
          </div>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Start Import"}
          </button>
        </form>
      </section>

      {/* Jobs List */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Recent Jobs</h2>
        <div className="mt-4 space-y-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No import jobs yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{job.sourceName}</span>
                      {statusBadge(job.status)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.processedRows} / {job.totalRows} processed
                      {job.errorRows > 0 && ` • ${job.errorRows} errors`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Started: {job.startedAt?.toLocaleString() || "N/A"}
                      {job.finishedAt && ` • Finished: ${job.finishedAt.toLocaleString()}`}
                    </p>
                    {job.notes && <p className="mt-1 text-xs text-muted-foreground">{job.notes}</p>}
                  </div>
                </div>
                {job.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Show {job.errors.length} error(s)
                    </summary>
                    <div className="mt-2 space-y-1 rounded-md bg-muted p-2 text-xs">
                      {job.errors.map((err) => (
                        <div key={err.id}>
                          <span className="font-medium">Row {err.rowNumber}:</span> {err.reason}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

