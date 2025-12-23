"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/src/lib/analytics";

export function TrackCheckoutSuccess() {
  const sp = useSearchParams();
  const ok = sp.get("checkout") === "success";

  useEffect(() => {
    if (!ok) return;
    track("CheckoutSuccess");
    const hasRef = typeof document !== "undefined" && /(?:^|;\s*)romc_ref=/.test(document.cookie);
    if (hasRef) track("ReferralConversion");
  }, [ok]);

  return null;
}


