import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";

export function DashboardAccountStatus({
  lang,
  isPremium,
  subscriptionStatus,
  currentPeriodEnd,
  referralCreditDays,
  apiKeyCount,
}: {
  lang: Lang;
  isPremium: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  referralCreditDays: number;
  apiKeyCount: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Status cont" : "Account status"}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "Plan" : "Plan"}</span>
          <span className="font-medium">{isPremium ? (lang === "ro" ? "Premium" : "Premium") : (lang === "ro" ? "Free" : "Free")}</span>
        </div>
        {subscriptionStatus ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Status abonament" : "Subscription status"}</span>
            <span className="font-medium">{subscriptionStatus}</span>
          </div>
        ) : null}
        {currentPeriodEnd ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Se termină" : "Ends"}</span>
            <span className="font-medium">{currentPeriodEnd.toISOString().slice(0, 10)}</span>
          </div>
        ) : null}
        {referralCreditDays > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{lang === "ro" ? "Credit referral" : "Referral credit"}</span>
            <span className="font-medium">{referralCreditDays} {lang === "ro" ? "zile" : "days"}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{lang === "ro" ? "API keys active" : "Active API keys"}</span>
          <span className="font-medium">{apiKeyCount}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/billing">
          {lang === "ro" ? "Gestionare abonament" : "Manage subscription"}
        </Link>
        {apiKeyCount > 0 ? (
          <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/api-keys">
            {lang === "ro" ? "Vezi API keys" : "View API keys"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

