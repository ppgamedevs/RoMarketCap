"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type IngestionProvider = {
  id: string;
  displayName: string;
  supports: {
    companies: boolean;
    financials: boolean;
    employees: boolean;
    taxonomy: boolean;
  };
  rateLimit: {
    rpm: number;
    concurrency: number;
  };
  enabled: boolean;
  cursor: string | null;
  lastRun: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    itemsFetched: number;
    itemsUpserted: number;
    itemsRejected: number;
    cursorOut: string | null;
  } | null;
  stats: {
    itemsFetched: number;
    itemsUpserted: number;
    itemsRejected: number;
    cursor: string | null;
    ts: string;
  } | null;
};

type Provider = {
  id: string;
  name: string;
  type: "FREE" | "PAID" | "INTERNAL";
  description: string;
  website?: string;
  trustLevel: number;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  costPerRequest?: number;
  costPerMonth?: number;
  enabled: boolean;
  stats: {
    requestsToday: number;
    errorsToday: number;
    costToday: number;
    lastSuccess?: string;
    lastError?: string;
  };
};

export function ProvidersClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ingestionProviders, setIngestionProviders] = useState<IngestionProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProviders();
    fetchIngestionProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/providers/list");
      const data = await res.json();
      if (data.ok) {
        setProviders(data.providers);
      } else {
        setError(data.error || "Failed to load providers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngestionProviders = async () => {
    try {
      const res = await fetch("/api/admin/providers/ingestion/list");
      const data = await res.json();
      if (data.ok) {
        setIngestionProviders(data.providers);
      }
    } catch (err) {
      console.error("Failed to load ingestion providers:", err);
    }
  };

  const runIngestionProvider = async (providerId: string, dry: boolean) => {
    setRunning({ ...running, [providerId]: true });
    try {
      const res = await fetch("/api/admin/providers/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, dry, limit: 200 }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(
          `${dry ? "Dry run" : "Run"} completed: ${data.stats.itemsUpserted} upserted, ${data.stats.itemsRejected} rejected`,
        );
        await fetchIngestionProviders();
      } else {
        alert(data.error || "Failed to run provider");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run provider");
    } finally {
      setRunning({ ...running, [providerId]: false });
    }
  };

  const resetCursor = async (providerId: string) => {
    if (!confirm(`Reset cursor for ${providerId}?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/providers/reset-cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Cursor reset");
        await fetchIngestionProviders();
      } else {
        alert(data.error || "Failed to reset cursor");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset cursor");
    }
  };

  const toggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag: `PROVIDER_${providerId.toUpperCase().replace(/-/g, "_")}`,
          enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchProviders();
      } else {
        alert(data.error || "Failed to toggle provider");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle provider");
    }
  };

  const testProvider = async (providerId: string, cui: string) => {
    setTesting({ ...testing, [providerId]: true });
    try {
      // Test enrichment
      const enrichRes = await fetch(`/api/admin/providers/${providerId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui }),
      });
      const enrichData = await enrichRes.json();

      // Test metrics
      const metricsRes = await fetch(`/api/admin/providers/${providerId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui }),
      });
      const metricsData = await metricsRes.json();

      alert(
        `Enrichment: ${enrichData.ok ? "Success" : enrichData.error}\nMetrics: ${metricsData.ok ? "Success" : metricsData.error}`,
      );
      await fetchProviders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting({ ...testing, [providerId]: false });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Data Providers</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Data Providers</h1>
        <p className="mt-2 text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Data Providers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage third-party data providers for company discovery, enrichment, and metrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {providers.map((provider) => (
          <div key={provider.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium">{provider.name}</h2>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      provider.type === "PAID"
                        ? "bg-blue-100 text-blue-700"
                        : provider.type === "FREE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {provider.type}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      provider.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{provider.description}</p>
                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    {provider.website}
                  </a>
                )}
              </div>
              <button
                onClick={() => toggleProvider(provider.id, !provider.enabled)}
                className={`rounded px-3 py-1.5 text-sm ${
                  provider.enabled
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {provider.enabled ? "Disable" : "Enable"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Trust Level:</span>
                <span className="ml-2 font-medium">{provider.trustLevel}/100</span>
              </div>
              {provider.rateLimitPerMinute && (
                <div>
                  <span className="text-muted-foreground">Rate Limit:</span>
                  <span className="ml-2 font-medium">{provider.rateLimitPerMinute}/min</span>
                </div>
              )}
              {provider.costPerRequest && (
                <div>
                  <span className="text-muted-foreground">Cost/Request:</span>
                  <span className="ml-2 font-medium">${provider.costPerRequest.toFixed(4)}</span>
                </div>
              )}
              {provider.costPerMonth && (
                <div>
                  <span className="text-muted-foreground">Monthly Cost:</span>
                  <span className="ml-2 font-medium">${provider.costPerMonth}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded border bg-muted/50 p-3">
              <h3 className="text-sm font-medium">Today's Stats</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Requests:</span>
                  <span className="ml-1 font-medium">{provider.stats.requestsToday}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors:</span>
                  <span className={`ml-1 font-medium ${provider.stats.errorsToday > 0 ? "text-red-600" : ""}`}>
                    {provider.stats.errorsToday}
                  </span>
                </div>
                {provider.type === "PAID" && (
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="ml-1 font-medium">${provider.stats.costToday.toFixed(2)}</span>
                  </div>
                )}
              </div>
              {provider.stats.lastSuccess && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last success: {new Date(provider.stats.lastSuccess).toLocaleString()}
                </p>
              )}
              {provider.stats.lastError && (
                <p className="mt-1 text-xs text-red-600">
                  Last error: {new Date(provider.stats.lastError).toLocaleString()}
                </p>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  const cui = prompt("Enter CUI to test:");
                  if (cui) testProvider(provider.id, cui);
                }}
                disabled={testing[provider.id] || !provider.enabled}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {testing[provider.id] ? "Testing..." : "Test Provider"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ingestion Providers Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold">Ingestion Providers (PROMPT 53)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bulk data ingestion providers that fetch pages of companies and normalize them.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {ingestionProviders.map((provider) => (
            <div key={provider.id} className="rounded-xl border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">{provider.displayName}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        provider.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {provider.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Supports: {Object.entries(provider.supports)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Rate: {provider.rateLimit.rpm} req/min, {provider.rateLimit.concurrency} concurrent
                  </div>
                </div>
              </div>

              {provider.lastRun && (
                <div className="mt-4 rounded border bg-muted/50 p-3">
                  <h4 className="text-sm font-medium">Last Run</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`ml-1 font-medium ${
                        provider.lastRun.status === "SUCCESS" ? "text-green-600" :
                        provider.lastRun.status === "FAIL" ? "text-red-600" :
                        "text-yellow-600"
                      }`}>
                        {provider.lastRun.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fetched:</span>
                      <span className="ml-1 font-medium">{provider.lastRun.itemsFetched}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Upserted:</span>
                      <span className="ml-1 font-medium">{provider.lastRun.itemsUpserted}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rejected:</span>
                      <span className="ml-1 font-medium">{provider.lastRun.itemsRejected}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(provider.lastRun.startedAt).toLocaleString()}
                  </p>
                  {provider.cursor && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cursor: {provider.cursor.substring(0, 20)}...
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => runIngestionProvider(provider.id, true)}
                  disabled={running[provider.id] || !provider.enabled}
                  className="rounded bg-blue-100 px-3 py-1.5 text-sm text-blue-700 disabled:opacity-50"
                >
                  {running[provider.id] ? "Running..." : "Run Dry"}
                </button>
                <button
                  onClick={() => runIngestionProvider(provider.id, false)}
                  disabled={running[provider.id] || !provider.enabled}
                  className="rounded bg-green-100 px-3 py-1.5 text-sm text-green-700 disabled:opacity-50"
                >
                  {running[provider.id] ? "Running..." : "Run Now"}
                </button>
                <button
                  onClick={() => resetCursor(provider.id)}
                  disabled={running[provider.id]}
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                >
                  Reset Cursor
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/flags">
          Feature Flags
        </Link>
      </div>
    </div>
  );
}

