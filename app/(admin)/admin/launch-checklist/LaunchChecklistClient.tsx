"use client";

import { useEffect, useState } from "react";

type ChecklistStatus = "PASS" | "WARN" | "FAIL";

type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  hint: string;
  category: string;
};

type ChecklistResult = {
  items: ChecklistItem[];
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  };
  actions: {
    canRunRecalc: boolean;
    canRunEnrich: boolean;
    canGenerateSnapshot: boolean;
    canSendTestEmail: boolean;
  };
};

export function LaunchChecklistClient({ baseUrl: _ }: { baseUrl: string }) {
  const [result, setResult] = useState<ChecklistResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/launch/check");
      const data = await res.json();
      if (data.ok) {
        setResult(data);
      }
    } catch (error) {
      console.error("Failed to load checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, []);

  const runAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/launch/action?action=${encodeURIComponent(action)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        // Reload checklist after action
        await loadChecklist();
        alert(`Action completed: ${data.message || "Success"}`);
      } else {
        alert(`Action failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      alert(`Action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading checklist...</div>;
  }

  if (!result) {
    return <div className="text-sm text-destructive">Failed to load checklist</div>;
  }

  const statusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case "PASS":
        return "✅";
      case "WARN":
        return "⚠️";
      case "FAIL":
        return "❌";
    }
  };

  const statusColor = (status: ChecklistStatus) => {
    switch (status) {
      case "PASS":
        return "text-green-600";
      case "WARN":
        return "text-yellow-600";
      case "FAIL":
        return "text-red-600";
    }
  };

  const categories = Array.from(new Set(result.items.map((i) => i.category)));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Summary</h2>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="mt-1 text-lg font-semibold">{result.summary.total}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pass</div>
            <div className="mt-1 text-lg font-semibold text-green-600">{result.summary.pass}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Warn</div>
            <div className="mt-1 text-lg font-semibold text-yellow-600">{result.summary.warn}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fail</div>
            <div className="mt-1 text-lg font-semibold text-red-600">{result.summary.fail}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Safe Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => runAction("recalc-dry")}
            disabled={!result.actions.canRunRecalc || actionLoading !== null}
            className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {actionLoading === "recalc-dry" ? "Running..." : "Run Recalculate Dry Run"}
          </button>
          <button
            onClick={() => runAction("enrich-dry")}
            disabled={!result.actions.canRunEnrich || actionLoading !== null}
            className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {actionLoading === "enrich-dry" ? "Running..." : "Run Enrichment Dry Run"}
          </button>
          <button
            onClick={() => runAction("snapshot")}
            disabled={!result.actions.canGenerateSnapshot || actionLoading !== null}
            className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {actionLoading === "snapshot" ? "Running..." : "Generate Snapshot Now"}
          </button>
          <button
            onClick={() => runAction("test-email")}
            disabled={!result.actions.canSendTestEmail || actionLoading !== null}
            className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {actionLoading === "test-email" ? "Sending..." : "Send Test Email"}
          </button>
          <button onClick={loadChecklist} disabled={actionLoading !== null} className="rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Checklist Items by Category */}
      {categories.map((category) => {
        const categoryItems = result.items.filter((i) => i.category === category);
        return (
          <div key={category} className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-medium">{category}</h2>
            <div className="mt-4 space-y-2">
              {categoryItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-md border p-3 text-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={statusColor(item.status)}>{statusIcon(item.status)}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
