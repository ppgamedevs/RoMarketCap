"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";
import type { SavedComparison } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function SavedComparisonList({ lang, comparisons }: { lang: Lang; comparisons: SavedComparison[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "ro" ? "Ștergi această comparație?" : "Delete this comparison?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/dashboard/comparisons/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch (e) {
      console.error("Failed to delete comparison:", e);
      alert(lang === "ro" ? "Eroare la ștergere" : "Error deleting comparison");
    } finally {
      setDeleting(null);
    }
  };

  if (comparisons.length === 0) {
    return (
      <div className="mt-4 rounded-md border p-4 text-sm text-muted-foreground">
        {lang === "ro" ? "Nu ai comparații salvate." : "No saved comparisons."}
      </div>
    );
  }

  const cuis = (comparison: SavedComparison): string[] => {
    if (Array.isArray(comparison.cuis)) {
      return comparison.cuis.filter((c): c is string => typeof c === "string");
    }
    return [];
  };

  return (
    <div className="mt-4 space-y-2">
      {comparisons.map((comp) => {
        const cuiList = cuis(comp);
        const compareUrl = `/compare?${cuiList.map((c) => `cui=${encodeURIComponent(c)}`).join("&")}`;

        return (
          <div key={comp.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium">{comp.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {cuiList.length} {lang === "ro" ? "companii" : "companies"}
                </div>
                <Link href={compareUrl} className="mt-2 inline-block text-xs text-primary underline underline-offset-4">
                  {lang === "ro" ? "Vezi comparația" : "View comparison"}
                </Link>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(comp.id)}
                disabled={deleting === comp.id}
              >
                {deleting === comp.id ? (lang === "ro" ? "..." : "...") : lang === "ro" ? "Șterge" : "Delete"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

