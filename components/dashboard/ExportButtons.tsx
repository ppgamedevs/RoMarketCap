"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";
import type { WatchlistItem, Company, SavedComparison } from "@prisma/client";
import { Button } from "@/components/ui/button";

type WatchlistItemWithCompany = WatchlistItem & {
  company: Pick<Company, "slug" | "name" | "cui" | "romcScore" | "romcAiScore" | "romcConfidence" | "valuationRangeLow" | "valuationRangeHigh">;
};

export function ExportButtons({
  lang,
  watchlistItems,
  comparisons,
}: {
  lang: Lang;
  watchlistItems: WatchlistItemWithCompany[];
  comparisons: SavedComparison[];
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const exportWatchlistCSV = async () => {
    setLoading("watchlist-csv");
    try {
      const res = await fetch("/api/dashboard/exports/watchlist?format=csv");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      track("ExportDownload", { type: "watchlist", format: "csv" });
    } catch (e) {
      console.error("Export failed:", e);
      alert(lang === "ro" ? "Eroare la export" : "Export error");
    } finally {
      setLoading(null);
    }
  };

  const exportWatchlistJSON = async () => {
    setLoading("watchlist-json");
    try {
      const res = await fetch("/api/dashboard/exports/watchlist?format=json");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watchlist-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      track("ExportDownload", { type: "watchlist", format: "json" });
    } catch (e) {
      console.error("Export failed:", e);
      alert(lang === "ro" ? "Eroare la export" : "Export error");
    } finally {
      setLoading(null);
    }
  };

  const exportComparisonsCSV = async () => {
    setLoading("comparisons-csv");
    try {
      const res = await fetch("/api/dashboard/exports/comparisons?format=csv");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparisons-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      track("ExportDownload", { type: "comparisons", format: "csv" });
    } catch (e) {
      console.error("Export failed:", e);
      alert(lang === "ro" ? "Eroare la export" : "Export error");
    } finally {
      setLoading(null);
    }
  };

  const exportComparisonsJSON = async () => {
    setLoading("comparisons-json");
    try {
      const res = await fetch("/api/dashboard/exports/comparisons?format=json");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparisons-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      track("ExportDownload", { type: "comparisons", format: "json" });
    } catch (e) {
      console.error("Export failed:", e);
      alert(lang === "ro" ? "Eroare la export" : "Export error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Export watchlist" : "Export watchlist"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {watchlistItems.length} {lang === "ro" ? "companii" : "companies"}
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={exportWatchlistCSV} disabled={loading !== null || watchlistItems.length === 0}>
            {loading === "watchlist-csv" ? "..." : "CSV"}
          </Button>
          <Button onClick={exportWatchlistJSON} disabled={loading !== null || watchlistItems.length === 0}>
            {loading === "watchlist-json" ? "..." : "JSON"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Export comparații" : "Export comparisons"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {comparisons.length} {lang === "ro" ? "comparații" : "comparisons"}
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={exportComparisonsCSV} disabled={loading !== null || comparisons.length === 0}>
            {loading === "comparisons-csv" ? "..." : "CSV"}
          </Button>
          <Button onClick={exportComparisonsJSON} disabled={loading !== null || comparisons.length === 0}>
            {loading === "comparisons-json" ? "..." : "JSON"}
          </Button>
        </div>
      </div>
    </div>
  );
}

