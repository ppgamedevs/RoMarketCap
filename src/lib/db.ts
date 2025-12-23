import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  // Next build can execute module code without DATABASE_URL present.
  // We only construct PrismaClient when a real connection string exists.
  if (!process.env.DATABASE_URL) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL is not set. Configure .env before using Prisma.");
      },
    });
  }

  return new PrismaClient();
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) {
  globalThis.__prisma = prisma;
}


