"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackPricingView() {
  useEffect(() => {
    track("PricingView");
  }, []);
  return null;
}


