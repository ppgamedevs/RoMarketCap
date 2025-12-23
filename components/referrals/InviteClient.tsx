"use client";

import { useState } from "react";
import { track } from "@/src/lib/analytics";

export function InviteClient({ lang, link }: { lang: "ro" | "en"; link: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      track("ReferralLinkCopy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium">{lang === "ro" ? "Link de referral" : "Referral link"}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={link} readOnly />
        <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={onCopy} type="button">
          {copied ? (lang === "ro" ? "Copiat" : "Copied") : lang === "ro" ? "Copiază" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {lang === "ro"
          ? "Creditul se aplică după ce abonamentul este activ."
          : "Credit applies after the subscription becomes active."}
      </p>
    </div>
  );
}


