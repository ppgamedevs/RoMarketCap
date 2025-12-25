import { describe, it, expect } from "vitest";
import { isValidCUI, normalizeCUI, formatCUI } from "./cuiValidation";

describe("CUI Validation", () => {
  describe("isValidCUI", () => {
    it("should validate correct CUIs", () => {
      expect(isValidCUI("RO12345678")).toBe(true);
      expect(isValidCUI("12345678")).toBe(true);
      expect(isValidCUI("RO12")).toBe(true);
      expect(isValidCUI("12")).toBe(true);
    });

    it("should reject invalid CUIs", () => {
      expect(isValidCUI("")).toBe(false);
      expect(isValidCUI("1")).toBe(false); // Too short
      expect(isValidCUI("RO1234567890123")).toBe(false); // Too long
      expect(isValidCUI("ABC123")).toBe(false); // Invalid format
      expect(isValidCUI(null)).toBe(false);
      expect(isValidCUI(undefined)).toBe(false);
    });
  });

  describe("normalizeCUI", () => {
    it("should normalize CUIs correctly", () => {
      expect(normalizeCUI("RO12345678")).toBe("12345678");
      expect(normalizeCUI("12345678")).toBe("12345678");
      expect(normalizeCUI("ro12345678")).toBe("12345678");
      expect(normalizeCUI("  RO12345678  ")).toBe("12345678");
    });

    it("should return null for invalid CUIs", () => {
      expect(normalizeCUI("")).toBe(null);
      expect(normalizeCUI("ABC123")).toBe(null);
      expect(normalizeCUI(null)).toBe(null);
      expect(normalizeCUI(undefined)).toBe(null);
    });
  });

  describe("formatCUI", () => {
    it("should format CUIs with RO prefix", () => {
      expect(formatCUI("RO12345678")).toBe("RO12345678");
      expect(formatCUI("12345678")).toBe("RO12345678");
      expect(formatCUI("ro12345678")).toBe("RO12345678");
    });

    it("should return null for invalid CUIs", () => {
      expect(formatCUI("")).toBe(null);
      expect(formatCUI("ABC123")).toBe(null);
      expect(formatCUI(null)).toBe(null);
    });
  });
});

