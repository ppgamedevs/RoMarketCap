import { classifyFreshness, getFreshnessBadge } from "@/src/lib/freshness/badge";
import type { SourceId } from "@/src/lib/ingestion/types";

interface FreshnessIndicatorProps {
  lastEnrichedAt: Date | null;
  lastScoredAt: Date | null;
  dataConfidence: number | null;
  integrityScore: number | null;
  lastSeenAtFromSources: Date | null;
  fieldProvenance: Record<string, { sourceId: SourceId; sourceRef: string; seenAt: Date; confidence: number }> | null;
  lang: "ro" | "en";
}

/**
 * Get source display name
 */
function getSourceDisplayName(sourceId: SourceId, lang: "ro" | "en"): string {
  const names: Record<SourceId, { ro: string; en: string }> = {
    SEAP: { ro: "SEAP", en: "SEAP" },
    EU_FUNDS: { ro: "Fonduri UE", en: "EU Funds" },
    ANAF_VERIFY: { ro: "ANAF", en: "ANAF" },
    THIRD_PARTY: { ro: "Terți", en: "Third Party" },
  };
  return names[sourceId]?.[lang] || sourceId;
}

export function FreshnessIndicator({
  lastEnrichedAt,
  lastScoredAt,
  dataConfidence,
  integrityScore,
  lastSeenAtFromSources,
  fieldProvenance,
  lang,
}: FreshnessIndicatorProps) {
  const freshness = classifyFreshness(lastEnrichedAt, lastScoredAt);
  const badge = getFreshnessBadge(freshness);

  // Extract unique sources from field provenance
  const sources = fieldProvenance
    ? Array.from(
        new Set(
          Object.values(fieldProvenance).map((p) => p.sourceId),
        ),
      )
    : [];

  // Check if manual only (no sources)
  const isManualOnly = !lastSeenAtFromSources && sources.length === 0;

  return (
    <div className="mt-4 rounded-md border bg-muted/50 p-4 text-sm">
      <h3 className="font-medium">{lang === "ro" ? "Actualizare date" : "Data Freshness"}</h3>
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "Status" : "Status"}:</span>
          <span className={`rounded px-2 py-0.5 text-xs ${badge.color}`}>{lang === "ro" ? badge.labelRo : badge.label}</span>
        </div>
        
        {/* PROMPT 55: Source freshness */}
        {isManualOnly && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Sursă" : "Source"}:</span>
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
              {lang === "ro" ? "Doar manual" : "Manual only"}
            </span>
          </div>
        )}

        {lastSeenAtFromSources && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Văzut ultima dată din surse" : "Last seen from sources"}:</span>
            <span className="text-xs">{lastSeenAtFromSources.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}</span>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-2">
            <span className="text-muted-foreground text-xs">{lang === "ro" ? "Listat din surse" : "Listed from sources"}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {sources.map((sourceId) => {
                const sourceProvenance = Object.values(fieldProvenance!).find((p) => p.sourceId === sourceId);
                const lastSeen = sourceProvenance?.seenAt;
                return (
                  <div key={sourceId} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700" title={lastSeen ? lastSeen.toLocaleString() : undefined}>
                    {getSourceDisplayName(sourceId, lang)}
                    {lastSeen && (
                      <span className="ml-1 text-xs opacity-75">
                        ({lastSeen.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

