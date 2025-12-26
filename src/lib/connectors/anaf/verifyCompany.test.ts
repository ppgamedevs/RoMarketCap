/**
 * Tests for ANAF verification connector
 * 
 * PROMPT 52: Unit tests for parser/normalizer
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyCompany } from "./verifyCompany";
import * as anafInternal from "@/src/lib/verification/anaf";

// Mock the internal verification function
vi.mock("@/src/lib/verification/anaf", () => ({
  verifyCompanyANAF: vi.fn(),
}));

describe("verifyCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return normalized result for valid CUI", async () => {
    const mockResult = {
      isActive: true,
      isVatRegistered: true,
      lastReportedYear: 2023,
      verifiedAt: new Date("2024-01-01"),
      rawResponse: {
        denumire: "Test Company SRL",
        valid: true,
        tva: true,
      },
      verificationStatus: "SUCCESS" as const,
    };

    vi.mocked(anafInternal.verifyCompanyANAF).mockResolvedValue(mockResult);

    const result = await verifyCompany("RO12345678");

    expect(result).toEqual({
      cui: "RO12345678",
      officialName: "Test Company SRL",
      isActive: true,
      vatRegistered: true,
      source: "ANAF",
      verifiedAt: new Date("2024-01-01"),
    });
  });

  it("should return minimal result for invalid CUI", async () => {
    const result = await verifyCompany("INVALID");

    expect(result).toEqual({
      cui: "INVALID",
      source: "ANAF",
      verifiedAt: expect.any(Date),
    });
    expect(result.officialName).toBeUndefined();
    expect(result.isActive).toBeUndefined();
    expect(result.vatRegistered).toBeUndefined();
  });

  it("should return minimal result when verification fails", async () => {
    const mockResult = {
      isActive: false,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date("2024-01-01"),
      rawResponse: null,
      errorMessage: "API error",
      verificationStatus: "ERROR" as const,
    };

    vi.mocked(anafInternal.verifyCompanyANAF).mockResolvedValue(mockResult);

    const result = await verifyCompany("RO12345678");

    expect(result).toEqual({
      cui: "RO12345678",
      source: "ANAF",
      verifiedAt: new Date("2024-01-01"),
    });
    expect(result.isActive).toBeUndefined();
    expect(result.vatRegistered).toBeUndefined();
  });

  it("should not throw on error", async () => {
    vi.mocked(anafInternal.verifyCompanyANAF).mockRejectedValue(new Error("Network error"));

    const result = await verifyCompany("RO12345678");

    expect(result).toEqual({
      cui: "RO12345678",
      source: "ANAF",
      verifiedAt: expect.any(Date),
    });
  });

  it("should extract official name from various response formats", async () => {
    const testCases = [
      { denumire: "Company A", expected: "Company A" },
      { denumireCompleta: "Company B", expected: "Company B" },
      { denumireComplet: "Company C", expected: "Company C" },
      { nume: "Company D", expected: "Company D" },
      { other: "Company E", expected: undefined },
    ];

    for (const testCase of testCases) {
      const mockResult = {
        isActive: true,
        isVatRegistered: false,
        lastReportedYear: null,
        verifiedAt: new Date("2024-01-01"),
        rawResponse: testCase,
        verificationStatus: "SUCCESS" as const,
      };

      vi.mocked(anafInternal.verifyCompanyANAF).mockResolvedValue(mockResult);

      const result = await verifyCompany("RO12345678");

      if (testCase.expected) {
        expect(result.officialName).toBe(testCase.expected);
      } else {
        expect(result.officialName).toBeUndefined();
      }
    }
  });
});

