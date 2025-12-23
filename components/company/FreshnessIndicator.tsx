import { classifyFreshness, getFreshnessBadge } from "@/src/lib/freshness/badge";
import { getLangFromRequest } from "@/src/lib/i18n";

interface FreshnessIndicatorProps {
  lastEnrichedAt: Date | null;
  lastScoredAt: Date | null;
  dataConfidence: number | null;
  integrityScore: number | null;
  lang: "ro" | "en";
}

export function FreshnessIndicator({
  lastEnrichedAt,
  lastScoredAt,
  dataConfidence,
  integrityScore,
  lang,
}: FreshnessIndicatorProps) {
  const freshness = classifyFreshness(lastEnrichedAt, lastScoredAt);
  const badge = getFreshnessBadge(freshness);

  return (
    <div className="mt-4 rounded-md border bg-muted/50 p-4 text-sm">
      <h3 className="font-medium">{lang === "ro" ? "Actualizare date" : "Data Freshness"}</h3>
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "Status" : "Status"}:</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{lang === "ro" ? badge.labelRo : badge.label}</span>
        </div>
        {lastScoredAt && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Ultima scorare" : "Last scored"}:</span>
            <span className="text-xs">{lastScoredAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}</span>
          </div>
        )}
        {lastEnrichedAt && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Ultima îmbogățire" : "Last enriched"}:</span>
            <span className="text-xs">{lastEnrichedAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}</span>
          </div>
        )}
        {dataConfidence !== null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Încredere date" : "Data confidence"}:</span>
            <span className="text-xs">{dataConfidence}/100</span>
          </div>
        )}
        {integrityScore !== null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Scor integritate" : "Integrity score"}:</span>
            <span className="text-xs">{integrityScore}/100</span>
          </div>
        )}
      </div>
    </div>
  );
}

