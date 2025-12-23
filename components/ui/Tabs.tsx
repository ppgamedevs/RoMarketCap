import clsx from "clsx";
import type { PropsWithChildren } from "react";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2 rounded-lg border bg-card p-1 text-sm", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex-1 rounded-md px-3 py-2 font-medium transition",
              isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ hidden, children }: PropsWithChildren<{ hidden?: boolean }>) {
  if (hidden) return null;
  return <div className="mt-3">{children}</div>;
}


