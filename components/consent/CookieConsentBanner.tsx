"use client";

import { useState } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function CookieConsentBanner({ lang }: { lang: "ro" | "en" }) {
  const [visible, setVisible] = useState(() => {
    const v = getCookie("romc_consent_analytics");
    return v == null;
  });

  const accept = () => {
    setCookie("romc_consent_analytics", "1", 60 * 60 * 24 * 180);
    setVisible(false);
    // Reload so server-rendered layout can decide whether to inject Plausible script.
    location.reload();
  };

  const decline = () => {
    setCookie("romc_consent_analytics", "0", 60 * 60 * 24 * 180);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground leading-6">
          {lang === "ro"
            ? "Folosim analytics (Plausible) doar dacă accepți. Nu folosim cookies de tracking fără consimțământ."
            : "We use analytics (Plausible) only if you accept. No tracking cookies without consent."}
        </div>
        <div className="flex gap-3">
          <button className="rounded-md border px-3 py-2 text-sm" onClick={decline} type="button">
            {lang === "ro" ? "Decline" : "Decline"}
          </button>
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={accept} type="button">
            {lang === "ro" ? "Accept analytics" : "Accept analytics"}
          </button>
        </div>
      </div>
    </div>
  );
}


