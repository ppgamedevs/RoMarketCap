"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";
import type { Company } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function UserAlertRuleForm({
  lang,
  watchlistCompanies,
}: {
  lang: Lang;
  watchlistCompanies: Array<Pick<Company, "id" | "slug" | "name" | "cui">>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<"ROMC_AI" | "VALUATION" | "RISK">("ROMC_AI");
  const [operator, setOperator] = useState<"GT" | "LT" | "PCT_CHANGE">("GT");
  const [threshold, setThreshold] = useState("");
  const [scope, setScope] = useState<"COMPANY" | "INDUSTRY" | "COUNTY">("COMPANY");
  const [companyId, setCompanyId] = useState("");
  const [industrySlug, setIndustrySlug] = useState("");
  const [countySlug, setCountySlug] = useState("");
  const [lookbackDays, setLookbackDays] = useState("7");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const thresholdNum = Number(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setStatus("error");
      setError(lang === "ro" ? "Prag invalid" : "Invalid threshold");
      return;
    }

    if (scope === "COMPANY" && !companyId) {
      setStatus("error");
      setError(lang === "ro" ? "Selectează o companie" : "Select a company");
      return;
    }
    if (scope === "INDUSTRY" && !industrySlug.trim()) {
      setStatus("error");
      setError(lang === "ro" ? "Introdu slug-ul industriei" : "Enter industry slug");
      return;
    }
    if (scope === "COUNTY" && !countySlug.trim()) {
      setStatus("error");
      setError(lang === "ro" ? "Introdu slug-ul județului" : "Enter county slug");
      return;
    }

    try {
      const res = await fetch("/api/dashboard/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          metric,
          operator,
          threshold: thresholdNum,
          scope,
          companyId: scope === "COMPANY" ? companyId : undefined,
          industrySlug: scope === "INDUSTRY" ? industrySlug.trim() : undefined,
          countySlug: scope === "COUNTY" ? countySlug.trim() : undefined,
          lookbackDays: operator === "PCT_CHANGE" ? Math.max(1, Math.min(90, Number(lookbackDays) || 7)) : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create rule");
      }

      setStatus("success");
      setName("");
      setThreshold("");
      setCompanyId("");
      setIndustrySlug("");
      setCountySlug("");
      track("AlertRuleCreate", { metric, scope });
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Nume regulă" : "Rule name"}</label>
        <input
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder={lang === "ro" ? "ex: ROMC AI > 80" : "e.g. ROMC AI > 80"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Metrică" : "Metric"}</label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="ROMC_AI">ROMC AI</option>
          <option value="VALUATION">Valuation</option>
          <option value="RISK">Risk</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Operator" : "Operator"}</label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={operator}
          onChange={(e) => setOperator(e.target.value as typeof operator)}
        >
          <option value="GT">{lang === "ro" ? "Mai mare decât (>)" : "Greater than (>)"}</option>
          <option value="LT">{lang === "ro" ? "Mai mic decât (<)" : "Less than (<)"}</option>
          <option value="PCT_CHANGE">{lang === "ro" ? "Schimbare %" : "Percent change"}</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Prag" : "Threshold"}</label>
        <input
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          type="number"
          step="0.1"
          placeholder="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          required
        />
      </div>

      {operator === "PCT_CHANGE" && (
        <div>
          <label className="text-sm font-medium">{lang === "ro" ? "Perioadă lookback (zile)" : "Lookback period (days)"}</label>
          <input
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            type="number"
            min="1"
            max="90"
            placeholder="7"
            value={lookbackDays}
            onChange={(e) => setLookbackDays(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {lang === "ro" ? "Compară cu valoarea de acum X zile (1-90)" : "Compare with value from X days ago (1-90)"}
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">{lang === "ro" ? "Domeniu" : "Scope"}</label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value as typeof scope)}
        >
          <option value="COMPANY">{lang === "ro" ? "Companie" : "Company"}</option>
          <option value="INDUSTRY">{lang === "ro" ? "Industrie" : "Industry"}</option>
          <option value="COUNTY">{lang === "ro" ? "Județ" : "County"}</option>
        </select>
      </div>

      {scope === "COMPANY" && (
        <div>
          <label className="text-sm font-medium">{lang === "ro" ? "Companie" : "Company"}</label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">{lang === "ro" ? "Selectează companie" : "Select company"}</option>
            {watchlistCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.cui ? `(${c.cui})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === "INDUSTRY" && (
        <div>
          <label className="text-sm font-medium">{lang === "ro" ? "Industrie" : "Industry"}</label>
          <input
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={lang === "ro" ? "ex: it" : "e.g. it"}
            value={industrySlug}
            onChange={(e) => setIndustrySlug(e.target.value)}
          />
        </div>
      )}

      {scope === "COUNTY" && (
        <div>
          <label className="text-sm font-medium">{lang === "ro" ? "Județ" : "County"}</label>
          <input
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={lang === "ro" ? "ex: bucuresti" : "e.g. bucuresti"}
            value={countySlug}
            onChange={(e) => setCountySlug(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" disabled={status === "loading"}>
        {status === "loading"
          ? lang === "ro"
            ? "Se creează..."
            : "Creating..."
          : lang === "ro"
            ? "Creează regulă"
            : "Create rule"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-green-600">{lang === "ro" ? "Regulă creată cu succes!" : "Rule created successfully!"}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">
          {lang === "ro" ? "Eroare" : "Error"}: {error}
        </p>
      )}
    </form>
  );
}
