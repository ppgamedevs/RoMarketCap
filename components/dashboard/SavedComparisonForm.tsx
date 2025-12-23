"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";
import { Button } from "@/components/ui/button";

export function SavedComparisonForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cuis, setCuis] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const cuisArray = cuis
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (cuisArray.length < 2 || cuisArray.length > 5) {
      setStatus("error");
      setError(lang === "ro" ? "Trebuie să fie 2-5 CUIs" : "Must be 2-5 CUIs");
      return;
    }

    try {
      const res = await fetch("/api/dashboard/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cuis: cuisArray,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create comparison");
      }

      setStatus("success");
      setName("");
      setCuis("");
      track("ComparisonSave", { cuiCount: cuisArray.length });
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Nume comparație" : "Comparison name"}</label>
        <input
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder={lang === "ro" ? "ex: Top IT companies" : "e.g. Top IT companies"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          {lang === "ro" ? "CUIs (2-5, separate prin virgulă)" : "CUIs (2-5, comma-separated)"}
        </label>
        <input
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="12345678, 87654321"
          value={cuis}
          onChange={(e) => setCuis(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={status === "loading"}>
        {status === "loading"
          ? lang === "ro"
            ? "Se salvează..."
            : "Saving..."
          : lang === "ro"
            ? "Salvează comparație"
            : "Save comparison"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-green-600">
          {lang === "ro" ? "Comparație salvată cu succes!" : "Comparison saved successfully!"}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">
          {lang === "ro" ? "Eroare" : "Error"}: {error}
        </p>
      )}
    </form>
  );
}
