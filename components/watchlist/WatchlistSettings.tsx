"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  weeklyDigestOnly: boolean;
  scoreChangeAlerts: boolean;
};

export function WatchlistSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [settings, setSettings] = useState<Settings>({ weeklyDigestOnly: true, scoreChangeAlerts: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/watchlist/settings")
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.error ?? "Request failed");
        setIsPremium(Boolean(j?.isPremium));
        setSettings({
          weeklyDigestOnly: Boolean(j?.settings?.weeklyDigestOnly ?? true),
          scoreChangeAlerts: Boolean(j?.settings?.scoreChangeAlerts ?? false),
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: Partial<Settings>) => {
    setError(null);
    const merged = { ...settings, ...next };
    setSettings(merged);
    const res = await fetch("/api/watchlist/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(merged),
    });
    const json = await res.json().catch(() => null);
    if (res.status === 402) {
      setError("Premium required for alerts.");
      return;
    }
    if (!res.ok) {
      setError(json?.error ?? "Request failed");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">Email alerts</h2>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex items-center justify-between gap-3">
          <span>Weekly digest only (free)</span>
          <input
            type="checkbox"
            checked={settings.weeklyDigestOnly}
            onChange={(e) => save({ weeklyDigestOnly: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Score change alerts (premium)</span>
          <input
            type="checkbox"
            checked={settings.scoreChangeAlerts}
            onChange={(e) => save({ scoreChangeAlerts: e.target.checked })}
            disabled={!isPremium}
          />
        </label>
        {!isPremium ? (
          <Link className="text-sm underline underline-offset-4" href="/billing">
            Upgrade to enable alerts
          </Link>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}


