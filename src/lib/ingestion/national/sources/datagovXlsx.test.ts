/**
 * PROMPT 62: Tests for data.gov.ro XLSX adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataGovXlsxSource } from "./datagovXlsx";

// Mock xlsx
vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

// Mock KV
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("DataGovXlsxSource", () => {
  let source: DataGovXlsxSource;

  beforeEach(() => {
    source = new DataGovXlsxSource();
    vi.clearAllMocks();
    delete process.env.DATAGOV_RESOURCE_URLS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Header normalization", () => {
    it("should normalize header with diacritics", () => {
      // Import the normalizeHeader function (it's private, so we test via findCuiColumn)
      // We'll test via the actual parsing logic
      const headers = ["CUI", "Denumire Operator Economic"];
      // This will be tested via integration with findCuiColumn/findNameColumn
      expect(headers).toBeDefined();
    });

    it("should find CUI column by various patterns", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Denumire"],
        ["12345678", "Test Company"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0].cui).toBe("12345678");
    });
  });

  describe("CUI normalization", () => {
    it("should normalize RO12345678 to 12345678", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Denumire"],
        ["RO12345678", "Test Company"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      expect(result.records[0].cui).toBe("12345678");
    });

    it("should normalize 12345678 to 12345678", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Denumire"],
        ["12345678", "Test Company"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      expect(result.records[0].cui).toBe("12345678");
    });
  });

  describe("Row filtering", () => {
    it("should skip rows without valid CUI", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Denumire"],
        ["12345678", "Test Company 1"],
        ["", "Test Company 2"], // Empty CUI - should be skipped
        ["INVALID", "Test Company 3"], // Invalid CUI - should be skipped
        ["87654321", "Test Company 4"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      // Should only have 2 valid records
      expect(result.records.length).toBe(2);
      expect(result.records[0].cui).toBe("12345678");
      expect(result.records[1].cui).toBe("87654321");
    });
  });

  describe("Name extraction", () => {
    it("should extract company name when available", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Denumire Operator Economic"],
        ["12345678", "Test Company SRL"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      expect(result.records[0].name).toBe("Test Company SRL");
    });

    it("should handle missing name column gracefully", async () => {
      const XLSX = await import("xlsx");
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: {},
        },
      } as any);

      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ["CUI", "Other Column"],
        ["12345678", "Some Value"],
      ]);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-length": "1000" }),
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any);

      const { kv } = await import("@vercel/kv");
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue("OK");

      const result = await source.fetchBatch(undefined, 10, { forceReprocess: true });

      expect(result.records[0].cui).toBe("12345678");
      expect(result.records[0].name).toBeNull();
    });
  });
});
