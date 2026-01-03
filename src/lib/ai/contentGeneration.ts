/**
 * SEO Content Generation (AI-Powered)
 * 
 * Generates rich, SEO-optimized content for company and industry pages.
 * Uses AI when available, falls back to template-based generation.
 */

import { prisma } from "@/src/lib/db";
import type { Company } from "@prisma/client";

export type CompanyContentData = {
  marketPosition?: string;
  growthAnalysis?: string;
  competitiveLandscape?: string;
  industryContext?: string;
  keyInsights?: string[];
};

export type IndustryContentData = {
  marketOverview?: string;
  keyTrends?: string;
  topPerformersAnalysis?: string;
  regionalDistribution?: string;
  growthOpportunities?: string;
};

/**
 * Generate market position analysis for a company
 */
export async function generateCompanyMarketPosition(
  company: Company,
  industryStats?: {
    avgScore: number;
    totalCompanies: number;
    topScore: number;
  }
): Promise<string> {
  // Check cache first
  const cached = await prisma.companyContentCache.findUnique({
    where: { companyId: company.id },
    select: { marketPosition: true, generatedAt: true },
  });

  // Return cached if less than 7 days old
  if (cached?.marketPosition && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.marketPosition;
    }
  }

  // Generate new content
  const content = await generateMarketPositionText(company, industryStats);

  // Cache it
  await prisma.companyContentCache.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      marketPosition: content,
    },
    update: {
      marketPosition: content,
    },
  });

  return content;
}

/**
 * Generate growth analysis for a company
 */
export async function generateGrowthAnalysis(
  company: Company,
  scoreHistory?: Array<{ score: number; date: Date }>
): Promise<string> {
  const cached = await prisma.companyContentCache.findUnique({
    where: { companyId: company.id },
    select: { growthAnalysis: true, generatedAt: true },
  });

  if (cached?.growthAnalysis && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.growthAnalysis;
    }
  }

  const content = await generateGrowthAnalysisText(company, scoreHistory);

  await prisma.companyContentCache.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      growthAnalysis: content,
    },
    update: {
      growthAnalysis: content,
    },
  });

  return content;
}

/**
 * Generate competitive landscape analysis
 */
export async function generateCompetitiveLandscape(
  company: Company,
  competitors: Array<{ name: string; romcScore: number | null; marketCap: number | null }>
): Promise<string> {
  const cached = await prisma.companyContentCache.findUnique({
    where: { companyId: company.id },
    select: { competitiveLandscape: true, generatedAt: true },
  });

  if (cached?.competitiveLandscape && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.competitiveLandscape;
    }
  }

  const content = await generateCompetitiveLandscapeText(company, competitors);

  await prisma.companyContentCache.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      competitiveLandscape: content,
    },
    update: {
      competitiveLandscape: content,
    },
  });

  return content;
}

/**
 * Generate industry context for a company
 */
export async function generateIndustryContext(
  company: Company,
  industryData?: {
    totalCompanies: number;
    avgScore: number;
    topCompanies: Array<{ name: string; score: number }>;
  }
): Promise<string> {
  const cached = await prisma.companyContentCache.findUnique({
    where: { companyId: company.id },
    select: { industryContext: true, generatedAt: true },
  });

  if (cached?.industryContext && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return cached.industryContext;
    }
  }

  const content = await generateIndustryContextText(company, industryData);

  await prisma.companyContentCache.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      industryContext: content,
    },
    update: {
      industryContext: content,
    },
  });

  return content;
}

/**
 * Generate key insights for a company
 */
export async function generateKeyInsights(company: Company): Promise<string[]> {
  const cached = await prisma.companyContentCache.findUnique({
    where: { companyId: company.id },
    select: { keyInsights: true, generatedAt: true },
  });

  if (cached?.keyInsights && cached.generatedAt) {
    const ageDays = (Date.now() - cached.generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7 && Array.isArray(cached.keyInsights)) {
      return cached.keyInsights as string[];
    }
  }

  const insights = await generateKeyInsightsList(company);

  await prisma.companyContentCache.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      keyInsights: insights,
    },
    update: {
      keyInsights: insights,
    },
  });

  return insights;
}

