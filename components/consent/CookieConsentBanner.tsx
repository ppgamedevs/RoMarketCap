"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const v = getCookie("romc_consent_analytics");
    setVisible(v == null);
  }, []);

  const accept = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setCookie("romc_consent_analytics", "1", 60 * 60 * 24 * 180);
      setVisible(false);
    } catch (err) {
      console.error("[CookieConsentBanner] Error accepting:", err);
    }
  };

  const decline = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setCookie("romc_consent_analytics", "0", 60 * 60 * 24 * 180);
      setVisible(false);
    } catch (err) {
      console.error("[CookieConsentBanner] Error declining:", err);
    }
  };

  if (!mounted || !visible) return null;

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-[100] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-muted-foreground leading-6">
          {lang === "ro" ? (
            <>
              Folosim Google Analytics pentru a îmbunătăți site-ul nostru. Continuând să navigați, acceptați
              utilizarea cookie-urilor conform{" "}
              <Link href="/cookie-policy" className="text-primary underline underline-offset-4 hover:text-primary/80">
                politicii noastre de cookie-uri
              </Link>
              .
            </>
          ) : (
            <>
              We use Google Analytics to improve our website. By continuing to browse, you accept the use of cookies
              according to our{" "}
              <Link href="/cookie-policy" className="text-primary underline underline-offset-4 hover:text-primary/80">
                cookie policy
              </Link>
              .
            </>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            onClick={decline}
            type="button"
          >
            {lang === "ro" ? "Refuz" : "Decline"}
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            onClick={accept}
            type="button"
          >
            {lang === "ro" ? "Accept" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}


