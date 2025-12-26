import { prisma } from "@/src/lib/db";

export type CompanySort = "romc_desc" | "revenue_desc" | "employees_desc" | "newest";

export type CompanyListFilters = {
  q?: string;
  industry?: string;
  county?: string;
  sort?: CompanySort;
  page?: number;
  pageSize?: number;
};

export async function listCompanies(filters: CompanyListFilters) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 10), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const q = (filters.q ?? "").trim();
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const { isLaunchMode } = await import("@/src/lib/launch/mode");
  const { buildRankingGuard } = await import("@/src/lib/ranking/rankingGuard");
  
  const isDemoMode = getEffectiveDemoMode();
  const launchMode = isLaunchMode();
  
  // Use ranking guard for deterministic, fair rankings
  const rankingGuard = buildRankingGuard(launchMode);
  
  const where = {
    ...rankingGuard.where,
    ...(filters.industry ? { industrySlug: filters.industry } : {}),
    ...(filters.county ? { countySlug: filters.county } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { legalName: { contains: q, mode: "insensitive" as const } },
            { cui: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Use ranking guard orderBy for deterministic tie-breakers, but allow custom sort
  const orderBy =
    filters.sort === "revenue_desc"
      ? [{ revenueLatest: "desc" as const }, ...rankingGuard.orderBy]
      : filters.sort === "employees_desc"
        ? [{ employees: "desc" as const }, ...rankingGuard.orderBy]
        : filters.sort === "newest"
          ? [{ lastUpdatedAt: "desc" as const }, ...rankingGuard.orderBy]
          : rankingGuard.orderBy;

  const [total, items] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        cui: true,
        county: true,
        countySlug: true,
        industrySlug: true,
        website: true,
        romcScore: true,
        romcConfidence: true,
        valuationRangeLow: true,
        valuationRangeHigh: true,
        lastScoredAt: true,
        lastUpdatedAt: true,
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

export async function listIndustrySlugsWithCounts() {
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const isDemoMode = getEffectiveDemoMode();
  const rows = await prisma.company.groupBy({
    by: ["industrySlug"],
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      industrySlug: { not: null },
      ...(isDemoMode ? {} : { isDemo: false }),
    },
    _count: { _all: true },
  });
  return rows
    .filter((r) => r.industrySlug)
    .map((r) => ({ slug: r.industrySlug as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function listCountySlugsWithCounts() {
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const isDemoMode = getEffectiveDemoMode();
  const rows = await prisma.company.groupBy({
    by: ["countySlug"],
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      countySlug: { not: null },
      ...(isDemoMode ? {} : { isDemo: false }),
    },
    _count: { _all: true },
  });
  return rows
    .filter((r) => r.countySlug)
    .map((r) => ({ slug: r.countySlug as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}


