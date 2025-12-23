"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";

type ExportDataButtonProps = {
  lang: Lang;
};

export function ExportDataButton({ lang }: ExportDataButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      track("ExportDataClick");
      const res = await fetch("/api/settings/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `romarketcap-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Failed to export data:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {exporting ? (lang === "ro" ? "Exportare..." : "Exporting...") : lang === "ro" ? "Exportă datele mele" : "Export my data"}
    </button>
  );
}