// Template-based generation functions (fallback when AI is not available)

async function generateMarketPositionText(
  company: Company,
  industryStats?: { avgScore: number; totalCompanies: number; topScore: number }
): Promise<string> {
  const score = company.romcScore ?? 0;
  const industry = company.industry || "sectorul său";
  const revenue = company.revenueLatest ? Number(company.revenueLatest) : null;
  const employees = company.employees ?? null;

  let text = `${company.name} este o companie din ${industry}`;

  if (industryStats) {
    const position = score > industryStats.avgScore ? "peste" : "sub";
    text += `, cu un ROMC Score de ${score}/100, situându-se ${position} media industriei (${industryStats.avgScore}/100).`;
  } else {
    text += `, cu un ROMC Score de ${score}/100.`;
  }

  if (revenue && revenue > 0) {
    const revenueFormatted = new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(revenue);
    text += ` Compania raportează venituri de ${revenueFormatted}.`;
  }

  if (employees && employees > 0) {
    text += ` Echipă de ${employees} angajați.`;
  }

  if (company.marketCap) {
    const marketCapFormatted = new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(Number(company.marketCap));
    text += ` Capitalizarea de piață estimată: ${marketCapFormatted}.`;
  }

  text += " Datele sunt estimate și doar informaționale.";

  return text;
}

async function generateGrowthAnalysisText(
  company: Company,
  scoreHistory?: Array<{ score: number; date: Date }>
): Promise<string> {
  const currentScore = company.romcScore ?? 0;
  const previousScore = company.previousRomcAiScore ?? null;
  const scoreDelta = previousScore !== null ? currentScore - previousScore : null;

  let text = `Analiza evoluției pentru ${company.name} arată `;

  if (scoreDelta !== null && scoreDelta > 0) {
    text += `o creștere a scorului ROMC cu ${scoreDelta} puncte, indicând o îmbunătățire a poziției companiei pe piață.`;
  } else if (scoreDelta !== null && scoreDelta < 0) {
    text += `o scădere a scorului ROMC cu ${Math.abs(scoreDelta)} puncte.`;
  } else {
    text += `o stabilitate în scorul ROMC.`;
  }

  if (scoreHistory && scoreHistory.length > 1) {
    const trend = scoreHistory[scoreHistory.length - 1].score - scoreHistory[0].score;
    if (trend > 0) {
      text += ` Tendința pe termen lung este pozitivă, cu o creștere de ${trend} puncte în perioada analizată.`;
    } else if (trend < 0) {
      text += ` Tendința pe termen lung arată o scădere de ${Math.abs(trend)} puncte.`;
    }
  }

  if (company.revenueLatest) {
    const revenue = Number(company.revenueLatest);
    text += ` Veniturile raportate sunt de ${new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(revenue)}.`;
  }

  text += " Aceste date sunt estimate și doar informaționale.";

  return text;
}

