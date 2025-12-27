/**
 * PROMPT 61: Unit tests for CUI normalization
 */

import { describe, it, expect } from "vitest";
import { normalizeCUI, validateCui } from "./normalize";

describe("normalizeCUI", () => {
  it("should normalize CUI with RO prefix", () => {
    expect(normalizeCUI("RO12345678")).toBe("12345678");
  });

  it("should normalize CUI without RO prefix", () => {
    expect(normalizeCUI("12345678")).toBe("12345678");
  });

  it("should handle lowercase", () => {
    expect(normalizeCUI("ro12345678")).toBe("12345678");
  });

  it("should return null for invalid CUI", () => {
    expect(normalizeCUI("invalid")).toBeNull();
    expect(normalizeCUI("")).toBeNull();
    expect(normalizeCUI(null)).toBeNull();
    expect(normalizeCUI(undefined)).toBeNull();
  });
});

describe("validateCui", () => {
  it("should validate correct CUIs", () => {
    expect(validateCui("12345678")).toBe(true);
    expect(validateCui("RO12345678")).toBe(true);
  });

  it("should reject invalid CUIs", () => {
    expect(validateCui("invalid")).toBe(false);
    expect(validateCui("")).toBe(false);
    expect(validateCui(null)).toBe(false);
  });
});

