"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackNewsletterView() {
  useEffect(() => {
    track("NewsletterView");
  }, []);
  return null;
}


