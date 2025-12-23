import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { CompanyChangeType } from "@prisma/client";

type LogCompanyChangeInput = {
  companyId: string;
  changeType: CompanyChangeType;
  metadata?: Record<string, unknown>;
};

export async function logCompanyChange(input: LogCompanyChangeInput) {
  try {
    const { companyId, changeType, metadata } = input;
    await prisma.companyChangeLog.create({
      data: {
        companyId,
        changeType,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (e) {
    console.error("Failed to log company change:", e);
  }
}

