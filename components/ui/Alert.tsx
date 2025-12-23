import clsx from "clsx";
import type { PropsWithChildren } from "react";

type Variant = "info" | "success" | "warning" | "error";

const variantClass: Record<Variant, string> = {
  info: "bg-blue-50 text-blue-900 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800",
  success: "bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
  warning: "bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
  error: "bg-red-50 text-red-900 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
};

export function Alert({
  variant = "info",
  title,
  className,
  children,
}: PropsWithChildren<{ variant?: Variant; title?: string; className?: string }>) {
  return (
    <div className={clsx("rounded-md border px-3 py-2 text-sm", variantClass[variant], className)} role="alert">
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}


