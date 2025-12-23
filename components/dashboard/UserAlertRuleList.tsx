"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";
import type { UserAlertRule, Company } from "@prisma/client";
import { Button } from "@/components/ui/button";

type RuleWithCompany = UserAlertRule & {
  company: Pick<Company, "slug" | "name"> | null;
};

export function UserAlertRuleList({ lang, rules }: { lang: Lang; rules: RuleWithCompany[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (ruleId: string) => {
    if (!confirm(lang === "ro" ? "Ștergi această regulă?" : "Delete this rule?")) return;

    setDeleting(ruleId);
    try {
      const res = await fetch(`/api/dashboard/alerts/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      track("AlertRuleDelete", { ruleId });
      router.refresh();
    } catch (e) {
      console.error("Failed to delete rule:", e);
      alert(lang === "ro" ? "Eroare la ștergere" : "Error deleting rule");
    } finally {
      setDeleting(null);
    }
  };

  if (rules.length === 0) {
    return (
      <div className="mt-4 rounded-md border p-4 text-sm text-muted-foreground">
        {lang === "ro" ? "Nu ai reguli configurate." : "No rules configured."}
      </div>
    );
  }

  const getMetricLabel = (metric: string) => {
    if (lang === "ro") {
      switch (metric) {
        case "ROMC_AI":
          return "ROMC AI";
        case "VALUATION":
          return "Evaluare";
        case "RISK":
          return "Risc";
        default:
          return metric;
      }
    } else {
      return metric;
    }
  };

  const getOperatorLabel = (op: string) => {
    if (lang === "ro") {
      switch (op) {
        case "GT":
          return ">";
        case "LT":
          return "<";
        case "PCT_CHANGE":
          return "% schimbare";
        default:
          return op;
      }
    } else {
      switch (op) {
        case "GT":
          return ">";
        case "LT":
          return "<";
        case "PCT_CHANGE":
          return "% change";
        default:
          return op;
      }
    }
  };

  const getScopeLabel = (scope: string) => {
    if (lang === "ro") {
      switch (scope) {
        case "COMPANY":
          return "Companie";
        case "INDUSTRY":
          return "Industrie";
        case "COUNTY":
          return "Județ";
        default:
          return scope;
      }
    } else {
      return scope;
    }
  };

  return (
    <div className="mt-4 space-y-2">
      {rules.map((rule) => (
        <div key={rule.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="font-medium">{rule.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {getMetricLabel(rule.metric)} {getOperatorLabel(rule.operator)} {rule.threshold} ({getScopeLabel(rule.scope)}
                {rule.company ? `: ${rule.company.name}` : rule.industrySlug ? `: ${rule.industrySlug}` : rule.countySlug ? `: ${rule.countySlug}` : ""})
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {rule.active ? (lang === "ro" ? "Activă" : "Active") : (lang === "ro" ? "Inactivă" : "Inactive")}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(rule.id)}
              disabled={deleting === rule.id}
            >
              {deleting === rule.id ? (lang === "ro" ? "..." : "...") : lang === "ro" ? "Șterge" : "Delete"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

