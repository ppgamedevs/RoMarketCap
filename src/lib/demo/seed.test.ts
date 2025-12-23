import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedDemoCompanies, clearDemoCompanies } from "./seed";

// Mock Prisma
vi.mock("@/src/lib/db", () => ({
  prisma: {
    company: {
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/src/lib/slug", () => ({
  slugifyCompanyName: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
}));

describe("Demo Seed Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip seeding if non-demo companies exist", async () => {
    const { prisma } = await import("@/src/lib/db");
    vi.mocked(prisma.company.count).mockResolvedValue(10); // Non-demo companies exist

    const result = await seedDemoCompanies();

    expect(result.created).toBe(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it("should seed demo companies if database is empty", async () => {
    const { prisma } = await import("@/src/lib/db");
    vi.mocked(prisma.company.count).mockResolvedValue(0); // No companies
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "test-id" } as unknown as Awaited<ReturnType<typeof prisma.company.create>>);

    const result = await seedDemoCompanies();

    expect(result.created).toBeGreaterThan(0);
    expect(prisma.company.create).toHaveBeenCalled();
  });

  it("should clear demo companies", async () => {
    const { prisma } = await import("@/src/lib/db");
    vi.mocked(prisma.company.deleteMany).mockResolvedValue({ count: 5 } as unknown as Awaited<ReturnType<typeof prisma.company.deleteMany>>);

    const result = await clearDemoCompanies();

    expect(result.deleted).toBe(5);
    expect(prisma.company.deleteMany).toHaveBeenCalledWith({
      where: { isDemo: true },
    });
  });
});

