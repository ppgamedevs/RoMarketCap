"use client";

import { useState } from "react";
import type { FeatureFlag } from "@/src/lib/flags/flags";
import { Button } from "@/components/ui/button";

type FlagInfo = {
  label: string;
  description: string;
  risky: boolean;
};

type FlagsClientProps = {
  flags: Record<FeatureFlag, boolean>;
  flagDescriptions: Record<FeatureFlag, FlagInfo>;
};

export function FlagsClient({ flags: initialFlags, flagDescriptions }: FlagsClientProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async (flag: FeatureFlag, currentValue: boolean) => {
    setLoading(flag);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag,
          value: currentValue ? "false" : "true",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to toggle flag");
      }

      setFlags((prev) => ({ ...prev, [flag]: data.value }));
      setSuccess(`Flag ${flag} ${data.value ? "enabled" : "disabled"}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle flag");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 grid gap-4">
      {Object.entries(flagDescriptions).map(([flag, info]) => {
        const isEnabled = flags[flag as FeatureFlag];
        return (
          <div key={flag} className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{info.label}</h3>
                  {info.risky && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Risky</span>}
                  <span className={`rounded px-2 py-0.5 text-xs ${isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {isEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{info.description}</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">Flag: {flag}</p>
              </div>
              <Button
                onClick={() => handleToggle(flag as FeatureFlag, isEnabled)}
                disabled={loading === flag}
                className={`flex-shrink-0 ${
                  isEnabled ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {loading === flag ? "..." : isEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        );
      })}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}
    </div>
  );
}

