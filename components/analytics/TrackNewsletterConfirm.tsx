"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackNewsletterConfirm({ ok }: { ok: boolean }) {
  useEffect(() => {
    if (ok) track("NewsletterConfirm");
  }, [ok]);
  return null;
}


