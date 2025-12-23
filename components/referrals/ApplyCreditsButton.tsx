"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/src/lib/i18n";

export function ApplyCreditsButton({ lang }: { lang: Lang }) {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral/apply-credits", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setApplied(true);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error("Error applying credits:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" size="sm" onClick={handleApply} disabled={loading || applied}>
      {applied
        ? lang === "ro"
          ? "Aplicat!"
          : "Applied!"
        : loading
          ? lang === "ro"
            ? "Se aplică..."
            : "Applying..."
          : lang === "ro"
            ? "Aplică creditele"
            : "Apply credits"}
    </Button>
  );
}

