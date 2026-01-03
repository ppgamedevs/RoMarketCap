/**
 * Context Builder for ROMC AI
 * 
 * Builds context from current page data to provide to AI assistant
 */

import { prisma } from "@/src/lib/db";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";

export type AIContext = {
  page?: "company" | "industry" | "market" | "homepage" | "compare";
  companySlug?: string;
  companyName?: string;
  industrySlug?: string;
  countySlug?: string;
};

export async function buildAIContext(context: AIContext): Promise<any> {
  const result: any = {};

  // Company context
  if (context.companySlug) {
    try {
      const company = await getCompanyBySlugOrThrow(context.companySlug);
      result.company = {
        name: company.name,
        cui: company.cui,
        romcScore: company.romcScore,
        revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
        profitLatest: company.profitLatest ? Number(company.profitLatest) : null,
        employees: company.employees,
        industry: company.industry,
        industrySlug: company.industrySlug,
        county: company.county,
        countySlug: company.countySlug,
        marketCap: company.marketCap ? Number(company.marketCap) : null,
        dataConfidence: company.dataConfidence,
        isListed: company.isListed,
        stockSymbol: company.stockSymbol,
      };
    } catch {
      // Company not found, ignore
    }
  }

  // Industry context
  if (context.industrySlug) {
    const industryStats = await prisma.company.aggregate({
      where: {
        industrySlug: context.industrySlug,
        isPublic: true,
        visibilityStatus: "PUBLIC",
      },
      _count: true,
      _avg: { romcScore: true },
      _sum: { marketCap: true },
    });

    const topCompanies = await prisma.company.findMany({
      where: {
        industrySlug: context.industrySlug,
        isPublic: true,
        visibilityStatus: "PUBLIC",
        romcScore: { not: null },
      },
      orderBy: { romcScore: "desc" },
      take: 5,
      select: {
        name: true,
        slug: true,
        romcScore: true,
        marketCap: true,
      },
    });

    result.industry = {
      slug: context.industrySlug,
      totalCompanies: industryStats._count,
      avgScore: industryStats._avg.romcScore,
      totalMarketCap: industryStats._sum.marketCap ? Number(industryStats._sum.marketCap) : null,
      topCompanies: topCompanies.map((c) => ({
        name: c.name,
        slug: c.slug,
        romcScore: c.romcScore,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
      })),
    };
  }

  // County context
  if (context.countySlug) {
    const countyStats = await prisma.company.aggregate({
      where: {
        countySlug: context.countySlug,
        isPublic: true,
        visibilityStatus: "PUBLIC",
      },
      _count: true,
      _avg: { romcScore: true },
    });

    result.county = {
      slug: context.countySlug,
      totalCompanies: countyStats._count,
      avgScore: countyStats._avg.romcScore,
    };
  }

  // Market context (homepage/market page)
  if (context.page === "market" || context.page === "homepage") {
    const marketStats = await prisma.company.aggregate({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
      },
      _count: true,
      _avg: { romcScore: true },
      _sum: { marketCap: true },
    });

    result.market = {
      totalCompanies: marketStats._count,
      avgScore: marketStats._avg.romcScore,
      totalMarketCap: marketStats._sum.marketCap ? Number(marketStats._sum.marketCap) : null,
    };
  }

  return result;
}
