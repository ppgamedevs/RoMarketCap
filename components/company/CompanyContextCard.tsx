/**
 * Company Context Card
 * 
 * Displays structured contextual information about a company:
 * - Financial highlights (revenue, investments)
 * - Key insights
 * - Growth plans
 * - Market context
 */

import { formatCurrency } from "@/src/lib/money/formatCurrency";
import { t } from "@/src/lib/i18n";

type CompanyContext = {
  financialHighlights?: {
    revenue2024?: { value: number; currency: string; note?: string };
    investments2025?: { value: number; currency: string; note?: string };
    [key: string]: { value: number; currency: string; note?: string } | undefined;
  };
  keyInsights?: string[];
  growthPlans?: string[];
  marketContext?: string;
  lastUpdated?: string;
  source?: string;
};

type CompanyContextCardProps = {
  lang: "ro" | "en";
  context: CompanyContext | null | undefined;
};

export function CompanyContextCard({ lang, context }: CompanyContextCardProps) {
  if (!context) {
    return null;
  }

  const hasFinancialHighlights = context.financialHighlights && Object.keys(context.financialHighlights).length > 0;
  const hasKeyInsights = context.keyInsights && context.keyInsights.length > 0;
  const hasGrowthPlans = context.growthPlans && context.growthPlans.length > 0;
  const hasMarketContext = context.marketContext;

  if (!hasFinancialHighlights && !hasKeyInsights && !hasGrowthPlans && !hasMarketContext) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Financial Highlights */}
      {hasFinancialHighlights && (
        <div className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">
            {lang === "ro" ? "Repere Financiare" : "Financial Highlights"}
          </h2>
          <div className="mt-4 space-y-4">
            {context.financialHighlights?.revenue2024 && (
              <div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ro" ? "Cifră de afaceri 2024" : "Revenue 2024"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatCurrency(
                    context.financialHighlights.revenue2024.value,
                    {
                      currency: context.financialHighlights.revenue2024.currency as "RON" | "EUR",
                      locale: lang,
                    }
                  )}
                </div>
                {context.financialHighlights.revenue2024.note && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {context.financialHighlights.revenue2024.note}
                  </div>
                )}
              </div>
            )}
            {context.financialHighlights?.investments2025 && (
              <div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ro" ? "Investiții 2025" : "Investments 2025"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatCurrency(
                    context.financialHighlights.investments2025.value,
                    {
                      currency: context.financialHighlights.investments2025.currency as "RON" | "EUR",
                      locale: lang,
                    }
                  )}
                </div>
                {context.financialHighlights.investments2025.note && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {context.financialHighlights.investments2025.note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {hasKeyInsights && (
        <div className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">
            {lang === "ro" ? "Informații Cheie" : "Key Information"}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {context.keyInsights?.map((insight, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Growth Plans */}
      {hasGrowthPlans && (
        <div className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">
            {lang === "ro" ? "Planuri de Extindere" : "Growth Plans"}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {context.growthPlans?.map((plan, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">→</span>
                <span>{plan}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Market Context */}
      {hasMarketContext && (
        <div className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">
            {lang === "ro" ? "Context Piață" : "Market Context"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-6">
            {context.marketContext}
          </p>
        </div>
      )}

      {/* Source Attribution */}
      {(context.source || context.lastUpdated) && (
        <div className="text-xs text-muted-foreground">
          {context.source && (
            <>
              {lang === "ro" ? "Sursă" : "Source"}: {context.source}
            </>
          )}
          {context.lastUpdated && (
            <>
              {context.source && " • "}
              {lang === "ro" ? "Actualizat" : "Updated"}: {new Date(context.lastUpdated).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
            </>
          )}
        </div>
      )}
    </div>
  );
}
