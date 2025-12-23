import { z } from "zod";

export type PlacementLocation = "companies" | "company" | "movers" | "pricing";

const LocationSchema = z.enum(["companies", "company", "movers", "pricing"]);

const PlacementSchema = z.object({
  id: z.string().min(1).max(80),
  title_ro: z.string().min(1).max(120),
  title_en: z.string().min(1).max(120),
  desc_ro: z.string().min(1).max(200),
  desc_en: z.string().min(1).max(200),
  href: z.string().min(1).max(500),
  utm: z.string().max(200).optional(),
  locations: z.array(LocationSchema).min(1),
  badge_ro: z.string().min(1).max(30).optional(),
  badge_en: z.string().min(1).max(30).optional(),
  enabled: z.boolean().optional().default(true),
});

export type Placement = z.infer<typeof PlacementSchema>;

export type RenderPlacement = {
  id: string;
  title: string;
  desc: string;
  href: string;
  badge: string | null;
};

export function isSafeHttpUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function appendUtm(href: string, utm: string | undefined): string {
  if (!utm) return href;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return href;
  }
  const params = new URLSearchParams(u.search);
  const extra = new URLSearchParams(utm.startsWith("?") ? utm.slice(1) : utm);
  for (const [k, v] of extra.entries()) {
    if (!k) continue;
    params.set(k, v);
  }
  u.search = params.toString();
  return u.toString();
}

export function parsePlacements(json: string | undefined | null): Placement[] {
  const raw = (json ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr = z.array(PlacementSchema).safeParse(parsed);
  if (!arr.success) return [];
  return arr.data.filter((p) => p.enabled !== false).filter((p) => isSafeHttpUrl(p.href));
}

export async function getPlacementsForLocation(
  location: PlacementLocation,
  lang: "ro" | "en",
  json: string | undefined | null = process.env.NEXT_PUBLIC_PLACEMENTS_JSON,
): Promise<RenderPlacement[]> {
  // Check feature flag (async to support server components)
  const { isFlagEnabled } = await import("@/src/lib/flags/flags");
  const placementsEnabled = await isFlagEnabled("PLACEMENTS");
  if (!placementsEnabled) {
    return [];
  }

  const placements = parsePlacements(json).filter((p) => p.locations.includes(location));
  return placements.map((p) => ({
    id: p.id,
    title: lang === "ro" ? p.title_ro : p.title_en,
    desc: lang === "ro" ? p.desc_ro : p.desc_en,
    badge: (lang === "ro" ? p.badge_ro : p.badge_en) ?? null,
    href: appendUtm(p.href, p.utm),
  }));
}


