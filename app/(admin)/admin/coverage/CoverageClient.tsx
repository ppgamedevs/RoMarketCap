"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CoverageStats = {
  total: number;
  withDomain: number;
  withIndustry: number;
  withCounty: number;
  withRevenue: number;
  withEmployees: number;
  scored: number;
  enriched: number;
  confidenceDistribution: {
    low: number; // 0-39
    medium: number; // 40-69
    high: number; // 70-100
  };
  integrityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  provenanceBreakdown: {
    official: number;
    thirdParty: number;
    userApproved: number;
    enrichment: number;
  };
};

type IngestRun = {
  timestamp: string;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  duration: number;
  perSource?: Record<string, unknown>;
};

export function CoverageClient() {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, runsRes] = await Promise.all([
        fetch("/api/admin/coverage/stats"),
        fetch("/api/admin/coverage/runs"),
      ]);

      const statsData = await statsRes.json();
      const runsData = await runsRes.json();

      if (statsData.ok) {
        setStats(statsData.stats);
      }
      if (runsData.ok) {
        setRuns(runsData.runs);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerIngest = async (dry: boolean, budget?: number) => {
    setRunning(true);
    try {
      const url = `/api/cron/ingest-national-v2?dry=${dry ? "1" : "0"}${budget ? `&budgetCompanies=${budget}` : ""}`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        alert(`${dry ? "Dry run" : "Run"} completed: ${data.summary?.processed || 0} processed`);
        await fetchData();
      } else {
        alert(data.error || "Failed to run ingestion");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run ingestion");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Coverage Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Coverage Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PROMPT 56: National coverage metrics and ingestion monitoring
        </p>
      </div>

      {/* Actions */}
      <div className="mb-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => triggerIngest(true)}
            disabled={running}
            className="rounded bg-blue-100 px-4 py-2 text-sm text-blue-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Trigger Dry Run"}
          </button>
          <button
            onClick={() => triggerIngest(false, 50)}
            disabled={running}
            className="rounded bg-green-100 px-4 py-2 text-sm text-green-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Trigger Run (50 companies)"}
          </button>
          <Link href="/admin/ops" className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-700">
            View Ops
          </Link>
        </div>
      </div>

      {/* Coverage Stats */}
      {stats && (
        <div className="mb-8 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Coverage Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Companies</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.withDomain}</div>
              <div className="text-xs text-muted-foreground">With Domain</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.withIndustry}</div>
              <div className="text-xs text-muted-foreground">With Industry</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.withCounty}</div>
              <div className="text-xs text-muted-foreground">With County</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.withRevenue}</div>
              <div className="text-xs text-muted-foreground">With Revenue</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.withEmployees}</div>
              <div className="text-xs text-muted-foreground">With Employees</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.scored}</div>
              <div className="text-xs text-muted-foreground">Scored</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.enriched}</div>
              <div className="text-xs text-muted-foreground">Enriched</div>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Data Confidence Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xl font-bold text-red-600">{stats.confidenceDistribution.low}</div>
                <div className="text-xs text-muted-foreground">Low (0-39)</div>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-600">{stats.confidenceDistribution.medium}</div>
                <div className="text-xs text-muted-foreground">Medium (40-69)</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{stats.confidenceDistribution.high}</div>
                <div className="text-xs text-muted-foreground">High (70-100)</div>
              </div>
            </div>
          </div>

          {/* Provenance Breakdown */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Provenance Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xl font-bold">{stats.provenanceBreakdown.official}</div>
                <div className="text-xs text-muted-foreground">Official</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.provenanceBreakdown.thirdParty}</div>
                <div className="text-xs text-muted-foreground">Third Party</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.provenanceBreakdown.userApproved}</div>
                <div className="text-xs text-muted-foreground">User Approved</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.provenanceBreakdown.enrichment}</div>
                <div className="text-xs text-muted-foreground">Enrichment</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Ingestion Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Timestamp</th>
                <th className="text-left p-2">Processed</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Updated</th>
                <th className="text-left p-2">Errors</th>
                <th className="text-left p-2">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{new Date(run.timestamp).toLocaleString()}</td>
                  <td className="p-2">{run.processed}</td>
                  <td className="p-2">{run.created}</td>
                  <td className="p-2">{run.updated}</td>
                  <td className="p-2">{run.errors}</td>
                  <td className="p-2">{run.duration}</td>
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
      </div>
    </div>
  );
}

