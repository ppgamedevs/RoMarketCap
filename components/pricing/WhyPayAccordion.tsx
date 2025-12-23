"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n";

export function WhyPayAccordion({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);

  const reasons =
    lang === "ro"
      ? [
          "Forecast complet pe 90 și 180 zile pentru planificare pe termen lung",
          "Explicații detaliate despre componentele scorului și factorii de influență",
          "Acces rapid la insight-uri premium fără limitări",
          "Rapoarte detaliate pentru analiză profundă",
          "Sprijin pentru dezvoltarea continuă a platformei",
        ]
      : [
          "Full forecast for 90 and 180 days for long-term planning",
          "Detailed explanations of score components and influencing factors",
          "Fast access to premium insights without limitations",
          "Detailed reports for in-depth analysis",
          "Support for continuous platform development",
        ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left text-sm font-medium"
      >
        <span>{lang === "ro" ? "De ce să plătești?" : "Why pay?"}</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

