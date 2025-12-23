"use client";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import type { Lang } from "@/src/lib/i18n";

type ReferralStatsProps = {
  lang: Lang;
  totalConversions: number;
  totalLandings: number;
  totalDaysEarned: number;
  totalExportCreditsEarned: number;
  pendingDays: number;
  pendingExportCredits: number;
  referralLtv: number;
};

export function ReferralStats({
  lang,
  totalConversions,
  totalLandings,
  totalDaysEarned,
  totalExportCreditsEarned,
  pendingDays,
  pendingExportCredits,
  referralLtv,
}: ReferralStatsProps) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">{lang === "ro" ? "Conversii" : "Conversions"}</h3>
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-semibold">{totalConversions}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {lang === "ro" ? `${totalLandings} landing-uri` : `${totalLandings} landings`}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">{lang === "ro" ? "Recompense" : "Rewards"}</h3>
        </CardHeader>
        <CardBody>
          <div className="text-sm">
            <div>
              {lang === "ro" ? "Zile premium:" : "Premium days:"} <strong>{totalDaysEarned}</strong>
            </div>
            <div className="mt-1">
              {lang === "ro" ? "Credite export:" : "Export credits:"} <strong>{totalExportCreditsEarned}</strong>
            </div>
            {(pendingDays > 0 || pendingExportCredits > 0) && (
              <div className="mt-2 text-xs text-muted-foreground">
                {lang === "ro" ? "În așteptare:" : "Pending:"} {pendingDays} {lang === "ro" ? "zile" : "days"},{" "}
                {pendingExportCredits} {lang === "ro" ? "credite" : "credits"}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">{lang === "ro" ? "LTV generat" : "Generated LTV"}</h3>
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-semibold">€{referralLtv.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {lang === "ro" ? "Valoare totală generată" : "Total value generated"}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

