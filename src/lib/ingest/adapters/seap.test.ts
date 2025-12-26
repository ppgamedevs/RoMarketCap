/**
 * PROMPT 54: Tests for SEAP adapter
 */

import { describe, it, expect } from "vitest";
import { SEAPAdapter } from "./seap";

describe("SEAPAdapter", () => {
  it("should extract CUI from various column names", async () => {
    const adapter = new SEAPAdapter();

    // Mock CSV data
    const csvData = `CUI,Denumire Furnizor,Valoare
RO12345678,Test Company SRL,100000
23456789,Another Company,200000`;

    // Mock fetch
    global.fetch = async () => {
      return new Response(csvData, {
        headers: { "Content-Type": "text/csv" },
      });
    };

    process.env.SEAP_CSV_URL = "http://example.com/seap.csv";

    const records: Array<{ cui: string }> = [];
    for await (const record of adapter.discover({ limit: 10 })) {
      records.push(record);
    }

    expect(records.length).toBeGreaterThan(0);
    expect(records[0]?.cui).toBe("12345678");
  });

  it("should handle missing CUI gracefully", async () => {
    const adapter = new SEAPAdapter();

    const csvData = `Denumire Furnizor,Valoare
Test Company SRL,100000`;

    global.fetch = async () => {
      return new Response(csvData, {
        headers: { "Content-Type": "text/csv" },
      });
    };

    process.env.SEAP_CSV_URL = "http://example.com/seap.csv";

    const records: Array<{ cui: string }> = [];
    for await (const record of adapter.discover({ limit: 10 })) {
      records.push(record);
    }

    // Should skip rows without CUI
    expect(records.length).toBe(0);
  });
});

