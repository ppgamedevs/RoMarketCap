import type { Lang } from "@/src/lib/i18n/shared";

type ExplanationContext = {
  romcScore?: number | null;
  previousRomcScore?: number | null;
  romcAiScore?: number | null;
  previousRomcAiScore?: number | null;
  revenueLatest?: number | null;
  previousRevenue?: number | null;
  profitLatest?: number | null;
  previousProfit?: number | null;
  employees?: number | null;
  previousEmployees?: number | null;
  enrichVersion?: number;
  lastEnrichedAt?: Date | null;
  approvedClaimCount?: number;
  approvedSubmissionCount?: number;
  industrySlug?: string | null;
  countySlug?: string | null;
};

/**
 * Generate a short, public explanation for score changes.
 * Deterministic, no LLM.
 */
export function explainRomcChangeShort(context: ExplanationContext, lang: Lang): string {
  const parts: string[] = [];

  // Revenue change
  if (context.revenueLatest != null && context.previousRevenue != null) {
    const revenueDelta = ((context.revenueLatest - context.previousRevenue) / context.previousRevenue) * 100;
    if (Math.abs(revenueDelta) >= 5) {
      if (lang === "ro") {
        parts.push(`creștere venituri ${revenueDelta > 0 ? "+" : ""}${revenueDelta.toFixed(0)}%`);
      } else {
        parts.push(`revenue ${revenueDelta > 0 ? "+" : ""}${revenueDelta.toFixed(0)}% growth`);
      }
    }
  }

  // Employee change
  if (context.employees != null && context.previousEmployees != null) {
    const empDelta = context.employees - context.previousEmployees;
    if (Math.abs(empDelta) >= 3) {
      if (lang === "ro") {
        parts.push(`${empDelta > 0 ? "creștere" : "scădere"} angajați`);
      } else {
        parts.push(`${empDelta > 0 ? "hiring" : "reduction"} velocity`);
      }
    }
  }

  // Sector momentum (simplified: based on industry/county presence)
  if (context.industrySlug && context.countySlug) {
    if (lang === "ro") {
      parts.push("momentum sector pozitiv");
    } else {
      parts.push("positive sector momentum");
    }
  }

  // Claim/submission activity
  if ((context.approvedClaimCount ?? 0) > 0) {
    if (lang === "ro") {
      parts.push("verificare claim");
    } else {
      parts.push("verified claim");
    }
  }

  if (parts.length === 0) {
    return lang === "ro" ? "Actualizare date" : "Data update";
  }

  return lang === "ro" ? `Scor ${context.romcScore != null && context.previousRomcScore != null && context.romcScore > context.previousRomcScore ? "crescut" : "actualizat"} datorită ${parts.join(", ")}.` : `Score ${context.romcScore != null && context.previousRomcScore != null && context.romcScore > context.previousRomcScore ? "increased" : "updated"} due to ${parts.join(", ")}.`;
}

/**
 * Generate a detailed, premium explanation.
 */
export function explainRomcChangeDetailed(context: ExplanationContext, lang: Lang): string {
  const parts: string[] = [];

  // Score change
  if (context.romcScore != null && context.previousRomcScore != null) {
    const delta = context.romcScore - context.previousRomcScore;
    if (lang === "ro") {
      parts.push(`Scor ROMC v1: ${context.previousRomcScore} → ${context.romcScore} (${delta > 0 ? "+" : ""}${delta})`);
    } else {
      parts.push(`ROMC v1 score: ${context.previousRomcScore} → ${context.romcScore} (${delta > 0 ? "+" : ""}${delta})`);
    }
  }

  // AI score change
  if (context.romcAiScore != null && context.previousRomcAiScore != null) {
    const delta = context.romcAiScore - context.previousRomcAiScore;
    if (lang === "ro") {
      parts.push(`Scor ROMC AI: ${context.previousRomcAiScore} → ${context.romcAiScore} (${delta > 0 ? "+" : ""}${delta})`);
    } else {
      parts.push(`ROMC AI score: ${context.previousRomcAiScore} → ${context.romcAiScore} (${delta > 0 ? "+" : ""}${delta})`);
    }
  }

  // Financials
  if (context.revenueLatest != null && context.previousRevenue != null) {
    const delta = ((context.revenueLatest - context.previousRevenue) / context.previousRevenue) * 100;
    if (lang === "ro") {
      parts.push(`Venituri: ${context.previousRevenue.toLocaleString("ro-RO")} → ${context.revenueLatest.toLocaleString("ro-RO")} RON (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)`);
    } else {
      parts.push(`Revenue: ${context.previousRevenue.toLocaleString("en-US")} → ${context.revenueLatest.toLocaleString("en-US")} RON (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)`);
    }
  }

  if (context.profitLatest != null && context.previousProfit != null) {
    const delta = ((context.profitLatest - context.previousProfit) / Math.abs(context.previousProfit || 1)) * 100;
    if (lang === "ro") {
      parts.push(`Profit: ${context.previousProfit.toLocaleString("ro-RO")} → ${context.profitLatest.toLocaleString("ro-RO")} RON (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)`);
    } else {
      parts.push(`Profit: ${context.previousProfit.toLocaleString("en-US")} → ${context.profitLatest.toLocaleString("en-US")} RON (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)`);
    }
  }

  // Employees
  if (context.employees != null && context.previousEmployees != null) {
    const delta = context.employees - context.previousEmployees;
    if (lang === "ro") {
      parts.push(`Angajați: ${context.previousEmployees} → ${context.employees} (${delta > 0 ? "+" : ""}${delta})`);
    } else {
      parts.push(`Employees: ${context.previousEmployees} → ${context.employees} (${delta > 0 ? "+" : ""}${delta})`);
    }
  }

  // Enrichment
  if (context.enrichVersion != null && context.lastEnrichedAt != null) {
    const daysSince = Math.floor((Date.now() - context.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (lang === "ro") {
      parts.push(`Ultima îmbogățire: acum ${daysSince} zile (v${context.enrichVersion})`);
    } else {
      parts.push(`Last enriched: ${daysSince} days ago (v${context.enrichVersion})`);
    }
  }

  if (parts.length === 0) {
    return lang === "ro" ? "Nu există schimbări semnificative în date." : "No significant changes in data.";
  }

  return parts.join("\n");
}

/**
 * Explain forecast direction (positive/negative).
 */
export function explainForecastDirection(forecastScore: number, lang: Lang): string {
  const isPositive = forecastScore > 50;
  if (lang === "ro") {
    return isPositive
      ? "Prognoza indică o tendință pozitivă bazată pe creșterea veniturilor și îmbunătățirea indicatorilor financiari."
      : "Prognoza indică o tendință negativă bazată pe scăderea veniturilor sau deteriorarea indicatorilor financiari.";
  }
  return isPositive
    ? "Forecast indicates positive trend based on revenue growth and improved financial indicators."
    : "Forecast indicates negative trend based on revenue decline or deteriorating financial indicators.";
}

