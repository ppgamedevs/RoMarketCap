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

// Helper to safely stringify any value for display
function safeStringify(value: any): string {
  if (value == null) return "N/A";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    // If it's an object with keys, extract the first key
    const keys = Object.keys(value);
    if (keys.length > 0) {
      return keys[0];
    }
    return "UNKNOWN";
  }
  return String(value);
}

export function NationalIngestionClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(500);
  const [error, setError] = useState<string | null>(null);

  // Wrapper to safely set stats with error handling
  const safeSetStats = (newStats: Stats | null) => {
    try {
      // Double-check that stats is serializable
      if (newStats) {
        JSON.stringify(newStats); // This will throw if there are non-serializable values
      }
      setStats(newStats);
      setError(null);
    } catch (err) {
      console.error("[NationalIngestionClient] Stats not serializable:", err);
      setError("Failed to load stats: data contains invalid values");
      setStats(null);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/national-ingestion/stats");
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to fetch stats";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = typeof errorData.error === "string" ? errorData.error : errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 200) || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      // Ensure all sourceType values are strings and sanitize all data
      if (data.stats) {
        // Deep sanitize errorSummary
        if (data.stats.errorSummary && Array.isArray(data.stats.errorSummary)) {
          data.stats.errorSummary = data.stats.errorSummary.map((item: any) => {
            let sourceTypeStr = "UNKNOWN";
            if (typeof item?.sourceType === "string") {
              sourceTypeStr = item.sourceType;
            } else if (item?.sourceType && typeof item.sourceType === "object") {
              const keys = Object.keys(item.sourceType);
              sourceTypeStr = keys.length > 0 ? keys[0] : "UNKNOWN";
            } else if (item?.sourceType != null) {
              sourceTypeStr = String(item.sourceType);
            }
            return {
              sourceType: sourceTypeStr,
              count: typeof item?.count === "number" ? item.count : 0,
            };
          });
        }
        
        // Deep sanitize lastJob errorRecords
        if (data.stats.lastJob?.errorRecords && Array.isArray(data.stats.lastJob.errorRecords)) {
          data.stats.lastJob.errorRecords = data.stats.lastJob.errorRecords.map((e: any) => {
            let sourceTypeStr = "UNKNOWN";
            if (typeof e?.sourceType === "string") {
              sourceTypeStr = e.sourceType;
            } else if (e?.sourceType && typeof e.sourceType === "object") {
              const keys = Object.keys(e.sourceType);
              sourceTypeStr = keys.length > 0 ? keys[0] : "UNKNOWN";
            } else if (e?.sourceType != null) {
              sourceTypeStr = String(e.sourceType);
            }
            return {
              id: String(e?.id || ""),
              cui: e?.cui ? String(e.cui) : null,
              sourceType: sourceTypeStr,
              reason: String(e?.reason || ""),
              createdAt: e?.createdAt ? String(e.createdAt) : "",
            };
          });
        }
        
        // Sanitize lastJob itself
        if (data.stats.lastJob) {
          data.stats.lastJob = {
            ...data.stats.lastJob,
            id: String(data.stats.lastJob.id || ""),
            startedAt: String(data.stats.lastJob.startedAt || ""),
            finishedAt: data.stats.lastJob.finishedAt ? String(data.stats.lastJob.finishedAt) : null,
            status: String(data.stats.lastJob.status || ""),
            mode: String(data.stats.lastJob.mode || ""),
            limit: Number(data.stats.lastJob.limit || 0),
            discovered: Number(data.stats.lastJob.discovered || 0),
            upserted: Number(data.stats.lastJob.upserted || 0),
            errors: Number(data.stats.lastJob.errors || 0),
            errorRecords: data.stats.lastJob.errorRecords || [],
          };
        }
        
        // Final safety check: ensure stats object is fully serializable
        // Deep clone and convert all values to primitives
        const sanitizedStats = JSON.parse(JSON.stringify(data.stats, (key, value) => {
          // Convert any remaining objects to strings
          if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
            const keys = Object.keys(value);
            if (keys.length > 0) {
              return keys[0]; // Return first key as string
            }
            return "UNKNOWN";
          }
          return value;
        }));
        
        safeSetStats(sanitizedStats);
      } else {
        safeSetStats(null);
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
      console.error("[NationalIngestionClient] Error fetching stats:", error);
      setError(errorMessage);
      safeSetStats(null); // Set to null on error to prevent rendering issues
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

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status} ${res.statusText}. Response: ${text.substring(0, 200)}`);
      }

      if (!res.ok) {
        const errorMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error || "Trigger failed");
        throw new Error(errorMsg);
      }

      // Ensure all values are primitives before displaying
      const discovered = typeof data.discovered === "number" ? data.discovered : 0;
      const upserted = typeof data.upserted === "number" ? data.upserted : 0;
      const errors = typeof data.errors === "number" ? data.errors : 0;
      
      alert(`${dry ? "Dry run" : "Run"} completed: ${discovered} discovered, ${upserted} upserted, ${errors} errors`);
      await fetchStats();
    } catch (error: any) {
      // Safely extract error message without rendering objects
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        // Try to extract a message property if it's a string
        if (typeof error.message === "string") {
          errorMessage = error.message;
        } else if (typeof error.error === "string") {
          errorMessage = error.error;
        } else {
          // Last resort: stringify but limit length
          try {
            errorMessage = JSON.stringify(error).substring(0, 200);
          } catch {
            errorMessage = "Unknown error (could not serialize)";
          }
        }
      }
      alert(`Error: ${errorMessage}`);
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
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === "string" 
          ? error 
          : JSON.stringify(error || "Unknown error"));
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (error) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800 font-medium">Error</p>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchStats();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          Retry
        </button>
      </div>
    );
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
                <span className="font-medium">Discovered:</span> {stats.lastJob?.discovered ?? 0}
              </div>
              <div className="text-sm">
                <span className="font-medium">Upserted:</span> {stats.lastJob?.upserted ?? 0}
              </div>
              <div className="text-sm">
                <span className="font-medium">Errors:</span> {stats.lastJob?.errors ?? 0}
              </div>
              {stats.lastJob?.errorRecords && Array.isArray(stats.lastJob.errorRecords) && stats.lastJob.errorRecords.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Recent Errors:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {stats.lastJob.errorRecords.map((error) => {
                      // Use safeStringify to ensure we never render objects
                      const sourceTypeStr = safeStringify(error.sourceType);
                      const cuiStr = safeStringify(error.cui);
                      const reasonStr = safeStringify(error.reason);
                      return (
                        <div key={String(error.id || Math.random())} className="text-xs text-muted-foreground">
                          {cuiStr} ({sourceTypeStr}): {reasonStr.substring(0, 100)}
                        </div>
                      );
                    })}
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
                <span className="font-medium">Last Run:</span> {formatDate(stats.checkpoint?.lastRunAt)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Discovered:</span> {stats.checkpoint?.discovered ?? 0}
              </div>
              <div className="text-sm">
                <span className="font-medium">Upserted:</span> {stats.checkpoint?.upserted ?? 0}
              </div>
              <div className="text-sm">
                <span className="font-medium">Errors:</span> {stats.checkpoint?.errors ?? 0}
              </div>
              <div className="text-sm">
                <span className="font-medium">Cursor:</span>{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{stats.currentCursor ?? "null"}</code>
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
          {stats.recentJobs && Array.isArray(stats.recentJobs) && stats.recentJobs.length > 0 ? (
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
                      {job?.discovered ?? 0} discovered, {job?.upserted ?? 0} upserted, {job?.errors ?? 0} errors
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
      {stats.errorSummary && Array.isArray(stats.errorSummary) && stats.errorSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Summary (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {stats.errorSummary.map((item) => {
                // Use safeStringify to ensure we never render objects
                const sourceTypeStr = safeStringify(item.sourceType);
                const count = typeof item.count === "number" ? item.count : 0;
                return (
                  <div key={sourceTypeStr} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sourceTypeStr}</span>
                    <span className="text-muted-foreground">{count} errors</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
