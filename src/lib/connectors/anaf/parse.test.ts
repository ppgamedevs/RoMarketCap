/**
 * PROMPT 59: Unit tests for ANAF response parser
 */

import { describe, it, expect } from "vitest";
import { parseANAFResponse } from "./parse";

describe("parseANAFResponse", () => {
  describe("Payload variations", () => {
    it("1) should parse standard payload with all fields", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        profit: 100000,
        angajati: 50,
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].year).toBe(2023);
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].profit).toBe(100000);
      expect(result[0].employees).toBe(50);
      expect(result[0].currency).toBe("RON");
      expect(result[0].confidence).toBe(100);
    });

    it("2) should handle missing employees field", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        profit: 100000,
        // employees missing
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].profit).toBe(100000);
      expect(result[0].employees).toBeNull();
      expect(result[0].confidence).toBe(70); // revenue (40) + profit (30)
    });

    it("3) should handle employees as string", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        profit: 100000,
        angajati: "50", // string instead of number
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].employees).toBe(50);
      expect(result[0].confidence).toBe(100);
    });

    it("4) should handle missing revenue and profit", () => {
      const payload = {
        an: 2023,
        // revenue missing
        // profit missing
        angajati: 50,
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBeNull();
      expect(result[0].profit).toBeNull();
      expect(result[0].employees).toBe(50);
      expect(result[0].confidence).toBe(30); // only employees
    });

    it("5) should handle different key casing (camelCase)", () => {
      const payload = {
        year: 2023,
        cifraAfaceri: 1000000,
        profitNet: 100000,
        numAngajati: 50,
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].year).toBe(2023);
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].profit).toBe(100000);
      expect(result[0].employees).toBe(50);
    });

    it("6) should handle different field name variations (venituri, CA)", () => {
      const payload = {
        an: 2023,
        venituri: 1000000, // alternative to cifra_afaceri
        pierdere: -50000, // negative profit (loss)
        numar_angajati: 50,
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].profit).toBe(-50000); // can be negative
      expect(result[0].employees).toBe(50);
    });

    it("7) should handle uppercase field names (CA)", () => {
      const payload = {
        an: 2023,
        CA: 1000000, // uppercase
        profit: 100000,
        employees: 50, // English
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].profit).toBe(100000);
      expect(result[0].employees).toBe(50);
    });

    it("8) should handle multiple years in array", () => {
      const payload = {
        situatii_financiare: [
          { an: 2023, cifra_afaceri: 1000000, profit: 100000, angajati: 50 },
          { an: 2022, cifra_afaceri: 900000, profit: 90000, angajati: 45 },
        ],
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(2);
      expect(result[0].year).toBe(2023);
      expect(result[1].year).toBe(2022);
    });

    it("9) should handle numeric values as strings with formatting", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: "1,000,000.50", // formatted string
        profit: "100,000",
        angajati: "50",
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBe(1000000.5);
      expect(result[0].profit).toBe(100000);
      expect(result[0].employees).toBe(50);
    });

    it("10) should clamp absurd values", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1e15, // way too large
        profit: -1e15, // way too negative
        angajati: 1e10, // way too many employees
      };

      const result = parseANAFResponse(payload);

      expect(result.length).toBe(1);
      expect(result[0].revenue).toBe(1e12); // clamped to max
      expect(result[0].profit).toBe(-1e12); // clamped to min
      expect(result[0].employees).toBe(1e6); // clamped to max
    });
  });

  describe("Error cases", () => {
    it("should throw when response is not an object", () => {
      expect(() => parseANAFResponse(null)).toThrow("Invalid response");
      expect(() => parseANAFResponse("string")).toThrow("Invalid response");
      expect(() => parseANAFResponse(123)).toThrow("Invalid response");
    });

    it("should throw when no financial data found", () => {
      const payload = {
        an: 2023,
        // no financial fields
      };

      expect(() => parseANAFResponse(payload)).toThrow("No financial data found");
    });

    it("should handle invalid year values", () => {
      const payload = {
        an: 1800, // too old
        cifra_afaceri: 1000000,
        profit: 100000,
        angajati: 50,
      };

      // Should default to last year if year is invalid
      const result = parseANAFResponse(payload);
      expect(result.length).toBe(1);
      // Year should be defaulted (current year - 1) or clamped
      expect(result[0].year).toBeGreaterThanOrEqual(1900);
    });
  });

  describe("Confidence scoring", () => {
    it("should compute confidence correctly for all fields", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        profit: 100000,
        angajati: 50,
      };

      const result = parseANAFResponse(payload);
      expect(result[0].confidence).toBe(100);
    });

    it("should compute confidence correctly for partial data", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        // profit missing
        // employees missing
      };

      const result = parseANAFResponse(payload);
      expect(result[0].confidence).toBe(40); // only revenue
    });

    it("should compute confidence correctly for revenue + employees only", () => {
      const payload = {
        an: 2023,
        cifra_afaceri: 1000000,
        // profit missing
        angajati: 50,
      };

      const result = parseANAFResponse(payload);
      expect(result[0].confidence).toBe(70); // revenue (40) + employees (30)
    });
  });
});

