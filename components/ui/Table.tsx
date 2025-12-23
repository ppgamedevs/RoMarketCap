import clsx from "clsx";
import type { PropsWithChildren } from "react";

export function Table({ className, children, stickyHeader = false }: PropsWithChildren<{ className?: string; stickyHeader?: boolean }>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full border-collapse text-sm", className, stickyHeader && "[&_th]:sticky [&_th]:top-0 [&_th]:bg-card")}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: PropsWithChildren) {
  return <thead className="bg-muted/60 text-muted-foreground">{children}</thead>;
}

export function TBody({ children }: PropsWithChildren) {
  return <tbody className="[&_tr:nth-child(even)]:bg-muted/30">{children}</tbody>;
}

export function TR({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <tr className={clsx("border-b last:border-0", className)}>{children}</tr>;
}

export function TH({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <th className={clsx("px-3 py-2 text-left font-semibold", className)}>{children}</th>;
}

export function TD({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <td className={clsx("px-3 py-2 align-top", className)}>{children}</td>;
}


