"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UniverseStats = {
  total: number;
  activeScored: number;
  skeleton: number;
  sourcesBreakdown: {
    SEAP: number;
    EU_FUNDS: number;
    ANAF: number;
    USER: number;
    THIRD_PARTY: number;
  };
};

export function UniverseClient() {
  const [stats, setStats] = useState<UniverseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/universe/stats");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerIngest = async (dry: boolean, source?: string, limit?: number) => {
    setRunning(true);
    try {
      const params = new URLSearchParams();
      params.set("dry", dry ? "1" : "0");
      if (source) params.set("source", source);
      if (limit) params.set("limit", String(limit));
      const url = `/api/cron/universe-ingest?${params.toString()}`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        alert(`${dry ? "Dry run" : "Run"} completed: ${data.summary?.created || 0} created`);
        await fetchStats();
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
        <h1 className="text-2xl font-semibold">Universe Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Universe Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PROMPT 57: National Company Index - Skeleton companies tracking
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
            onClick={() => triggerIngest(false, undefined, 500)}
            disabled={running}
            className="rounded bg-green-100 px-4 py-2 text-sm text-green-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Trigger Run (500 companies)"}
          </button>
          <button
            onClick={() => triggerIngest(false, "SEAP", 1000)}
            disabled={running}
            className="rounded bg-purple-100 px-4 py-2 text-sm text-purple-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run SEAP (1000)"}
          </button>
          <button
            onClick={() => triggerIngest(false, "EU_FUNDS", 1000)}
            disabled={running}
            className="rounded bg-orange-100 px-4 py-2 text-sm text-orange-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run EU Funds (1000)"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-8 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Universe Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Companies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.activeScored.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Active Scored</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.skeleton.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Skeleton</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.activeScored / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Active %</div>
            </div>
          </div>

          {/* Sources Breakdown */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Sources Breakdown</h3>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <div className="text-xl font-bold">{stats.sourcesBreakdown.SEAP.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">SEAP</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.sourcesBreakdown.EU_FUNDS.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">EU Funds</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.sourcesBreakdown.ANAF.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">ANAF</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.sourcesBreakdown.USER.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">User</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.sourcesBreakdown.THIRD_PARTY.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Third Party</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/coverage">
          Coverage
        </Link>
      </div>
    </div>
  );
}

