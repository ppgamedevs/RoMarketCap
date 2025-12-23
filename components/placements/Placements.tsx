"use client";

import { track } from "@/src/lib/analytics";

export type RenderPlacement = {
  id: string;
  title: string;
  desc: string;
  href: string;
  badge: string | null;
};

export function Placements({
  placements,
  location,
  showEmptyState = false,
}: {
  placements: RenderPlacement[];
  location: string;
  showEmptyState?: boolean;
}) {
  if (!placements.length && !showEmptyState) return null;

  return (
    <section className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">Sponsors</h2>
      <div className="mt-4 grid gap-3">
        {placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">N/A</p>
        ) : (
          placements.map((p) => (
            <a
              key={p.id}
              href={p.href}
              target="_blank"
              rel="nofollow noopener noreferrer sponsored"
              className="rounded-lg border p-4 hover:bg-accent"
              onClick={() => track("PlacementClick", { placementId: p.id, location })}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{p.title}</p>
                {p.badge ? <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{p.badge}</span> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </a>
          ))
        )}
      </div>
    </section>
  );
}


