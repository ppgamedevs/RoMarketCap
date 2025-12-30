/**
 * PROMPT 62: Market Filters Component
 * 
 * URL-based filters for market view
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";

type Industry = { slug: string; count: number };
type County = { slug: string; count: number };

type MarketFiltersProps = {
  lang: "ro" | "en";
  industries: Industry[];
  counties: County[];
  initialSearch: string;
  initialIndustry: string;
  initialCounty: string;
  initialConfidence: "high" | "medium" | "low" | undefined;
  initialIntegrity: boolean;
  initialVerified: boolean;
  initialFresh: boolean;
  initialSort: "romcAiScore" | "romcScore" | "marketCap" | "confidence";
};

export function MarketFilters({
  lang,
  industries,
  counties,
  initialSearch,
  initialIndustry,
  initialCounty,
  initialConfidence,
  initialIntegrity,
  initialVerified,
  initialFresh,
  initialSort,
}: MarketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [industry, setIndustry] = useState(initialIndustry);
  const [county, setCounty] = useState(initialCounty);
  const [confidence, setConfidence] = useState(initialConfidence);
  const [integrity, setIntegrity] = useState(initialIntegrity);
  const [verified, setVerified] = useState(initialVerified);
  const [fresh, setFresh] = useState(initialFresh);
  const [sort, setSort] = useState(initialSort);

  const applyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (industry) params.set("industry", industry);
      if (county) params.set("county", county);
      if (confidence) params.set("confidence", confidence);
      if (integrity) params.set("integrity", "true");
      if (verified) params.set("verified", "true");
      if (fresh) params.set("fresh", "true");
      if (sort && sort !== "romcAiScore") params.set("sort", sort);
      params.set("page", "1"); // Reset to first page
      router.push(`/market?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setCounty("");
    setConfidence(undefined);
    setIntegrity(false);
    setVerified(false);
    setFresh(false);
    setSort("romcAiScore");
    startTransition(() => {
      router.push("/market");
    });
  };

  return (
    <div className="mb-6 space-y-4 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {lang === "ro" ? "Căutare" : "Search"}
          </label>
          <Input
            type="text"
            placeholder={lang === "ro" ? "Nume sau CUI..." : "Name or CUI..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyFilters();
              }
            }}
          />
        </div>

        {/* Industry */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {lang === "ro" ? "Industrie" : "Industry"}
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">{lang === "ro" ? "Toate" : "All"}</option>
            {industries.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.slug} ({i.count})
              </option>
            ))}
          </select>
        </div>

        {/* County */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {lang === "ro" ? "Județ" : "County"}
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
          >
            <option value="">{lang === "ro" ? "Toate" : "All"}</option>
            {counties.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.slug} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {/* Confidence */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {lang === "ro" ? "Confidență" : "Confidence"}
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={confidence || ""}
            onChange={(e) => setConfidence((e.target.value || undefined) as typeof confidence)}
          >
            <option value="">{lang === "ro" ? "Toate" : "All"}</option>
            <option value="high">{lang === "ro" ? "Ridicată" : "High"}</option>
            <option value="medium">{lang === "ro" ? "Medie" : "Medium"}</option>
            <option value="low">{lang === "ro" ? "Scăzută" : "Low"}</option>
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={integrity}
            onChange={(e) => setIntegrity(e.target.checked)}
            className="rounded border-input"
          />
          {lang === "ro" ? "Doar cu integritate ridicată" : "Only high integrity"}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="rounded border-input"
          />
          {lang === "ro" ? "Doar verificate" : "Only verified"}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fresh}
            onChange={(e) => setFresh(e.target.checked)}
            className="rounded border-input"
          />
          {lang === "ro" ? "Doar date recente" : "Only fresh data"}
        </label>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">{lang === "ro" ? "Sortare:" : "Sort:"}</label>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="romcAiScore">{lang === "ro" ? "Scor ROMC AI" : "ROMC AI Score"}</option>
          <option value="romcScore">{lang === "ro" ? "Scor ROMC" : "ROMC Score"}</option>
          <option value="marketCap">{lang === "ro" ? "Market Cap" : "Market Cap"}</option>
          <option value="confidence">{lang === "ro" ? "Confidență" : "Confidence"}</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={applyFilters} disabled={isPending}>
          {lang === "ro" ? "Aplică filtre" : "Apply Filters"}
        </Button>
        <Button onClick={clearFilters} variant="outline" disabled={isPending}>
          {lang === "ro" ? "Șterge filtre" : "Clear Filters"}
        </Button>
      </div>
    </div>
  );
}

