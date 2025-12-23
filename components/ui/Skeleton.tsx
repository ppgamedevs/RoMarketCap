import clsx from "clsx";
import type { PropsWithChildren } from "react";

export function Skeleton({ className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("animate-pulse rounded-md bg-muted", className)} />;
}


