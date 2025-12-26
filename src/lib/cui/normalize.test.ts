/**
 * PROMPT 54: Tests for CUI normalization
 */

import { describe, it, expect } from "vitest";
import { normalizeCui, isValidCuiFormat, formatCuiForDisplay } from "./normalize";

describe("normalizeCui", () => {
  it("should normalize RO prefix format", () => {
    expect(normalizeCui("RO12345678")).toBe("12345678");
    expect(normalizeCui("ro12345678")).toBe("12345678");
    expect(normalizeCui("Ro12345678")).toBe("12345678");
  });

  it("should normalize digits-only format", () => {
    expect(normalizeCui("12345678")).toBe("12345678");
    expect(normalizeCui("1234")).toBe("1234");
  });

  it("should remove spaces", () => {
    expect(normalizeCui("1234 5678")).toBe("12345678");
    expect(normalizeCui("12 34 56 78")).toBe("12345678");
  });

  it("should remove dots", () => {
    expect(normalizeCui("1234.5678")).toBe("12345678");
    expect(normalizeCui("12.34.56.78")).toBe("12345678");
  });

  it("should remove dashes and other non-digits", () => {
    expect(normalizeCui("1234-5678")).toBe("12345678");
    expect(normalizeCui("1234/5678")).toBe("12345678");
  });

  it("should return null for invalid inputs", () => {
    expect(normalizeCui("")).toBeNull();
    expect(normalizeCui(null)).toBeNull();
    expect(normalizeCui(undefined)).toBeNull();
    expect(normalizeCui("RO")).toBeNull(); // No digits after RO
    expect(normalizeCui("ABC")).toBeNull(); // No digits
    expect(normalizeCui("1")).toBeNull(); // Too short
    expect(normalizeCui("12345678901")).toBeNull(); // Too long (> 10 digits)
    expect(normalizeCui("11111111")).toBeNull(); // All same digit
  });

  it("should handle edge cases", () => {
    expect(normalizeCui("  RO12345678  ")).toBe("12345678"); // Trim whitespace
    expect(normalizeCui("RO 1234 5678")).toBe("12345678"); // Spaces after RO
  });
});

describe("isValidCuiFormat", () => {
  it("should accept valid CUIs", () => {
    expect(isValidCuiFormat("12345678")).toBe(true);
    expect(isValidCuiFormat("12")).toBe(true);
    expect(isValidCuiFormat("1234567890")).toBe(true); // Max length
  });

  it("should reject too short", () => {
    expect(isValidCuiFormat("1")).toBe(false);
    expect(isValidCuiFormat("")).toBe(false);
  });

  it("should reject too long", () => {
    expect(isValidCuiFormat("12345678901")).toBe(false); // > 10 digits
  });

  it("should reject all same digits", () => {
    expect(isValidCuiFormat("11111111")).toBe(false);
    expect(isValidCuiFormat("2222")).toBe(false);
    expect(isValidCuiFormat("00000000")).toBe(false);
  });

  it("should reject non-digits", () => {
    expect(isValidCuiFormat("1234ABCD")).toBe(false);
    expect(isValidCuiFormat("12-34")).toBe(false);
  });

  it("should reject null/undefined", () => {
    expect(isValidCuiFormat(null as unknown as string)).toBe(false);
    expect(isValidCuiFormat(undefined as unknown as string)).toBe(false);
  });
});

describe("formatCuiForDisplay", () => {
  it("should add RO prefix", () => {
    expect(formatCuiForDisplay("12345678")).toBe("RO12345678");
    expect(formatCuiForDisplay("12")).toBe("RO12");
  });

  it("should handle null/empty", () => {
    expect(formatCuiForDisplay(null)).toBe("");
    expect(formatCuiForDisplay("")).toBe("");
  });
});

