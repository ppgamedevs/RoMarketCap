"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackInvestorPageView() {
  useEffect(() => {
    track("InvestorPageView");
  }, []);

  return null;
}

