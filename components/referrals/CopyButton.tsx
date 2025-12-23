"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/src/lib/i18n";

export function CopyButton({ link, lang }: { link: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button size="sm" onClick={handleCopy}>
      {copied ? (lang === "ro" ? "Copiat!" : "Copied!") : lang === "ro" ? "Copiază" : "Copy"}
    </Button>
  );
}

