/**
 * Generate industry-specific content for SEO
 * 
 * Creates rich, data-driven content for industry pages
 */

import { prisma } from "@/src/lib/db";

export type IndustryContentData = {
  marketOverview?: string;
  keyTrends?: string;
  topPerformersAnalysis?: string;
  regionalDistribution?: string;
  growthOpportunities?: string;
};

/**
 * Generate market overview for an industry
 */
export async function generateIndustryMarketOverview(
  industrySlug: string,
  industryData: {
    totalCompanies: number;
    avgScore: number;
    totalRevenue: number;
    topCompanies: Array<{ name: string; score: number; revenue: number | null }>;
  }
): Promise<string> {
  // Check cache
  const cached = await prisma.industryContentCache.findUnique({
    where: { industrySlug },
    select: { marketOverview: true, generatedAt: true },
  });

  if (cached?.marketOverview && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.marketOverview;
    }
  }

  // Generate content
  const content = generateMarketOverviewText(industrySlug, industryData);

  // Cache it
  await prisma.industryContentCache.upsert({
    where: { industrySlug },
    create: {
      industrySlug,
      marketOverview: content,
    },
    update: {
      marketOverview: content,
    },
  });

  return content;
}

/**
 * Generate key trends for an industry
 */
export async function generateIndustryKeyTrends(
  industrySlug: string,
  trendsData: {
    growingCompanies: number;
    decliningCompanies: number;
    avgScoreChange: number;
  }
): Promise<string> {
  const cached = await prisma.industryContentCache.findUnique({
    where: { industrySlug },
    select: { keyTrends: true, generatedAt: true },
  });

  if (cached?.keyTrends && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.keyTrends;
    }
  }

  const content = generateKeyTrendsText(industrySlug, trendsData);

  await prisma.industryContentCache.upsert({
    where: { industrySlug },
    create: {
      industrySlug,
      keyTrends: content,
    },
    update: {
      keyTrends: content,
    },
  });

  return content;
}

/**
 * Generate top performers analysis
 */
export async function generateTopPerformersAnalysis(
  industrySlug: string,
  topCompanies: Array<{ name: string; score: number; revenue: number | null; marketCap: number | null }>
): Promise<string> {
  const cached = await prisma.industryContentCache.findUnique({
    where: { industrySlug },
    select: { topPerformersAnalysis: true, generatedAt: true },
  });

  if (cached?.topPerformersAnalysis && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.topPerformersAnalysis;
    }
  }

  const content = generateTopPerformersText(industrySlug, topCompanies);

  await prisma.industryContentCache.upsert({
    where: { industrySlug },
    create: {
      industrySlug,
      topPerformersAnalysis: content,
    },
    update: {
      topPerformersAnalysis: content,
    },
  });

  return content;
}

/**
 * Generate regional distribution analysis
 */
export async function generateRegionalDistribution(
  industrySlug: string,
  distribution: Array<{ county: string; count: number; avgScore: number }>
): Promise<string> {
  const cached = await prisma.industryContentCache.findUnique({
    where: { industrySlug },
    select: { regionalDistribution: true, generatedAt: true },
  });

  if (cached?.regionalDistribution && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.regionalDistribution;
    }
  }

  const content = generateRegionalDistributionText(industrySlug, distribution);

  await prisma.industryContentCache.upsert({
    where: { industrySlug },
    create: {
      industrySlug,
      regionalDistribution: content,
    },
    update: {
      regionalDistribution: content,
    },
  });

  return content;
}

/**
 * Generate growth opportunities analysis
 */
export async function generateGrowthOpportunities(
  industrySlug: string,
  opportunitiesData: {
    emergingCompanies: number;
    highGrowthCompanies: number;
    marketGaps: string[];
  }
): Promise<string> {
  const cached = await prisma.industryContentCache.findUnique({
    where: { industrySlug },
    select: { growthOpportunities: true, generatedAt: true },
  });

  if (cached?.growthOpportunities && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.growthOpportunities;
    }
  }

  const content = generateGrowthOpportunitiesText(industrySlug, opportunitiesData);

  await prisma.industryContentCache.upsert({
    where: { industrySlug },
    create: {
      industrySlug,
      growthOpportunities: content,
    },
    update: {
      growthOpportunities: content,
    },
  });

  return content;
}

// Template-based generation functions

