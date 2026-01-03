/**
 * AI Tooltip Component
 * 
 * Tooltip that opens AI chat with contextual questions
 */

"use client";

import { useState } from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type AITooltipProps = {
  question: string;
  context?: string;
  lang?: "ro" | "en";
  variant?: "icon" | "text" | "button";
  className?: string;
  onOpenChat?: (question: string) => void;
};

export function AITooltip({
  question,
  context,
  lang = "ro",
  variant = "icon",
  className = "",
  onOpenChat,
}: AITooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    const fullQuestion = context ? `${question} ${context}` : question;
    
    // Dispatch custom event to open AI chat
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-ai-chat", {
          detail: { question: fullQuestion },
        })
      );
    }

    // Also call callback if provided
    if (onOpenChat) {
      onOpenChat(fullQuestion);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
        aria-label={lang === "ro" ? "Întreabă AI despre asta" : "Ask AI about this"}
      >
        <HelpCircle className="h-4 w-4" />
        {isHovered && (
          <span className="ml-2 text-xs">
            {lang === "ro" ? "Întreabă AI" : "Ask AI"}
          </span>
        )}
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`gap-2 ${className}`}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs">
          {lang === "ro" ? "Explică AI" : "AI Explain"}
        </span>
      </Button>
    );
  }

  // Text variant
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-primary hover:underline text-sm ${className}`}
    >
      {lang === "ro" ? "Ce înseamnă asta?" : "What does this mean?"}
    </button>
  );
}
