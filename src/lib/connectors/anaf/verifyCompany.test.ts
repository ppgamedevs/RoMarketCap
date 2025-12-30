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
    // PROMPT 62: companyName is now parsed from date_generale.denumire
    const mockResult = {
      isActive: true,
      isVatRegistered: true,
      lastReportedYear: 2023,
      verifiedAt: new Date("2024-01-01"),
      companyName: "Test Company SRL", // PROMPT 62: Direct from date_generale.denumire
      rawResponse: {
        date_generale: {
          denumire: "Test Company SRL",
          adresa: "Bucharest",
        },
        valid: true,
        tva: true,
      },
      verificationStatus: "SUCCESS" as const,
      endpointUsed: "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva",
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

  it("should extract official name from companyName (PROMPT 62: date_generale.denumire)", async () => {
    // PROMPT 62: companyName is now parsed directly from date_generale.denumire
    const mockResult = {
      isActive: true,
      isVatRegistered: false,
      lastReportedYear: null,
      verifiedAt: new Date("2024-01-01"),
      companyName: "Company from date_generale", // PROMPT 62: Direct from date_generale.denumire
      rawResponse: {
        date_generale: {
          denumire: "Company from date_generale",
        },
      },
      verificationStatus: "SUCCESS" as const,
    };

    vi.mocked(anafInternal.verifyCompanyANAF).mockResolvedValue(mockResult);

    const result = await verifyCompany("RO12345678");

    expect(result.officialName).toBe("Company from date_generale");
  });

  it("should fallback to rawResponse parsing if companyName not set (PROMPT 62: backward compatibility)", async () => {
    // PROMPT 62: Fallback to old format if companyName not set
    const testCases = [
      { date_generale: { denumire: "Company A" }, expected: "Company A" },
      { denumire: "Company B", expected: "Company B" },
      { denumireCompleta: "Company C", expected: "Company C" },
      { denumireComplet: "Company D", expected: "Company D" },
      { nume: "Company E", expected: "Company E" },
      { other: "Company F", expected: undefined },
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

