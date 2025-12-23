"use client";

import { useState } from "react";

export function DemoActionsClient({ canSeed }: { canSeed: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleAction = async (action: "seed" | "clear") => {
    setLoading(action);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/demo/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.message || "Success");
        // Reload page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleAction("seed")}
          disabled={!canSeed || loading !== null}
          className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
        >
          {loading === "seed" ? "Seeding..." : "Seed Demo Dataset"}
        </button>
        {!canSeed && <div className="text-xs text-muted-foreground">Non-demo companies exist. Clear them first or seed manually.</div>}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleAction("clear")}
          disabled={loading !== null}
          className="rounded-md border bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading === "clear" ? "Clearing..." : "Clear All Demo Data"}
        </button>
      </div>
      {result && <div className="col-span-2 text-xs text-muted-foreground">{result}</div>}
    </div>
  );
}

