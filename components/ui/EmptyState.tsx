import Link from "next/link";
import { Button } from "./button";

export function EmptyState({
  title,
  description,
  action,
  href,
}: {
  title: string;
  description?: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-10 text-center">
      <div className="text-sm font-semibold">{title}</div>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {href && action ? (
        <Link href={href} className="mt-4">
          <Button size="sm" variant="primary">
            {action}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}


