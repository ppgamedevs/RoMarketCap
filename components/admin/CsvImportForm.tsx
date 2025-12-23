"use client";

import { useState } from "react";

export function CsvImportForm() {
  const [csv, setCsv] = useState<string>("cui,name,county,city,caen,website,foundedYear,employees,revenueLatest,profitLatest,description\nRO12345678,Demo SRL,București,București,6201,https://demo.ro,2015,12,1000000,120000,Descriere scurtă");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Import failed");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <label className="text-sm font-medium">CSV</label>
      <textarea
        className="mt-2 h-56 w-full rounded-md border bg-background p-3 text-xs"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <button
        className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
        onClick={onSubmit}
        disabled={loading}
        type="button"
      >
        {loading ? "Importing..." : "Import CSV"}
      </button>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {result ? (
        <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}


