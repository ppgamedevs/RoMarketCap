"use client";

import type { ScoreStabilityProfile, CompanyRiskFlag } from "@prisma/client";
import type { Lang } from "@/src/lib/i18n/shared";

type IntegrityIndicatorsProps = {
  lang: Lang;
  scoreStabilityProfile: ScoreStabilityProfile | null;
  dataConfidence: number | null;
  companyIntegrityScore: number | null;
  companyRiskFlags: CompanyRiskFlag[];
};

export function IntegrityIndicators({
  lang,
  scoreStabilityProfile,
  dataConfidence,
  companyIntegrityScore,
  companyRiskFlags,
}: IntegrityIndicatorsProps) {
  const getStabilityLabel = (profile: ScoreStabilityProfile | null): string => {
    if (!profile) return lang === "ro" ? "Necunoscut" : "Unknown";
    switch (profile) {
      case "LOW":
        return lang === "ro" ? "Scăzută" : "Low";
      case "MEDIUM":
        return lang === "ro" ? "Medie" : "Medium";
      case "HIGH":
        return lang === "ro" ? "Ridicată" : "High";
    }
  };

  const getStabilityColor = (profile: ScoreStabilityProfile | null): string => {
    if (!profile) return "text-muted-foreground";
    switch (profile) {
      case "LOW":
        return "text-green-600";
      case "MEDIUM":
        return "text-yellow-600";
      case "HIGH":
        return "text-red-600";
    }
  };

  const getConfidenceLabel = (score: number | null): string => {
    if (score == null) return lang === "ro" ? "Necunoscut" : "Unknown";
    if (score >= 70) return lang === "ro" ? "Ridicată" : "High";
    if (score >= 40) return lang === "ro" ? "Medie" : "Medium";
    return lang === "ro" ? "Scăzută" : "Low";
  };

  const getConfidenceColor = (score: number | null): string => {
    if (score == null) return "text-muted-foreground";
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{lang === "ro" ? "Volatilitate scor" : "Score volatility"}</span>
        <span className={`font-medium ${getStabilityColor(scoreStabilityProfile)}`}>
          {getStabilityLabel(scoreStabilityProfile)}
        </span>
      </div>
      {dataConfidence != null && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "Încredere date" : "Data confidence"}</span>
          <span className={`font-medium ${getConfidenceColor(dataConfidence)}`}>{getConfidenceLabel(dataConfidence)}</span>
        </div>
      )}
      {companyIntegrityScore != null && companyIntegrityScore < 80 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "Scor integritate" : "Integrity score"}</span>
          <span className={`font-medium ${companyIntegrityScore >= 70 ? "text-yellow-600" : "text-red-600"}`}>
            {companyIntegrityScore}/100
          </span>
        </div>
      )}
      {companyRiskFlags.length > 0 && (
        <div className="mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          {lang === "ro"
            ? "Atenție: Acest profil are flag-uri de risc active."
            : "Warning: This profile has active risk flags."}
        </div>
      )}
    </div>
  );
}

