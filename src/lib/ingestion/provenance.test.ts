import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashRow, normalizeCUI } from "./provenance";
import { isValidCUI } from "./cuiValidation";

// Note: These are unit tests. Integration tests would require a test database.
describe("Provenance Utilities", () => {
  describe("hashRow", () => {
    it("should create consistent hashes for same input", () => {
      const row1 = { name: "Test", cui: "RO12345678" };
      const row2 = { name: "Test", cui: "RO12345678" };
      expect(hashRow(row1)).toBe(hashRow(row2));
    });

    it("should create different hashes for different input", () => {
      const row1 = { name: "Test", cui: "RO12345678" };
      const row2 = { name: "Test2", cui: "RO12345678" };
      expect(hashRow(row1)).not.toBe(hashRow(row2));
    });

    it("should handle different key orders", () => {
      const row1 = { name: "Test", cui: "RO12345678" };
      const row2 = { cui: "RO12345678", name: "Test" };
      expect(hashRow(row1)).toBe(hashRow(row2));
    });
  });
});

