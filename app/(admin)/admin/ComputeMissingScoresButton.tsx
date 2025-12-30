"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ComputeMissingScoresButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; updated: number; message?: string; errors?: string[] } | null>(null);

  const handleCompute = async () => {
    if (!confirm("Are you sure you want to compute scores for all companies without scores? This may take a few minutes.")) {
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/compute-missing-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1000 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to compute scores");
      }

      setResult({
        processed: data.processed || 0,
        updated: data.updated || 0,
        message: data.message,
        errors: data.errors,
      });
    } catch (error) {
      setResult({
        processed: 0,
        updated: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleCompute} disabled={running}>
        {running ? "Computing..." : "Compute Missing Scores"}
      </Button>

      {result && (
        <div className={`rounded-md p-3 text-sm ${result.updated > 0 ? "bg-green-50 text-green-800" : "bg-muted text-muted-foreground"}`}>
          <p className="font-medium">
            {result.message || `Processed: ${result.processed}, Updated: ${result.updated}`}
          </p>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium">Errors ({result.errors.length}):</p>
              <ul className="mt-1 list-disc list-inside text-xs">
                {result.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {result.errors.length > 5 && <li>... and {result.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

