import clsx from "clsx";
import type { PropsWithChildren } from "react";

type BadgeVariant = "neutral" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

export function Badge({ variant = "neutral", className, children }: PropsWithChildren<{ variant?: BadgeVariant; className?: string }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}


