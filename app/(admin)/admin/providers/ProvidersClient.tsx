"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProviders();
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

