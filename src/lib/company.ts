import { cache } from "react";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";

const companyWithCoreRelationsArgs = Prisma.validator<Prisma.CompanyDefaultArgs>()({
  include: {
    financials: { orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }], take: 1 },
    scores: {
      where: { scoreType: "ROMC_SCORE" },
      orderBy: [{ calculatedAt: "desc" }],
      take: 1,
    },
    valuations: { orderBy: [{ calculatedAt: "desc" }], take: 1 },
    signals: { orderBy: [{ detectedAt: "desc" }], take: 5 },
  },
});

export type CompanyWithCoreRelations = Prisma.CompanyGetPayload<typeof companyWithCoreRelationsArgs>;

export const getCompanyBySlug = cache(async (slug: string): Promise<CompanyWithCoreRelations | null> => {
  // Try to find by slug or canonicalSlug
  return prisma.company.findFirst({
    where: {
      OR: [{ slug }, { canonicalSlug: slug }],
    },
    ...companyWithCoreRelationsArgs,
  });
});

export async function getCompanyBySlugOrThrow(slug: string) {
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  return company;
}


