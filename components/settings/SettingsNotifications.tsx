"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n/shared";

type SettingsNotificationsProps = {
  lang: Lang;
  initialSettings: {
    watchlistAlerts: boolean;
    weeklyDigest: boolean;
    partnerOffers: boolean;
  } | null;
};

export function SettingsNotifications({ lang, initialSettings }: SettingsNotificationsProps) {
  const [watchlistAlerts, setWatchlistAlerts] = useState(initialSettings?.watchlistAlerts ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(initialSettings?.weeklyDigest ?? true);
  const [partnerOffers, setPartnerOffers] = useState(initialSettings?.partnerOffers ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistAlerts, weeklyDigest, partnerOffers }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save notifications:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Notificări" : "Notifications"}</h2>
      <div className="mt-4 space-y-4">
        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{lang === "ro" ? "Alerte watchlist" : "Watchlist alerts"}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "ro" ? "Primește email-uri când companiile din watchlist se schimbă." : "Receive emails when companies in your watchlist change."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={watchlistAlerts}
            onChange={(e) => setWatchlistAlerts(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
        </label>
        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{lang === "ro" ? "Digest săptămânal" : "Weekly digest"}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "ro" ? "Primește un rezumat săptămânal cu cele mai importante schimbări." : "Receive a weekly summary of the most important changes."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={weeklyDigest}
            onChange={(e) => setWeeklyDigest(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
        </label>
        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{lang === "ro" ? "Oferte parteneri" : "Partner offers"}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "ro" ? "Primește oferte și anunțuri de la parteneri (opțional)." : "Receive offers and announcements from partners (optional)."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={partnerOffers}
            onChange={(e) => setPartnerOffers(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (lang === "ro" ? "Salvare..." : "Saving...") : lang === "ro" ? "Salvează" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">{lang === "ro" ? "Salvat!" : "Saved!"}</span>}
        </div>
      </div>
    </div>
  );
}

