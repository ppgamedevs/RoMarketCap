/**
 * PROMPT 57: Tests for skeleton company creation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { upsertSkeletonCompany, checkSkeletonPromotion } from "./skeleton";
import { prisma } from "@/src/lib/db";
import type { SkeletonCompanyInput } from "./types";

describe("upsertSkeletonCompany", () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.company.deleteMany({ where: { cui: { startsWith: "TEST" } } });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.company.deleteMany({ where: { cui: { startsWith: "TEST" } } });
  });

  it("should create a skeleton company with minimal data", async () => {
    const input: SkeletonCompanyInput = {
      cui: "12345678",
      legalName: "Test Company SRL",
      countySlug: "bucuresti",
      caenCode: "6201",
      universeSource: "SEAP",
      universeConfidence: 60,
      universeVerified: false,
    };

    const result = await upsertSkeletonCompany(input);

    expect(result.created).toBe(true);
    expect(result.isSkeleton).toBe(true);

    const company = await prisma.company.findUnique({
      where: { id: result.companyId },
    });

    expect(company).toBeTruthy();
    expect(company?.isSkeleton).toBe(true);
    expect(company?.universeSource).toBe("SEAP");
    expect(company?.universeConfidence).toBe(60);
    expect(company?.revenueLatest).toBeNull();
    expect(company?.romcAiScore).toBeNull();
  });

  it("should not overwrite existing active company", async () => {
    // Create active company first
    const activeCompany = await prisma.company.create({
      data: {
        slug: "test-company-srl",
        name: "Test Company",
        legalName: "Test Company SRL",
        cui: "12345678",
        isSkeleton: false,
        romcAiScore: 75,
        revenueLatest: 1000000,
      },
    });

    const input: SkeletonCompanyInput = {
      cui: "12345678",
      legalName: "Test Company SRL",
      universeSource: "SEAP",
      universeConfidence: 60,
    };

    const result = await upsertSkeletonCompany(input);

    expect(result.created).toBe(false);
    expect(result.isSkeleton).toBe(false); // Should remain active

    const company = await prisma.company.findUnique({
      where: { id: activeCompany.id },
    });

    expect(company?.isSkeleton).toBe(false); // Should not downgrade
    expect(company?.romcAiScore).toBe(75); // Should preserve data
  });
});

describe("checkSkeletonPromotion", () => {
  it("should promote skeleton when financials added", async () => {
    const skeleton = await prisma.company.create({
      data: {
        slug: "test-skeleton",
        name: "Test Skeleton",
        legalName: "Test Skeleton SRL",
        cui: "87654321",
        isSkeleton: true,
        revenueLatest: null,
      },
    });

    // Add financials
    await prisma.company.update({
      where: { id: skeleton.id },
      data: { revenueLatest: 500000 },
    });

    const promoted = await checkSkeletonPromotion(skeleton.id);
    expect(promoted).toBe(true);

    const updated = await prisma.company.findUnique({
      where: { id: skeleton.id },
    });
    expect(updated?.isSkeleton).toBe(false);
  });

  it("should not promote if still minimal", async () => {
    const skeleton = await prisma.company.create({
      data: {
        slug: "test-skeleton-2",
        name: "Test Skeleton 2",
        legalName: "Test Skeleton 2 SRL",
        cui: "87654322",
        isSkeleton: true,
        revenueLatest: null,
        employees: null,
        lastEnrichedAt: null,
        isClaimed: false,
        romcAiScore: null,
      },
    });

    const promoted = await checkSkeletonPromotion(skeleton.id);
    expect(promoted).toBe(false);

    const updated = await prisma.company.findUnique({
      where: { id: skeleton.id },
    });
    expect(updated?.isSkeleton).toBe(true);
  });
});

