import { describe, it, expect } from "vitest";
import { parseCsvHeader, parseCsvRow, hashRow, CompanyImportRowSchema } from "./csvStream";

describe("CSV stream parsing", () => {
  it("parses CSV header", () => {
    const header = "name,cui,county,city";
    const map = parseCsvHeader(header);
    expect(map.get("name")).toBe(0);
    expect(map.get("cui")).toBe(1);
    expect(map.get("county")).toBe(2);
    expect(map.get("city")).toBe(3);
  });

  it("normalizes header names", () => {
    const header = "Company Name,CUI Code,County Name";
    const map = parseCsvHeader(header);
    expect(map.get("company_name")).toBe(0);
    expect(map.get("cui_code")).toBe(1);
    expect(map.get("county_name")).toBe(2);
  });

  it("parses CSV row", () => {
    const header = "name,cui,county";
    const headerMap = parseCsvHeader(header);
    const row = "Test Company,12345678,Bucharest";
    const obj = parseCsvRow(row, headerMap);
    expect(obj.name).toBe("Test Company");
    expect(obj.cui).toBe("12345678");
    expect(obj.county).toBe("Bucharest");
  });

  it("hashes row consistently", () => {
    const row1 = { name: "Test", cui: "123" };
    const row2 = { cui: "123", name: "Test" }; // Different order
    const hash1 = hashRow(row1);
    const hash2 = hashRow(row2);
    expect(hash1).toBe(hash2); // Should be same regardless of order
  });

  it("validates company import row", () => {
    const valid = { name: "Test Company", cui: "12345678" };
    const result = CompanyImportRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid company import row", () => {
    const invalid = { name: "" }; // Missing required name
    const result = CompanyImportRowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const minimal = { name: "Test" };
    const result = CompanyImportRowSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

