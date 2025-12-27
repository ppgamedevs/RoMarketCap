/**
 * PROMPT 61: Unit tests for checkpoint management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readCursor, writeCursor, readLastRunStats, writeLastRunStats, resetCursor } from "./checkpoint";

// Mock Vercel KV
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import { kv } from "@vercel/kv";

describe("checkpoint management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("readCursor", () => {
    it("should read cursor from KV", async () => {
      (kv.get as any).mockResolvedValue("cursor-value");
      const cursor = await readCursor();
      expect(cursor).toBe("cursor-value");
      expect(kv.get).toHaveBeenCalledWith("national-ingest:cursor");
    });

    it("should return null on error", async () => {
      (kv.get as any).mockRejectedValue(new Error("KV error"));
      const cursor = await readCursor();
      expect(cursor).toBeNull();
    });
  });

  describe("writeCursor", () => {
    it("should write cursor to KV", async () => {
      await writeCursor("new-cursor");
      expect(kv.set).toHaveBeenCalledWith("national-ingest:cursor", "new-cursor", { ex: 60 * 60 * 24 * 7 });
    });

    it("should delete cursor when null", async () => {
      await writeCursor(null);
      expect(kv.del).toHaveBeenCalledWith("national-ingest:cursor");
    });
  });

  describe("readLastRunStats", () => {
    it("should read stats from KV", async () => {
      const stats = { discovered: 100, upserted: 50, errors: 0, lastRunAt: "2024-01-01", cursor: "cursor" };
      (kv.get as any).mockResolvedValue(stats);
      const result = await readLastRunStats();
      expect(result).toEqual(stats);
    });
  });

  describe("writeLastRunStats", () => {
    it("should write stats to KV", async () => {
      const stats = { discovered: 100, upserted: 50, errors: 0, lastRunAt: "2024-01-01", cursor: "cursor" };
      await writeLastRunStats(stats);
      expect(kv.set).toHaveBeenCalledWith("national-ingest:stats", stats, { ex: 60 * 60 * 24 * 7 });
      expect(kv.set).toHaveBeenCalledWith("national-ingest:last-run", expect.any(String), { ex: 60 * 60 * 24 * 7 });
    });
  });

  describe("resetCursor", () => {
    it("should delete cursor from KV", async () => {
      await resetCursor();
      expect(kv.del).toHaveBeenCalledWith("national-ingest:cursor");
    });
  });
});

