"use client";

import { useEffect, useState } from "react";

export function ReadOnlyBanner() {
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    // Check read-only status from health endpoint
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setIsReadOnly(data?.readOnlyMode === true);
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  if (!isReadOnly) return null;

  return (
    <div className="border-b bg-yellow-50 px-6 py-3 text-center text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
      <p className="font-medium">
        ⚠️ System is in read-only mode. Some features are temporarily disabled for maintenance.
      </p>
    </div>
  );
}

