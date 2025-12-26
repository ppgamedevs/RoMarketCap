"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type IngestRun = {
  id: string;
  source: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  cursor: string | null;
  statsJson: {
    discovered: number;
    invalid: number;
    duplicates: number;
    verified: number;
    errors: number;
  };
  lastError: string | null;
};

type QueueMetrics = {
  NEW: number;
  VERIFIED: number;
  INVALID: number;
  ERROR: number;
  REJECTED: number;
  DUPLICATE: number;
};

export function IngestClient() {
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics>({
    NEW: 0,
    VERIFIED: 0,
    INVALID: 0,
    ERROR: 0,
    REJECTED: 0,
    DUPLICATE: 0,
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [runsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/ingest/runs"),
        fetch("/api/admin/ingest/metrics"),
      ]);

      const runsData = await runsRes.json();
      const metricsData = await metricsRes.json();

      if (runsData.ok) {
        setRuns(runsData.runs);
      }
      if (metricsData.ok) {
        setMetrics(metricsData.metrics);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const runIngest = async (source: string, dry: boolean) => {
    const key = `${source}-${dry ? "dry" : "live"}`;
    setRunning({ ...running, [key]: true });

    try {
      const res = await fetch(
        `/api/admin/ingest/run?source=${source}&discoverLimit=200&verifyLimit=20&dry=${dry ? "1" : "0"}`,
        {
          method: "POST",
        },
      );
      const data = await res.json();

      if (data.ok) {
        alert(`${dry ? "Dry run" : "Run"} completed for ${source}`);
        await fetchData();
      } else {
        alert(data.error || "Failed to run ingestion");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run ingestion");
    } finally {
      setRunning({ ...running, [key]: false });
    }
  };

  const verifyNext = async (limit: number) => {
    setRunning({ ...running, verify: true });

    try {
      const res = await fetch(`/api/admin/ingest/verify?limit=${limit}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok) {
        alert(`Verified ${data.verified} companies`);
        await fetchData();
      } else {
        alert(data.error || "Failed to verify");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setRunning({ ...running, verify: false });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Company Discovery & Ingestion</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Company Discovery & Ingestion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PROMPT 54: National Company Discovery Orchestrator - Discover companies from SEAP and EU Funds, verify via
          ANAF, and upsert to database.
        </p>
      </div>

      {/* Queue Metrics */}
      <div className="mb-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Discovery Queue Metrics</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">{metrics.NEW}</div>
            <div className="text-xs text-muted-foreground">NEW</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{metrics.VERIFIED}</div>
            <div className="text-xs text-muted-foreground">VERIFIED</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{metrics.INVALID}</div>
            <div className="text-xs text-muted-foreground">INVALID</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{metrics.ERROR}</div>
            <div className="text-xs text-muted-foreground">ERROR</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{metrics.REJECTED}</div>
            <div className="text-xs text-muted-foreground">REJECTED</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{metrics.DUPLICATE}</div>
            <div className="text-xs text-muted-foreground">DUPLICATE</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => runIngest("SEAP", true)}
            disabled={running["SEAP-dry"]}
            className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 disabled:opacity-50"
          >
            {running["SEAP-dry"] ? "Running..." : "Run SEAP Discover (Dry)"}
          </button>
          <button
            onClick={() => runIngest("SEAP", false)}
            disabled={running["SEAP-live"]}
            className="rounded bg-green-100 px-4 py-2 text-sm text-green-700 disabled:opacity-50"
          >
            {running["SEAP-live"] ? "Running..." : "Run SEAP Discover+Verify"}
          </button>
          <button
            onClick={() => runIngest("EU_FUNDS", true)}
            disabled={running["EU_FUNDS-dry"]}
            className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 disabled:opacity-50"
          >
            {running["EU_FUNDS-dry"] ? "Running..." : "Run EU Funds Discover (Dry)"}
          </button>
          <button
            onClick={() => runIngest("EU_FUNDS", false)}
            disabled={running["EU_FUNDS-live"]}
            className="rounded bg-green-100 px-4 py-2 text-sm text-green-700 disabled:opacity-50"
          >
            {running["EU_FUNDS-live"] ? "Running..." : "Run EU Funds Discover+Verify"}
          </button>
          <button
            onClick={() => verifyNext(50)}
            disabled={running.verify}
            className="rounded bg-purple-100 px-4 py-2 text-sm text-purple-700 disabled:opacity-50"
          >
            {running.verify ? "Verifying..." : "Verify Next 50"}
          </button>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Ingestion Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Source</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Started</th>
                <th className="text-left p-2">Discovered</th>
                <th className="text-left p-2">Verified</th>
                <th className="text-left p-2">Invalid</th>
                <th className="text-left p-2">Errors</th>
                <th className="text-left p-2">Cursor</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b">
                  <td className="p-2">{run.source}</td>
                  <td className="p-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        run.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : run.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : run.status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="p-2">{new Date(run.startedAt).toLocaleString()}</td>
                  <td className="p-2">{run.statsJson.discovered}</td>
                  <td className="p-2">{run.statsJson.verified}</td>
                  <td className="p-2">{run.statsJson.invalid}</td>
                  <td className="p-2">{run.statsJson.errors}</td>
                  <td className="p-2 text-xs text-muted-foreground">{run.cursor || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/providers">
          Providers
        </Link>
      </div>
    </div>
  );
}

