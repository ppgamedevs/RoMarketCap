"use client";

import { useEffect } from "react";

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

export function ReferralCapture() {
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (!ref) return;
    if (getCookie("romc_ref")) return;
    fetch(`/api/referral/capture?ref=${encodeURIComponent(ref)}`).catch(() => null);
  }, []);
  return null;
}


