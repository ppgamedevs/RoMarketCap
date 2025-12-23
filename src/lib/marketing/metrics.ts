import { prisma } from "@/src/lib/db";

/**
 * Marketing KPIs - Single source of truth
 */

export type MarketingMetrics = {
  // Organic traffic (from Plausible API - to be fetched separately)
  organicTraffic: {
    current: number;
    previous: number;
    delta: number;
    deltaPercent: number;
  };
  brandSearchTraffic: {
    current: number;
    previous: number;
    delta: number;
    deltaPercent: number;
  };

  // Database metrics
  claimedCompanies: {
    total: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
  newsletterSubscribers: {
    total: number;
    active: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
  premiumUsers: {
    total: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
  apiKeys: {
    total: number;
    active: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
  partnerLeads: {
    total: number;
    new: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
  watchlists: {
    total: number;
    thisWeek: number;
    lastWeek: number;
    delta: number;
    deltaPercent: number;
  };
};

/**
 * Calculate delta and delta percent
 */
function calculateDelta(current: number, previous: number): { delta: number; deltaPercent: number } {
  const delta = current - previous;
  const deltaPercent = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0;
  return { delta, deltaPercent };
}

/**
 * Get marketing metrics from database
 */
export async function getMarketingMetrics(): Promise<MarketingMetrics> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Claimed companies
  const [claimedTotal, claimedThisWeek, claimedLastWeek] = await Promise.all([
    prisma.companyClaim.count(),
    prisma.companyClaim.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.companyClaim.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);
  const claimedDelta = calculateDelta(claimedThisWeek, claimedLastWeek);

  // Newsletter subscribers
  const [newsletterTotal, newsletterActive, newsletterThisWeek, newsletterLastWeek] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
    prisma.newsletterSubscriber.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.newsletterSubscriber.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);
  const newsletterDelta = calculateDelta(newsletterThisWeek, newsletterLastWeek);

  // Premium users
  const [premiumTotal, premiumThisWeek, premiumLastWeek] = await Promise.all([
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({
      where: {
        isPremium: true,
        premiumSince: { gte: weekAgo },
      },
    }),
    prisma.user.count({
      where: {
        isPremium: true,
        premiumSince: { gte: twoWeeksAgo, lt: weekAgo },
      },
    }),
  ]);
  const premiumDelta = calculateDelta(premiumThisWeek, premiumLastWeek);

  // API keys
  const [apiKeysTotal, apiKeysActive, apiKeysThisWeek, apiKeysLastWeek] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { active: true } }),
    prisma.apiKey.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.apiKey.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);
  const apiKeysDelta = calculateDelta(apiKeysThisWeek, apiKeysLastWeek);

  // Partner leads
  const [partnerLeadsTotal, partnerLeadsNew, partnerLeadsThisWeek, partnerLeadsLastWeek] = await Promise.all([
    prisma.partnerLead.count(),
    prisma.partnerLead.count({ where: { status: "NEW" } }),
    prisma.partnerLead.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.partnerLead.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);
  const partnerLeadsDelta = calculateDelta(partnerLeadsThisWeek, partnerLeadsLastWeek);

  // Watchlists
  const [watchlistsTotal, watchlistsThisWeek, watchlistsLastWeek] = await Promise.all([
    prisma.watchlistItem.count(),
    prisma.watchlistItem.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.watchlistItem.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);
  const watchlistsDelta = calculateDelta(watchlistsThisWeek, watchlistsLastWeek);

  return {
    // Traffic metrics (to be populated from Plausible API)
    organicTraffic: {
      current: 0,
      previous: 0,
      delta: 0,
      deltaPercent: 0,
    },
    brandSearchTraffic: {
      current: 0,
      previous: 0,
      delta: 0,
      deltaPercent: 0,
    },
    claimedCompanies: {
      total: claimedTotal,
      thisWeek: claimedThisWeek,
      lastWeek: claimedLastWeek,
      ...claimedDelta,
    },
    newsletterSubscribers: {
      total: newsletterTotal,
      active: newsletterActive,
      thisWeek: newsletterThisWeek,
      lastWeek: newsletterLastWeek,
      ...newsletterDelta,
    },
    premiumUsers: {
      total: premiumTotal,
      thisWeek: premiumThisWeek,
      lastWeek: premiumLastWeek,
      ...premiumDelta,
    },
    apiKeys: {
      total: apiKeysTotal,
      active: apiKeysActive,
      thisWeek: apiKeysThisWeek,
      lastWeek: apiKeysLastWeek,
      ...apiKeysDelta,
    },
    partnerLeads: {
      total: partnerLeadsTotal,
      new: partnerLeadsNew,
      thisWeek: partnerLeadsThisWeek,
      lastWeek: partnerLeadsLastWeek,
      ...partnerLeadsDelta,
    },
    watchlists: {
      total: watchlistsTotal,
      thisWeek: watchlistsThisWeek,
      lastWeek: watchlistsLastWeek,
      ...watchlistsDelta,
    },
  };
}

/**
 * Get monthly metrics for MoM comparison
 */
export async function getMonthlyMetrics(): Promise<{
  thisMonth: MarketingMetrics;
  lastMonth: MarketingMetrics;
}> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // This month
  const claimedThisMonth = await prisma.companyClaim.count({
    where: { createdAt: { gte: monthStart } },
  });
  const newsletterThisMonth = await prisma.newsletterSubscriber.count({
    where: { createdAt: { gte: monthStart } },
  });
  const premiumThisMonth = await prisma.user.count({
    where: {
      isPremium: true,
      premiumSince: { gte: monthStart },
    },
  });
  const apiKeysThisMonth = await prisma.apiKey.count({
    where: { createdAt: { gte: monthStart } },
  });
  const partnerLeadsThisMonth = await prisma.partnerLead.count({
    where: { createdAt: { gte: monthStart } },
  });
  const watchlistsThisMonth = await prisma.watchlistItem.count({
    where: { createdAt: { gte: monthStart } },
  });

  // Last month
  const claimedLastMonth = await prisma.companyClaim.count({
    where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
  });
  const newsletterLastMonth = await prisma.newsletterSubscriber.count({
    where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
  });
  const premiumLastMonth = await prisma.user.count({
    where: {
      isPremium: true,
      premiumSince: { gte: lastMonthStart, lt: lastMonthEnd },
    },
  });
  const apiKeysLastMonth = await prisma.apiKey.count({
    where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
  });
  const partnerLeadsLastMonth = await prisma.partnerLead.count({
    where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
  });
  const watchlistsLastMonth = await prisma.watchlistItem.count({
    where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
  });

  const baseMetrics = await getMarketingMetrics();

  return {
    thisMonth: {
      ...baseMetrics,
      claimedCompanies: {
        ...baseMetrics.claimedCompanies,
        thisWeek: claimedThisMonth,
        lastWeek: claimedLastMonth,
        ...calculateDelta(claimedThisMonth, claimedLastMonth),
      },
      newsletterSubscribers: {
        ...baseMetrics.newsletterSubscribers,
        thisWeek: newsletterThisMonth,
        lastWeek: newsletterLastMonth,
        ...calculateDelta(newsletterThisMonth, newsletterLastMonth),
      },
      premiumUsers: {
        ...baseMetrics.premiumUsers,
        thisWeek: premiumThisMonth,
        lastWeek: premiumLastMonth,
        ...calculateDelta(premiumThisMonth, premiumLastMonth),
      },
      apiKeys: {
        ...baseMetrics.apiKeys,
        thisWeek: apiKeysThisMonth,
        lastWeek: apiKeysLastMonth,
        ...calculateDelta(apiKeysThisMonth, apiKeysLastMonth),
      },
      partnerLeads: {
        ...baseMetrics.partnerLeads,
        thisWeek: partnerLeadsThisMonth,
        lastWeek: partnerLeadsLastMonth,
        ...calculateDelta(partnerLeadsThisMonth, partnerLeadsLastMonth),
      },
      watchlists: {
        ...baseMetrics.watchlists,
        thisWeek: watchlistsThisMonth,
        lastWeek: watchlistsLastMonth,
        ...calculateDelta(watchlistsThisMonth, watchlistsLastMonth),
      },
    },
    lastMonth: baseMetrics, // Simplified - in production would fetch actual last month
  };
}

