"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
// Toast functionality - using simple alert for now
// TODO: Replace with proper toast component if available

type SyncJob = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  mode: string;
  limit: number;
  okCount: number;
  failCount: number;
  status: string;
  lastError: string | null;
};

type DeadLetterEntry = {
  cui: string;
  reason: string;
  timestamp: number;
  attempt: number;
};

export function FinancialSyncClient() {
  const [syncing, setSyncing] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
  const [cui, setCui] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [yearsInput, setYearsInput] = useState("");
  const [batchLimit, setBatchLimit] = useState(10);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [maxAgeDays, setMaxAgeDays] = useState<number | undefined>(undefined);
  
  const showToast = (title: string, description: string, variant?: "destructive") => {
    // Simple alert for now - replace with proper toast if available
    alert(`${title}: ${description}`);
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/admin/financial/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error: any) {
      showToast("Error", error.message || "Failed to fetch jobs", "destructive");
    }
  };

  const fetchDeadLetters = async () => {
    try {
      const res = await fetch("/api/admin/financial/deadletter");
      if (!res.ok) throw new Error("Failed to fetch dead letters");
      const data = await res.json();
      setDeadLetters(data.entries || []);
    } catch (error: any) {
      showToast("Error", error.message || "Failed to fetch dead letters", "destructive");
    }
  };

  const handleSingleSync = async () => {
    if (!cui.trim()) {
      showToast("Error", "Please enter a CUI", "destructive");
      return;
    }

    // Parse years input (comma-separated, validate)
    let years: number[] | undefined = undefined;
    if (yearsInput.trim()) {
      const parsedYears = yearsInput
        .split(",")
        .map((y) => parseInt(y.trim(), 10))
        .filter((y) => !isNaN(y) && y >= 1990 && y <= new Date().getFullYear());
      
      if (parsedYears.length === 0) {
        showToast("Error", "Invalid years format. Use comma-separated years (e.g., 2023,2022,2021)", "destructive");
        return;
      }
      
      if (parsedYears.length > 10) {
        showToast("Error", "Maximum 10 years allowed", "destructive");
        return;
      }
      
      years = parsedYears;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/admin/financial/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui: cui.trim(), dryRun, years }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      showToast(
        dryRun ? "Dry run completed" : "Sync completed",
        dryRun
          ? "No changes were made"
          : `Synced financials for ${data.company?.name || cui}`
      );

      if (!dryRun) {
        fetchJobs();
      }
    } catch (error: any) {
      showToast("Error", error.message || "Sync failed", "destructive");
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchSync = async () => {
    setBatchSyncing(true);
    try {
      const res = await fetch("/api/admin/financial/sync-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: batchLimit,
          onlyMissing,
          maxAgeDays: maxAgeDays || undefined,
          dryRun,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Batch sync failed");
      }

      showToast(
        dryRun ? "Dry run completed" : "Batch sync completed",
        `Processed: ${data.stats?.processed || 0}, OK: ${data.stats?.ok || 0}, Failed: ${data.stats?.failed || 0}`
      );

      if (!dryRun) {
        fetchJobs();
        fetchDeadLetters();
      }
    } catch (error: any) {
      showToast("Error", error.message || "Batch sync failed", "destructive");
    } finally {
      setBatchSyncing(false);
    }
  };

  // Load initial data on mount
  React.useEffect(() => {
    fetchJobs();
    fetchDeadLetters();
  }, []);

  return (
    <div className="mt-6 grid gap-6">
      {/* Single CUI Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Single Company</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">CUI</label>
              <input
                type="text"
                value={cui}
                onChange={(e) => setCui(e.target.value)}
                placeholder="RO12345678 or 12345678"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Years (optional, comma-separated, max 10)
              </label>
              <input
                type="text"
                value={yearsInput}
                onChange={(e) => setYearsInput(e.target.value)}
                placeholder="2023,2022,2021"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to sync all available years. Valid range: 1990-{new Date().getFullYear()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="dryRun" className="text-sm">
                Dry run (no DB writes)
              </label>
            </div>
            <Button onClick={handleSingleSync} disabled={syncing || !cui.trim()}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Batch Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Sync</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Limit</label>
              <input
                type="number"
                value={batchLimit}
                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="onlyMissing"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="onlyMissing" className="text-sm">
                Only sync companies with no financial data
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Age (days, optional)</label>
              <input
                type="number"
                value={maxAgeDays || ""}
                onChange={(e) => setMaxAgeDays(e.target.value ? parseInt(e.target.value) : undefined)}
                min={1}
                max={365}
                placeholder="90"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batchDryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="batchDryRun" className="text-sm">
                Dry run (no DB writes)
              </label>
            </div>
            <Button onClick={handleBatchSync} disabled={batchSyncing}>
              {batchSyncing ? "Syncing..." : "Sync Batch"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet</p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(job.startedAt).toLocaleString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      job.status === "FAILED" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Mode: {job.mode} | Limit: {job.limit} | OK: {job.okCount} | Failed: {job.failCount}
                  </div>
                  {job.lastError && (
                    <div className="mt-1 text-xs text-red-600">
                      Error: {job.lastError}
                    </div>
                  )}
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Dead Letter Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Dead Letter Queue ({deadLetters.length})</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {deadLetters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failed syncs</p>
            ) : (
              deadLetters.slice(0, 20).map((entry, idx) => (
                <div key={idx} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">CUI: {entry.cui}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-red-600">
                    {entry.reason}
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={fetchDeadLetters}>
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

