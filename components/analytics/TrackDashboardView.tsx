"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackDashboardView() {
  useEffect(() => {
    track("DashboardView");
  }, []);

  return null;
}

