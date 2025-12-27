/**
 * PROMPT 60: Unit tests for apply merge
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { determineCanonical } from "./applyMerge";

// Mock prisma
vi.mock("@/src/lib/db", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    companyAlias: {
      create: vi.fn(),
    },
    mergeCandidate: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/src/lib/changelog/logChange", () => ({
  logCompanyChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/src/lib/ingestion/provenance", () => ({
  writeFieldProvenance: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/src/lib/db";

const mockPrisma = prisma as {
  company: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  companyAlias: {
    create: ReturnType<typeof vi.fn>;
  };
  mergeCandidate: {
    updateMany: ReturnType<typeof vi.fn>;
  };
};

describe("determineCanonical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should choose company with CUI over company without CUI", async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        cui: "12345678",
        createdAt: new Date("2024-01-01"),
        domain: null,
        revenueLatest: null,
        employees: null,
        lastEnrichedAt: null,
      })
      .mockResolvedValueOnce({
        id: "target-1",
        cui: null,
        createdAt: new Date("2024-01-01"),
        domain: "example.com",
        revenueLatest: 1000000,
        employees: 50,
        lastEnrichedAt: new Date(),
      });

    const result = await determineCanonical("source-1", "target-1");
    expect(result.canonicalId).toBe("source-1");
    expect(result.mergedId).toBe("target-1");
  });

  it("should choose older company when both have CUI", async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        cui: "12345678",
        createdAt: new Date("2023-01-01"),
        domain: null,
        revenueLatest: null,
        employees: null,
        lastEnrichedAt: null,
      })
      .mockResolvedValueOnce({
        id: "target-1",
        cui: "12345678",
        createdAt: new Date("2024-01-01"),
        domain: "example.com",
        revenueLatest: 1000000,
        employees: 50,
        lastEnrichedAt: new Date(),
      });

    const result = await determineCanonical("source-1", "target-1");
    expect(result.canonicalId).toBe("source-1"); // Older
    expect(result.mergedId).toBe("target-1");
  });

  it("should choose company with more data when neither has CUI", async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        cui: null,
        createdAt: new Date("2024-01-01"),
        domain: null,
        revenueLatest: null,
        employees: null,
        lastEnrichedAt: null,
      })
      .mockResolvedValueOnce({
        id: "target-1",
        cui: null,
        createdAt: new Date("2024-01-01"),
        domain: "example.com",
        revenueLatest: 1000000,
        employees: 50,
        lastEnrichedAt: new Date(),
      });

    const result = await determineCanonical("source-1", "target-1");
    expect(result.canonicalId).toBe("target-1"); // More data
    expect(result.mergedId).toBe("source-1");
  });

  it("should choose older company when data completeness is equal", async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        cui: null,
        createdAt: new Date("2023-01-01"),
        domain: "example.com",
        revenueLatest: 1000000,
        employees: 50,
        lastEnrichedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "target-1",
        cui: null,
        createdAt: new Date("2024-01-01"),
        domain: "example.com",
        revenueLatest: 1000000,
        employees: 50,
        lastEnrichedAt: new Date(),
      });

    const result = await determineCanonical("source-1", "target-1");
    expect(result.canonicalId).toBe("source-1"); // Older
    expect(result.mergedId).toBe("target-1");
  });
});

