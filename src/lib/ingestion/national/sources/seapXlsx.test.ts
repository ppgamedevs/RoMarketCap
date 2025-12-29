import { describe, it, expect, vi, beforeEach } from "vitest";
import { SEAPXlsxSource } from "./seapXlsx";
import * as XLSX from "xlsx";

// Mock xlsx
vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: {
    decode_range: vi.fn(),
    encode_cell: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock withRetry
vi.mock("@/src/lib/retry/withRetry", () => ({
  withRetry: vi.fn((fn) => fn()),
  isRetryableError: vi.fn(() => true),
}));

describe("SEAPXlsxSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEAP_XLSX_URL = "https://example.com/test.xlsx";
  });

  it("should extract CUIs from XLSX", async () => {
    // Create a minimal XLSX buffer mock
    const mockBuffer = Buffer.from("mock xlsx data");
    
    // Mock worksheet structure
    const mockWorksheet = {
      "A1": { v: "CUI" },
      "B1": { v: "Furnizor" },
      "A2": { v: "RO12345678" },
      "B2": { v: "Test Company" },
      "!ref": "A1:B2",
    };
    
    const mockWorkbook = {
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: mockWorksheet,
      },
    };
    
    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
    vi.mocked(XLSX.utils.decode_range).mockReturnValue({
      s: { r: 0, c: 0 },
      e: { r: 1, c: 1 },
    });
    vi.mocked(XLSX.utils.encode_cell).mockImplementation(({ r, c }) => {
      const col = String.fromCharCode(65 + c);
      return `${col}${r + 1}`;
    });
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      arrayBuffer: async () => mockBuffer.buffer,
    } as Response);
    
    const source = new SEAPXlsxSource();
    const result = await source.fetchBatch(undefined, 100);
    
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records[0]?.cui).toBe("12345678");
    expect(result.records[0]?.name).toBe("Test Company");
  });

  it("should return empty if cursor is set (already processed)", async () => {
    const source = new SEAPXlsxSource();
    const result = await source.fetchBatch("processed", 100);
    
    expect(result.records).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it("should fail if SEAP_XLSX_URL is not set", async () => {
    delete process.env.SEAP_XLSX_URL;
    
    const source = new SEAPXlsxSource();
    
    await expect(source.fetchBatch()).rejects.toThrow("SEAP_XLSX_URL environment variable not set");
  });

  it("should handle missing CUI column gracefully", async () => {
    const mockBuffer = Buffer.from("mock xlsx data");
    
    const mockWorksheet = {
      "A1": { v: "Other Column" },
      "B1": { v: "Another Column" },
      "!ref": "A1:B1",
    };
    
    const mockWorkbook = {
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: mockWorksheet,
      },
    };
    
    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
    vi.mocked(XLSX.utils.decode_range).mockReturnValue({
      s: { r: 0, c: 0 },
      e: { r: 0, c: 1 },
    });
    vi.mocked(XLSX.utils.encode_cell).mockImplementation(({ r, c }) => {
      const col = String.fromCharCode(65 + c);
      return `${col}${r + 1}`;
    });
    
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      arrayBuffer: async () => mockBuffer.buffer,
    } as Response);
    
    const source = new SEAPXlsxSource();
    
    await expect(source.fetchBatch()).rejects.toThrow("Could not find CUI column");
  });

  it("should handle health check", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } as Response);
    
    const source = new SEAPXlsxSource();
    const result = await source.healthCheck();
    
    expect(result).toBe(true);
  });

  it("should return false for health check if URL not set", async () => {
    delete process.env.SEAP_XLSX_URL;
    
    const source = new SEAPXlsxSource();
    const result = await source.healthCheck();
    
    expect(result).toBe(false);
  });
});

