"use client";

import { useEffect, useState } from "react";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check demo mode from env (client-side check via API)
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        // Hide banner if launch mode is active
        setIsDemo(data?.demoMode === true && data?.launchMode !== true);
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  if (!isDemo) return null;

  return (
    <div className="border-b bg-blue-50 px-6 py-2 text-center text-xs text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
      <p>
        <span className="font-medium">Demo data / limited dataset</span> •{" "}
        <span className="font-medium">Date demo / set de date limitat</span>
      </p>
    </div>
  );
}
