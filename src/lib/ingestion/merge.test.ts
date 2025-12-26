/**
 * PROMPT 55: Tests for merge and dedupe logic
 */

import { describe, it, expect } from "vitest";
import { normalizeDomain, normalizeName, buildCompanyPatch, mergePatches } from "./merge";
import type { SourceCompanyRecord } from "./types";

describe("normalizeDomain", () => {
  it("should normalize domain correctly", () => {
    expect(normalizeDomain("https://www.example.com")).toBe("example.com");
    expect(normalizeDomain("example.com")).toBe("example.com");
    expect(normalizeDomain("www.example.com")).toBe("example.com");
    expect(normalizeDomain("example.com/path")).toBe("example.com");
  });

  it("should reject generic domains", () => {
    expect(normalizeDomain("gmail.com")).toBeNull();
    expect(normalizeDomain("yahoo.com")).toBeNull();
    expect(normalizeDomain("company.com")).toBeNull();
  });

  it("should reject invalid domains", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("ab")).toBeNull(); // Too short
    expect(normalizeDomain("example com")).toBeNull(); // Has space
  });
});

describe("normalizeName", () => {
  it("should normalize name correctly", () => {
    expect(normalizeName("  Test Company SRL  ")).toBe("test company srl");
    expect(normalizeName("Test   Company")).toBe("test company");
    expect(normalizeName("Test-Company")).toBe("testcompany");
  });

  it("should handle null/undefined", () => {
    expect(normalizeName(null)).toBeNull();
    expect(normalizeName(undefined)).toBeNull();
  });
});

describe("buildCompanyPatch", () => {
  it("should build patch from record", () => {
    const record: SourceCompanyRecord = {
      sourceId: "SEAP",
      sourceRef: "contract-123",
      cui: "12345678",
      name: "Test Company",
      domain: "test.com",
      confidence: 70,
      lastSeenAt: new Date(),
      raw: {},
    };

    const patch = buildCompanyPatch(record);

    expect(patch.cui).toBe("12345678");
    expect(patch.name).toBe("Test Company");
    expect(patch.domain).toBe("test.com");
    expect(patch.provenance?.["cui"]).toBeDefined();
    expect(patch.provenance?.["name"]).toBeDefined();
  });

  it("should skip low confidence fields", () => {
    const record: SourceCompanyRecord = {
      sourceId: "SEAP",
      sourceRef: "contract-123",
      cui: "12345678",
      name: "Test Company",
      confidence: 20, // Below threshold
      lastSeenAt: new Date(),
      raw: {},
    };

    const patch = buildCompanyPatch(record);

    expect(patch.cui).toBe("12345678"); // CUI always included
    expect(patch.name).toBeUndefined(); // Name skipped due to low confidence
  });
});

describe("mergePatches", () => {
  it("should merge patches by priority", () => {
    const patches = [
      { sourceId: "SEAP" as const, patch: { name: "SEAP Name", domain: "seap.com" } },
      { sourceId: "ANAF_VERIFY" as const, patch: { name: "ANAF Name", domain: "anaf.com" } },
    ];

    const merged = mergePatches(patches);

    // ANAF has higher priority
    expect(merged.name).toBe("ANAF Name");
    expect(merged.domain).toBe("anaf.com");
  });

  it("should merge provenance", () => {
    const patches = [
      {
        sourceId: "SEAP" as const,
        patch: {
          name: "SEAP Name",
          provenance: {
            name: { sourceId: "SEAP", sourceRef: "ref1", seenAt: new Date(), confidence: 60 },
          },
        },
      },
      {
        sourceId: "ANAF_VERIFY" as const,
        patch: {
          name: "ANAF Name",
          provenance: {
            name: { sourceId: "ANAF_VERIFY", sourceRef: "ref2", seenAt: new Date(), confidence: 90 },
          },
        },
      },
    ];

    const merged = mergePatches(patches);

    expect(merged.provenance).toBeDefined();
    expect(Object.keys(merged.provenance || {})).toContain("name");
  });
});

