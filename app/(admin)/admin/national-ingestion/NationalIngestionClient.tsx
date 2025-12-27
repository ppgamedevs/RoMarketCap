"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

type NationalIngestJob = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  mode: string;
  limit: number;
  discovered: number;
  upserted: number;
  errors: number;
};

type Stats = {
  lastJob: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    mode: string;
    limit: number;
    discovered: number;
    upserted: number;
    errors: number;
    errorRecords: Array<{
      id: string;
      cui: string | null;
      sourceType: string;
      reason: string;
      createdAt: string;
    }>;
  } | null;
  recentJobs: NationalIngestJob[];
  checkpoint: {
    discovered: number;
    upserted: number;
    errors: number;
    lastRunAt: string;
    cursor: string | null;
  } | null;
  currentCursor: string | null;
  errorSummary: Array<{ sourceType: string; count: number }>;
};

export function NationalIngestionClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(500);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/national-ingestion/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.stats);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerRun = async (dry: boolean) => {
    if (!confirm(`Are you sure you want to ${dry ? "dry run" : "run"} national ingestion with limit ${limit}?`)) {
      return;
    }

    setRunning(true);
    try {
      const res = await fetch("/api/admin/national-ingestion/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, dry }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Trigger failed");
      }

      alert(`${dry ? "Dry run" : "Run"} completed: ${data.discovered} discovered, ${data.upserted} upserted, ${data.errors} errors`);
      await fetchStats();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleResetCursor = async () => {
    if (!confirm("Are you sure you want to reset the cursor? This will restart ingestion from the beginning.")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/national-ingestion/reset-cursor", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      alert("Cursor reset successfully");
      await fetchStats();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Last Run */}
      <Card>
        <CardHeader>
          <CardTitle>Last Run</CardTitle>
        </CardHeader>
        <CardBody>
          {stats.lastJob ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`text-sm ${stats.lastJob.status === "COMPLETED" ? "text-green-600" : stats.lastJob.status === "FAILED" ? "text-red-600" : "text-yellow-600"}`}>
                  {stats.lastJob.status}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Started:</span> {formatDate(stats.lastJob.startedAt)}
              </div>
              {stats.lastJob.finishedAt && (
                <div className="text-sm">
                  <span className="font-medium">Finished:</span> {formatDate(stats.lastJob.finishedAt)}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Discovered:</span> {stats.lastJob.discovered}
              </div>
              <div className="text-sm">
                <span className="font-medium">Upserted:</span> {stats.lastJob.upserted}
              </div>
              <div className="text-sm">
                <span className="font-medium">Errors:</span> {stats.lastJob.errors}
              </div>
              {stats.lastJob.errorRecords.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Recent Errors:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {stats.lastJob.errorRecords.map((error) => (
                      <div key={error.id} className="text-xs text-muted-foreground">
                        {error.cui || "N/A"} ({error.sourceType}): {error.reason.substring(0, 100)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No runs yet</p>
          )}
        </CardBody>
      </Card>

      {/* Checkpoint */}
      <Card>
        <CardHeader>
          <CardTitle>Checkpoint</CardTitle>
        </CardHeader>
        <CardBody>
          {stats.checkpoint ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Last Run:</span> {formatDate(stats.checkpoint.lastRunAt)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Discovered:</span> {stats.checkpoint.discovered}
              </div>
              <div className="text-sm">
                <span className="font-medium">Upserted:</span> {stats.checkpoint.upserted}
              </div>
              <div className="text-sm">
                <span className="font-medium">Errors:</span> {stats.checkpoint.errors}
              </div>
              <div className="text-sm">
                <span className="font-medium">Cursor:</span>{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{stats.currentCursor || "null"}</code>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No checkpoint data</p>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Limit:</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 500)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => triggerRun(true)} disabled={running} variant="outline">
                Dry Run
              </Button>
              <Button onClick={() => triggerRun(false)} disabled={running}>
                Run Now
              </Button>
              <Button onClick={handleResetCursor} disabled={running} variant="destructive">
                Reset Cursor
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardBody>
          {stats.recentJobs.length > 0 ? (
            <div className="space-y-2">
              {stats.recentJobs.map((job) => (
                <div key={job.id} className="border-b pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{formatDate(job.startedAt)}</span>
                      <span className={`ml-2 ${job.status === "COMPLETED" ? "text-green-600" : job.status === "FAILED" ? "text-red-600" : "text-yellow-600"}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.discovered} discovered, {job.upserted} upserted, {job.errors} errors
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent jobs</p>
          )}
        </CardBody>
      </Card>

      {/* Error Summary */}
      {stats.errorSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Summary (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {stats.errorSummary.map((item) => (
                <div key={item.sourceType} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.sourceType}</span>
                  <span className="text-muted-foreground">{item.count} errors</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
