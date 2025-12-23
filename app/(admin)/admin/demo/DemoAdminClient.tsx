"use client";

import { useState } from "react";

export function DemoAdminClient({ demoCount }: { demoCount: number }) {
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
        setResult(data.message || "Action completed");
        // Reload page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setResult(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium">Actions</h2>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Seed demo companies (10-25 companies). Only works if database is empty (no non-demo companies).
          </p>
          <button
            onClick={() => handleAction("seed")}
            disabled={loading !== null || demoCount > 0}
            className="mt-2 rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {loading === "seed" ? "Seeding..." : "Seed Demo Dataset"}
          </button>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Clear all demo companies from the database.</p>
          <button
            onClick={() => handleAction("clear")}
            disabled={loading !== null || demoCount === 0}
            className="mt-2 rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {loading === "clear" ? "Clearing..." : "Clear Demo Data"}
          </button>
        </div>

        {result && <div className="text-sm text-muted-foreground">{result}</div>}
      </div>
    </div>
  );
}

