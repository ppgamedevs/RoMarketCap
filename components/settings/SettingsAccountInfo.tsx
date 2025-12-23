"use client";

import type { Lang } from "@/src/lib/i18n/shared";
import Link from "next/link";
import { getSiteUrl } from "@/lib/seo/site";

type SettingsAccountInfoProps = {
  lang: Lang;
  user: {
    email: string | null;
    name: string | null;
    isPremium: boolean;
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | null;
    stripeCustomerId: string | null;
    accounts: Array<{ provider: string }>;
  };
};

export function SettingsAccountInfo({ lang, user }: SettingsAccountInfoProps) {
  const provider = user.accounts[0]?.provider ?? "unknown";

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Informații cont" : "Account Information"}</h2>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{lang === "ro" ? "Email" : "Email"}</p>
          <p className="mt-1 text-sm font-medium">{user.email ?? "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{lang === "ro" ? "Provider autentificare" : "Auth Provider"}</p>
          <p className="mt-1 text-sm font-medium capitalize">{provider}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{lang === "ro" ? "Status premium" : "Premium Status"}</p>
          <p className="mt-1 text-sm font-medium">{user.isPremium ? (lang === "ro" ? "Activ" : "Active") : lang === "ro" ? "Inactiv" : "Inactive"}</p>
        </div>
        {user.isPremium && user.currentPeriodEnd && (
          <div>
            <p className="text-xs text-muted-foreground">{lang === "ro" ? "Perioadă curentă până la" : "Current period until"}</p>
            <p className="mt-1 text-sm font-medium">{user.currentPeriodEnd.toISOString().slice(0, 10)}</p>
          </div>
        )}
        {user.stripeCustomerId && (
          <div className="mt-4">
            <Link
              href={`${getSiteUrl()}/api/billing/portal`}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {lang === "ro" ? "Deschide Billing Portal" : "Open Billing Portal"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

