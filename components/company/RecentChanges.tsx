import type { Lang } from "@/src/lib/i18n/shared";
import type { CompanyChangeLog } from "@prisma/client";

export function RecentChanges({ lang, changes }: { lang: Lang; changes: CompanyChangeLog[] }) {
  if (changes.length === 0) return null;

  const getChangeTypeLabel = (type: string) => {
    if (lang === "ro") {
      switch (type) {
        case "SCORE_CHANGE":
          return "Schimbare scor";
        case "FORECAST_CHANGE":
          return "Schimbare forecast";
        case "ENRICHMENT":
          return "Actualizare date";
        case "CLAIM_APPROVED":
          return "Revendicare aprobată";
        case "SUBMISSION_APPROVED":
          return "Actualizare aprobată";
        default:
          return type;
      }
    } else {
      switch (type) {
        case "SCORE_CHANGE":
          return "Score change";
        case "FORECAST_CHANGE":
          return "Forecast change";
        case "ENRICHMENT":
          return "Data update";
        case "CLAIM_APPROVED":
          return "Claim approved";
        case "SUBMISSION_APPROVED":
          return "Update approved";
        default:
          return type;
      }
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Schimbări recente" : "Recent changes"}</h2>
      <div className="mt-4 space-y-2">
        {changes.slice(0, 10).map((change) => (
          <div key={change.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
            <div className="flex-1">
              <div className="font-medium">{getChangeTypeLabel(change.changeType)}</div>
              {change.metadata && typeof change.metadata === "object" && "delta" in change.metadata ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {lang === "ro" ? "Delta" : "Delta"}: {String(change.metadata.delta)}
                </div>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {change.createdAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

