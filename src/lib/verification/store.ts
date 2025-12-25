/**
 * Store and retrieve ANAF verification results
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { ANAFVerificationResult } from "./anaf";

const prisma = new PrismaClient();

/**
 * Store verification result in database
 */
export async function storeVerification(
  companyId: string,
  result: ANAFVerificationResult,
): Promise<{ created: boolean; updated: boolean }> {
  const existing = await prisma.companyVerification.findUnique({
    where: { companyId },
  });

  const data: Prisma.CompanyVerificationUpsertArgs["create"] = {
    companyId,
    isActive: result.isActive,
    isVatRegistered: result.isVatRegistered,
    lastReportedYear: result.lastReportedYear,
    verifiedAt: result.verifiedAt,
    source: "ANAF",
    rawResponse: result.rawResponse as Prisma.InputJsonValue,
    errorMessage: result.errorMessage || null,
    verificationStatus: result.verificationStatus,
  };

  if (existing) {
    await prisma.companyVerification.update({
      where: { companyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return { created: false, updated: true };
  }

  await prisma.companyVerification.create({
    data,
  });
  return { created: true, updated: false };
}

/**
 * Get verification for a company
 */
export async function getVerification(companyId: string) {
  return prisma.companyVerification.findUnique({
    where: { companyId },
  });
}

/**
 * Get companies needing verification
 * - Missing verification OR
 * - Verification older than TTL
 */
export async function getCompaniesNeedingVerification(
  limit: number,
  cursor: string | null,
  ttlDays: number = 90,
): Promise<Array<{ id: string; cui: string | null }>> {
  const ttlDate = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

  const where: Prisma.CompanyWhereInput = {
    cui: { not: null },
    isPublic: true,
    visibilityStatus: "PUBLIC",
    OR: [
      { verification: null }, // Missing verification
      { verification: { verifiedAt: { lt: ttlDate } } }, // Stale verification
    ],
  };

  return prisma.company.findMany({
    where,
    select: { id: true, cui: true },
    orderBy: { id: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

