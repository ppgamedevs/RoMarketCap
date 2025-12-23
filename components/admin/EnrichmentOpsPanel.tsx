"use client";

import { useEffect, useState } from "react";

export function EnrichmentOpsPanel({ lastEnrich }: { lastEnrich: string | null }) {
  const [cui, setCui] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, []);

  const runBatch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/enrich/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 25, onlyMissing: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setResult(JSON.stringify(json, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const enrichNow = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cui: cui.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setResult(JSON.stringify(json, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium">Enrichment</h2>
      <p className="mt-1 text-xs text-muted-foreground">Last cron run: {lastEnrich ?? "N/A"}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60" onClick={runBatch} disabled={loading} type="button">
          Run Batch (25)
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Company CUI"
          value={cui}
          onChange={(e) => setCui(e.target.value)}
        />
        <button className="rounded-md border px-3 py-2 text-sm disabled:opacity-60" onClick={enrichNow} disabled={loading || !cui.trim()} type="button">
          Enrich now
        </button>
      </div>

      {result ? <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">{result}</pre> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}