function generateMarketOverviewText(
  industrySlug: string,
  data: {
    totalCompanies: number;
    avgScore: number;
    totalRevenue: number;
    topCompanies: Array<{ name: string; score: number; revenue: number | null }>;
  }
): string {
  let text = `Industria ${industrySlug} în România cuprinde ${data.totalCompanies} companii, `;
  text += `cu un scor ROMC mediu de ${data.avgScore}/100. `;

  if (data.totalRevenue > 0) {
    const revenueFormatted = new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(data.totalRevenue);
    text += `Veniturile totale estimate ale industriei sunt de ${revenueFormatted}. `;
  }

  if (data.topCompanies.length > 0) {
    const topCompany = data.topCompanies[0];
    text += `Liderul industriei este ${topCompany.name}, cu un scor ROMC de ${topCompany.score}/100. `;
  }

  text += "Aceste date sunt estimate și doar informaționale.";

  return text;
}

function generateKeyTrendsText(
  industrySlug: string,
  data: {
    growingCompanies: number;
    decliningCompanies: number;
    avgScoreChange: number;
  }
): string {
  let text = `Tendințele din industria ${industrySlug} arată `;

  if (data.avgScoreChange > 0) {
    text += `o creștere medie a scorului ROMC cu ${data.avgScoreChange.toFixed(1)} puncte, `;
    text += `indicând o evoluție pozitivă a sectorului. `;
  } else if (data.avgScoreChange < 0) {
    text += `o scădere medie a scorului ROMC cu ${Math.abs(data.avgScoreChange).toFixed(1)} puncte. `;
  } else {
    text += `o stabilitate în scorurile ROMC. `;
  }

  if (data.growingCompanies > data.decliningCompanies) {
    text += `${data.growingCompanies} companii înregistrează creșteri, comparativ cu ${data.decliningCompanies} care înregistrează scăderi. `;
  }

  text += "Aceste tendințe sunt bazate pe date estimate și doar informaționale.";

  return text;
}

function generateTopPerformersText(
  industrySlug: string,
  companies: Array<{ name: string; score: number; revenue: number | null; marketCap: number | null }>
): string {
  if (companies.length === 0) {
    return `Industria ${industrySlug} nu are încă companii cu date suficiente pentru analiză.`;
  }

  let text = `Liderii industriei ${industrySlug} includ `;

  const top3 = companies.slice(0, 3);
  const names = top3.map((c) => c.name).join(", ");
  text += `${names}. `;

  const topCompany = companies[0];
  text += `${topCompany.name} deține cel mai bun scor ROMC (${topCompany.score}/100)`;

  if (topCompany.marketCap) {
    const marketCapFormatted = new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(topCompany.marketCap);
    text += ` și o capitalizare de piață de ${marketCapFormatted}. `;
  } else {
    text += ". ";
  }

  text += "Aceste informații sunt estimate și doar informaționale.";

  return text;
}

function generateRegionalDistributionText(
  industrySlug: string,
  distribution: Array<{ county: string; count: number; avgScore: number }>
): string {
  if (distribution.length === 0) {
    return `Distribuția regională pentru industria ${industrySlug} nu este încă disponibilă.`;
  }

  let text = `Companiile din industria ${industrySlug} sunt distribuite în `;
  text += `${distribution.length} județe. `;

  const topCounty = distribution[0];
  text += `${topCounty.county} deține cel mai mare număr de companii (${topCounty.count}), `;
  text += `cu un scor ROMC mediu de ${topCounty.avgScore}/100. `;

  if (distribution.length > 1) {
    const otherCounties = distribution.slice(1, 4).map((d) => d.county).join(", ");
    text += `Alte județe importante includ ${otherCounties}. `;
  }

  text += "Datele sunt estimate și doar informaționale.";

  return text;
}

function generateGrowthOpportunitiesText(
  industrySlug: string,
  data: {
    emergingCompanies: number;
    highGrowthCompanies: number;
    marketGaps: string[];
  }
): string {
  let text = `Oportunitățile de creștere în industria ${industrySlug} includ `;

  if (data.highGrowthCompanies > 0) {
    text += `${data.highGrowthCompanies} companii cu creșteri semnificative, `;
  }

  if (data.emergingCompanies > 0) {
    text += `și ${data.emergingCompanies} companii emergente. `;
  }

  if (data.marketGaps.length > 0) {
    text += `Sectoarele cu potențial de dezvoltare includ ${data.marketGaps.slice(0, 3).join(", ")}. `;
  }

  text += "Aceste observații sunt bazate pe date estimate și doar informaționale.";

  return text;
}