async function generateCompetitiveLandscapeText(
  company: Company,
  competitors: Array<{ name: string; romcScore: number | null; marketCap: number | null }>
): Promise<string> {
  const companyScore = company.romcScore ?? 0;
  const sortedCompetitors = competitors
    .filter((c) => c.romcScore !== null)
    .sort((a, b) => (b.romcScore ?? 0) - (a.romcScore ?? 0))
    .slice(0, 3);

  let text = `Peisajul competitiv pentru ${company.name} include `;

  if (sortedCompetitors.length > 0) {
    const competitorNames = sortedCompetitors.map((c) => c.name).join(", ");
    text += `companii precum ${competitorNames}. `;

    const betterCompetitors = sortedCompetitors.filter((c) => (c.romcScore ?? 0) > companyScore);
    const worseCompetitors = sortedCompetitors.filter((c) => (c.romcScore ?? 0) < companyScore);

    if (betterCompetitors.length > 0) {
      text += `Compania se situează după ${betterCompetitors.length} competitor${betterCompetitors.length > 1 ? "i" : ""} cu scoruri mai mari. `;
    }

    if (worseCompetitors.length > 0) {
      text += `În același timp, depășește ${worseCompetitors.length} competitor${worseCompetitors.length > 1 ? "i" : ""} din industrie. `;
    }
  } else {
    text += `companii din aceeași industrie. `;
  }

  if (company.marketCap) {
    const marketCap = Number(company.marketCap);
    const competitorsWithMarketCap = competitors.filter((c) => c.marketCap !== null);
    if (competitorsWithMarketCap.length > 0) {
      const avgCompetitorMarketCap =
        competitorsWithMarketCap.reduce((sum, c) => sum + (Number(c.marketCap) ?? 0), 0) /
        competitorsWithMarketCap.length;

      if (marketCap > avgCompetitorMarketCap) {
        text += `Capitalizarea de piață este peste media competitorilor. `;
      } else {
        text += `Capitalizarea de piață este sub media competitorilor. `;
      }
    }
  }

  text += "Comparațiile sunt bazate pe date estimate și doar informaționale.";

  return text;
}

async function generateIndustryContextText(
  company: Company,
  industryData?: {
    totalCompanies: number;
    avgScore: number;
    topCompanies: Array<{ name: string; score: number }>;
  }
): Promise<string> {
  const industry = company.industry || "industria sa";
  let text = `Industria ${industry} în România `;

  if (industryData) {
    text += `cuprinde aproximativ ${industryData.totalCompanies} companii, `;
    text += `cu un scor ROMC mediu de ${industryData.avgScore}/100. `;

    if (industryData.topCompanies.length > 0) {
      const topCompany = industryData.topCompanies[0];
      text += `Liderul industriei este ${topCompany.name}, cu un scor de ${topCompany.score}/100. `;
    }
  } else {
    text += `reprezintă un sector important al economiei românești. `;
  }

  const companyScore = company.romcScore ?? 0;
  if (industryData && companyScore > industryData.avgScore) {
    text += `${company.name} se situează peste media industriei, indicând o poziție competitivă puternică. `;
  } else if (industryData && companyScore < industryData.avgScore) {
    text += `${company.name} se situează sub media industriei. `;
  }

  if (company.revenueLatest) {
    text += `Compania raportează venituri semnificative, consolidându-și poziția pe piață. `;
  }

  text += "Aceste informații sunt estimate și doar informaționale.";

  return text;
}

async function generateKeyInsightsList(company: Company): Promise<string[]> {
  const insights: string[] = [];

  const score = company.romcScore ?? 0;
  if (score >= 70) {
    insights.push(`Scor ROMC ridicat (${score}/100), indicând o poziție puternică pe piață`);
  } else if (score >= 50) {
    insights.push(`Scor ROMC moderat (${score}/100), cu potențial de creștere`);
  }

  if (company.marketCap) {
    const marketCap = Number(company.marketCap);
    insights.push(`Capitalizare de piață estimată: ${new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(marketCap)}`);
  }

  if (company.revenueLatest) {
    const revenue = Number(company.revenueLatest);
    insights.push(`Venituri raportate: ${new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 0,
    }).format(revenue)}`);
  }

  if (company.employees && company.employees > 0) {
    insights.push(`Echipă de ${company.employees} angajați`);
  }

  if (company.dataConfidence && company.dataConfidence >= 70) {
    insights.push(`Înaltă încredere în date (${company.dataConfidence}%)`);
  }

  if (company.isListed) {
    insights.push(`Listată la Bursa de Valori București`);
  }

  if (insights.length === 0) {
    insights.push(`Companie din ${company.industry || "sectorul său"}`);
    insights.push(`Scor ROMC: ${score}/100`);
  }

  return insights;
}
