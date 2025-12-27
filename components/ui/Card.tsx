import clsx from "clsx";
import type { PropsWithChildren } from "react";

export function Card({ className, children, asChild, ...props }: PropsWithChildren<{ className?: string; asChild?: boolean } & Record<string, unknown>>) {
  if (asChild && typeof children === "object" && children !== null && "type" in children) {
    return children;
  }
  return <div className={clsx("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props}>{children}</div>;
}

export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("border-b px-4 py-3", className)}>{children}</div>;
}

export function CardBody({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-4 py-4", className)}>{children}</div>;
}

export function CardFooter({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("border-t px-4 py-3", className)}>{children}</div>;
}

export function CardTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <h3 className={clsx("text-lg font-semibold", className)}>{children}</h3>;
}

