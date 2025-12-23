export type CompanyDelta = {
  slug: string;
  name: string;
  industrySlug: string | null;
  countySlug: string | null;
  fromScore: number;
  toScore: number;
  delta: number;
};

export function computeTopMovers(rows: CompanyDelta[], n = 10) {
  const sorted = rows.slice().sort((a, b) => b.delta - a.delta);
  return {
    topUp: sorted.slice(0, n),
    topDown: sorted.slice().reverse().slice(0, n),
  };
}

export function avgDeltaByKey(rows: CompanyDelta[], key: "industrySlug" | "countySlug", n = 5) {
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    const cur = map.get(k) ?? { sum: 0, count: 0 };
    cur.sum += r.delta;
    cur.count += 1;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([slug, v]) => ({ slug, avgDelta: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avgDelta - a.avgDelta)
    .slice(0, n);
}


