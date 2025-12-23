import type { Lang } from "@/src/lib/i18n/shared";

export function claimSubmittedEmail(lang: Lang, companyName: string) {
  const subject = lang === "ro" ? `Revendicare trimisă: ${companyName}` : `Claim submitted: ${companyName}`;
  const text =
    lang === "ro"
      ? `Am primit cererea ta de revendicare pentru ${companyName}. Va fi revizuită.\n\nRoMarketCap`
      : `We received your claim request for ${companyName}. It will be reviewed.\n\nRoMarketCap`;
  return { subject, text };
}

export function submissionSubmittedEmail(lang: Lang, companyName: string) {
  const subject = lang === "ro" ? `Actualizare trimisă: ${companyName}` : `Update submitted: ${companyName}`;
  const text =
    lang === "ro"
      ? `Am primit actualizarea ta pentru ${companyName}. Va fi revizuită înainte de publicare.\n\nRoMarketCap`
      : `We received your update for ${companyName}. It will be reviewed before publishing.\n\nRoMarketCap`;
  return { subject, text };
}

export function moderationResultEmail(lang: Lang, kind: "claim" | "submission", companyName: string, status: "approved" | "rejected", note?: string | null) {
  const base =
    lang === "ro"
      ? status === "approved"
        ? "Aprobat"
        : "Respins"
      : status === "approved"
        ? "Approved"
        : "Rejected";
  const subject =
    lang === "ro"
      ? `${base}: ${kind === "claim" ? "Revendicare" : "Actualizare"} - ${companyName}`
      : `${base}: ${kind === "claim" ? "Claim" : "Update"} - ${companyName}`;
  const text =
    lang === "ro"
      ? `${base} pentru ${companyName}.\n${note ? `\nNotă: ${note}\n` : ""}\nRoMarketCap`
      : `${base} for ${companyName}.\n${note ? `\nNote: ${note}\n` : ""}\nRoMarketCap`;
  return { subject, text };
}

export function premiumUpgradedEmail(lang: Lang) {
  const subject = lang === "ro" ? "Premium activ" : "Premium active";
  const text =
    lang === "ro"
      ? "Premium este activ pe contul tău. Mulțumim.\n\nRoMarketCap"
      : "Premium is now active on your account. Thank you.\n\nRoMarketCap";
  return { subject, text };
}


