"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  lastRuns: {
    SEAP: string | null;
    EU_FUNDS: string | null;
  };
  stats: {
    SEAP: {
      processed: number;
      created: number;
      updated: number;
      errors: number;
      ts: string;
    } | null;
    EU_FUNDS: {
      processed: number;
      created: number;
      updated: number;
      errors: number;
      ts: string;
    } | null;
  };
  companiesDiscovered: {
    SEAP: number;
    EU_FUNDS: number;
  };
  topByPublicMoney: Array<{
    company: {
      id: string;
      slug: string;
      name: string;
      cui: string | null;
    };
    source: string;
    totalValue: string | null;
    contractValue: string | null;
    contractYear: number | null;
    contractingAuthority: string | null;
  }>;
  recentErrors: Array<{
    id: string;
    externalId: string | null;
    error: string | null;
    source: string;
    createdAt: string;
  }>;
};

export function NationalIngestionClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/national-ingestion/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStats(data);
        } else {
          setError(data.error || "Failed to load stats");
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">National Data Ingestion</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">National Data Ingestion</h1>
        <p className="mt-2 text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">National Data Ingestion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Automatic company discovery from SEAP (public procurement) and EU Funds beneficiaries.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SEAP Stats */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">SEAP (Public Procurement)</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Companies Discovered:</span>
              <span className="font-medium">{stats.companiesDiscovered.SEAP.toLocaleString()}</span>
            </div>
            {stats.lastRuns.SEAP && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Run:</span>
                <span className="font-medium">{new Date(stats.lastRuns.SEAP).toLocaleString()}</span>
              </div>
            )}
            {stats.stats.SEAP && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Processed:</span>
                  <span className="font-medium">{stats.stats.SEAP.processed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-green-600">{stats.stats.SEAP.created.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium text-blue-600">{stats.stats.SEAP.updated.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="font-medium text-red-600">{stats.stats.SEAP.errors.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* EU Funds Stats */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">EU Funds</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Companies Discovered:</span>
              <span className="font-medium">{stats.companiesDiscovered.EU_FUNDS.toLocaleString()}</span>
            </div>
            {stats.lastRuns.EU_FUNDS && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Run:</span>
                <span className="font-medium">{new Date(stats.lastRuns.EU_FUNDS).toLocaleString()}</span>
              </div>
            )}
            {stats.stats.EU_FUNDS && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Processed:</span>
                  <span className="font-medium">{stats.stats.EU_FUNDS.processed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-green-600">{stats.stats.EU_FUNDS.created.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium text-blue-600">{stats.stats.EU_FUNDS.updated.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="font-medium text-red-600">{stats.stats.EU_FUNDS.errors.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top Companies by Public Money */}
      <div className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-medium">Top Companies by Public Money</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">CUI</th>
                <th className="px-4 py-2 text-right">Total Value</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Authority/Program</th>
              </tr>
            </thead>
            <tbody>
              {stats.topByPublicMoney.map((item) => (
                <tr key={item.company.id} className="border-b">
                  <td className="px-4 py-2">
                    <Link href={`/company/${item.company.slug}`} className="underline underline-offset-4">
                      {item.company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.company.cui || "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {item.totalValue
                      ? new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(
                          parseFloat(item.totalValue),
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-muted px-2 py-1 text-xs">{item.source}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{item.contractingAuthority || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      {stats.recentErrors.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">Recent Errors (Last 24h)</h2>
          <div className="mt-4 space-y-2">
            {stats.recentErrors.slice(0, 10).map((err) => (
              <div key={err.id} className="rounded border bg-muted/50 p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium">{err.source}</span>
                    {err.externalId && <span className="ml-2 text-muted-foreground">ID: {err.externalId}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(err.createdAt).toLocaleString()}</span>
                </div>
                {err.error && <p className="mt-1 text-red-600">{err.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

