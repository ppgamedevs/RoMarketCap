import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";
import type { CompanyChangeLog, Company } from "@prisma/client";

type AlertWithCompany = CompanyChangeLog & {
  company: Pick<Company, "slug" | "name">;
};

export function DashboardRecentAlerts({ lang, alerts }: { lang: Lang; alerts: AlertWithCompany[] }) {
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

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Alerte recente" : "Recent alerts"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro" ? "Nu există alerte în ultimele 14 zile." : "No alerts in the last 14 days."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Alerte recente (14 zile)" : "Recent alerts (14 days)"}</h2>
      <div className="mt-4 space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Link
                  href={`/company/${encodeURIComponent(alert.company.slug)}`}
                  className="font-medium hover:underline"
                >
                  {alert.company.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{getChangeTypeLabel(alert.changeType)}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {alert.createdAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

