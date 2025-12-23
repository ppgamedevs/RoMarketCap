"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackInvestorsLandingView() {
  useEffect(() => {
    track("InvestorsLandingView");
  }, []);

  return null;
}

