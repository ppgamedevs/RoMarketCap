import clsx from "clsx";
import { Badge } from "./Badge";

export function Metric({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-lg font-semibold">{value}</div>
        {delta ? (
          <Badge variant={delta.direction === "up" ? "success" : delta.direction === "down" ? "danger" : "neutral"}>
            {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "•"} {delta.value}
          </Badge>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}


