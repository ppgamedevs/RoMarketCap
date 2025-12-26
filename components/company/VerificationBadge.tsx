"use client";

import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type VerificationBadgeProps = {
  verification: {
    isActive: boolean;
    isVatRegistered: boolean;
    lastReportedYear: number | null;
    verifiedAt: Date;
    verificationStatus: "SUCCESS" | "ERROR" | "PENDING";
    errorMessage?: string | null;
  } | null;
  lang: "ro" | "en";
};

export function VerificationBadge({ verification, lang }: VerificationBadgeProps) {
  if (!verification) {
    return null;
  }

  const isStale = Date.now() - verification.verifiedAt.getTime() > 90 * 24 * 60 * 60 * 1000; // 90 days

  if (verification.verificationStatus === "ERROR") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-sm">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-destructive">
          {lang === "ro" ? "Verificare ANAF eșuată" : "ANAF verification failed"}
        </span>
      </div>
    );
  }

  if (verification.verificationStatus === "PENDING") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-muted bg-muted/50 px-3 py-1.5 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {lang === "ro" ? "Verificare în așteptare" : "Verification pending"}
        </span>
      </div>
    );
  }

  if (!verification.isActive) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-sm">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-destructive">
          {lang === "ro" ? "Inactiv în ANAF" : "Inactive in ANAF"}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-sm"
      title={lang === "ro" ? "Verificare fiscală publică (mod sigur)" : "Public fiscal verification (safe mode)"}
    >
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <div className="flex flex-col">
        <span className="font-medium text-green-700">
          {lang === "ro" ? "Verificat ANAF" : "ANAF Verified"}
        </span>
        <span className="text-xs text-muted-foreground">
          {verification.isVatRegistered
            ? lang === "ro"
              ? "Plătitor TVA"
              : "VAT Registered"
            : lang === "ro"
              ? "Neplătitor TVA"
              : "Non-VAT"}
          {verification.lastReportedYear && ` • ${lang === "ro" ? "Ultimul an raportat" : "Last reported"}: ${verification.lastReportedYear}`}
          {isStale && ` • ${lang === "ro" ? "Verificare veche" : "Stale verification"}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {lang === "ro" ? "Verificat la" : "Verified on"}: {verification.verifiedAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
        </span>
      </div>
    </div>
  );
}

