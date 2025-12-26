/**
 * PROMPT 56: Tests for merge rules
 */

import { describe, it, expect } from "vitest";
import { mergeCompanyPatch } from "./mergeRules";
import type { CurrentCompany, CompanyPatch, PatchMetadata } from "./mergeRules";

describe("mergeCompanyPatch", () => {
  const baseCurrent: CurrentCompany = {
    id: "test-id",
    name: "Existing Company",
    legalName: "Existing Company SRL",
    domain: "existing.com",
    address: "Existing Address",
    countySlug: "bucuresti",
    industrySlug: "tech",
    caenCode: null,
    employees: 50,
    revenueLatest: 1000000,
    profitLatest: 100000,
    descriptionShort: null,
    email: null,
    phone: null,
    website: null,
    socials: null,
    dataConfidence: 60,
    fieldProvenance: null,
    hasApprovedData: false,
  };

  it("should merge high-priority source over low-priority", () => {
    const patch: CompanyPatch = {
      name: "New Name from ANAF",
      domain: "new.com",
    };
    const meta: PatchMetadata = {
      sourceId: "ANAF_VERIFY",
      sourceRef: "anaf-ref",
      confidence: 90,
    };

    const result = mergeCompanyPatch(baseCurrent, patch, meta);

    expect(result.update.name).toBe("New Name from ANAF");
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0]?.field).toBe("name");
    expect(result.changes[0]?.source).toBe("ANAF_VERIFY");
  });

  it("should not overwrite if current has higher priority", () => {
    const currentWithApproved: CurrentCompany = {
      ...baseCurrent,
      hasApprovedData: true,
      name: "Approved Name",
    };

    const patch: CompanyPatch = {
      name: "Name from Third Party",
    };
    const meta: PatchMetadata = {
      sourceId: "THIRD_PARTY",
      sourceRef: "third-party-ref",
      confidence: 50,
    };

    const result = mergeCompanyPatch(currentWithApproved, patch, meta);

    // Should not update name because current has approved data
    expect(result.update.name).toBeUndefined();
  });

  it("should merge empty fields from enrichment", () => {
    const currentEmpty: CurrentCompany = {
      ...baseCurrent,
      descriptionShort: null,
      email: null,
    };

    const patch: CompanyPatch = {
      descriptionShort: "New description",
      email: "new@example.com",
    };
    const meta: PatchMetadata = {
      sourceId: "ENRICHMENT",
      sourceRef: "enrich-ref",
      confidence: 30,
    };

    const result = mergeCompanyPatch(currentEmpty, patch, meta);

    expect(result.update.descriptionShort).toBe("New description");
    expect(result.update.email).toBe("new@example.com");
  });

  it("should not overwrite existing domain with lower priority", () => {
    const patch: CompanyPatch = {
      domain: "lower-priority.com",
    };
    const meta: PatchMetadata = {
      sourceId: "THIRD_PARTY",
      sourceRef: "third-party-ref",
      confidence: 40,
    };

    const result = mergeCompanyPatch(baseCurrent, patch, meta);

    // Should not update domain because current exists and new source has lower priority
    expect(result.update.domain).toBeUndefined();
  });

  it("should record provenance for all changed fields", () => {
    const patch: CompanyPatch = {
      name: "New Name",
      address: "New Address",
    };
    const meta: PatchMetadata = {
      sourceId: "SEAP",
      sourceRef: "seap-ref",
      confidence: 60,
    };

    const result = mergeCompanyPatch(baseCurrent, patch, meta);

    expect(result.provenance["name"]).toBeDefined();
    expect(result.provenance["name"]?.sourceId).toBe("SEAP");
    expect(result.provenance["address"]).toBeDefined();
  });
});

