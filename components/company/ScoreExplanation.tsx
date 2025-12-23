"use client";

import type { Lang } from "@/src/lib/i18n/shared";
import { explainRomcChangeShort, explainRomcChangeDetailed } from "@/src/lib/integrity/explain";

type ScoreExplanationProps = {
  lang: Lang;
  company: {
    romcScore: number | null;
    previousRomcScore?: number | null;
    romcAiScore: number | null;
    previousRomcAiScore?: number | null;
    revenueLatest: number | null;
    previousRevenue?: number | null;
    profitLatest: number | null;
    previousProfit?: number | null;
    employees: number | null;
    previousEmployees?: number | null;
    enrichVersion: number | null;
    lastEnrichedAt: Date | null;
    approvedClaimCount?: number;
    approvedSubmissionCount?: number;
    industrySlug: string | null;
    countySlug: string | null;
  };
  isPremium: boolean;
};

export function ScoreExplanation({ lang, company, isPremium }: ScoreExplanationProps) {
  const context = {
    romcScore: company.romcScore,
    previousRomcScore: company.previousRomcScore,
    romcAiScore: company.romcAiScore,
    previousRomcAiScore: company.previousRomcAiScore,
    revenueLatest: company.revenueLatest ? Number(String(company.revenueLatest)) : null,
    previousRevenue: company.previousRevenue ? Number(String(company.previousRevenue)) : null,
    profitLatest: company.profitLatest ? Number(String(company.profitLatest)) : null,
    previousProfit: company.previousProfit ? Number(String(company.previousProfit)) : null,
    employees: company.employees,
    previousEmployees: company.previousEmployees,
    enrichVersion: company.enrichVersion ?? undefined,
    lastEnrichedAt: company.lastEnrichedAt,
    approvedClaimCount: company.approvedClaimCount,
    approvedSubmissionCount: company.approvedSubmissionCount,
    industrySlug: company.industrySlug,
    countySlug: company.countySlug,
  };

  const shortExplanation = explainRomcChangeShort(context, lang);
  const detailedExplanation = isPremium ? explainRomcChangeDetailed(context, lang) : null;

  return (
    <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">{lang === "ro" ? "Explicație scor" : "Score explanation"}</h3>
      <p className="text-sm text-muted-foreground">{shortExplanation}</p>
      {detailedExplanation && (
        <div className="mt-3 rounded-md bg-muted p-3">
          <p className="text-xs font-medium">{lang === "ro" ? "Detalii (Premium)" : "Details (Premium)"}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{detailedExplanation}</pre>
        </div>
      )}
      {!isPremium && (
        <p className="text-xs text-muted-foreground">
          {lang === "ro"
            ? "Upgrade la Premium pentru explicații detaliate."
            : "Upgrade to Premium for detailed explanations."}
        </p>
      )}
    </div>
  );
}

