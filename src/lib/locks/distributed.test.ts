import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquireLock, releaseLock, isLockHeld, getLockHolder } from "./distributed";

// Mock KV
vi.mock("@vercel/kv", () => {
  const mockKv = {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  };
  return { kv: mockKv };
});

import { kv } from "@vercel/kv";
const mockKv = kv as { set: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> };

describe("distributed locks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("acquireLock", () => {
    it("should acquire lock when available", async () => {
      mockKv.set.mockResolvedValue("OK");
      const lockId = await acquireLock("test-lock", { ttl: 300 });
      expect(lockId).toBeTruthy();
      expect(mockKv.set).toHaveBeenCalledWith("lock:test-lock", expect.any(String), { nx: true, ex: 300 });
    });

    it("should return null when lock is held", async () => {
      mockKv.set.mockResolvedValue(null); // NX failed
      const lockId = await acquireLock("test-lock", { ttl: 300 });
      expect(lockId).toBeNull();
    });
  });

  describe("releaseLock", () => {
    it("should release lock when lockId matches", async () => {
      mockKv.get.mockResolvedValue("lock-id-123");
      mockKv.del.mockResolvedValue(1);
      const released = await releaseLock("test-lock", "lock-id-123");
      expect(released).toBe(true);
      expect(mockKv.del).toHaveBeenCalledWith("lock:test-lock");
    });

    it("should not release lock when lockId doesn't match", async () => {
      mockKv.get.mockResolvedValue("different-lock-id");
      const released = await releaseLock("test-lock", "lock-id-123");
      expect(released).toBe(false);
      expect(mockKv.del).not.toHaveBeenCalled();
    });
  });

  describe("isLockHeld", () => {
    it("should return true when lock exists", async () => {
      mockKv.get.mockResolvedValue("lock-id-123");
      const held = await isLockHeld("test-lock");
      expect(held).toBe(true);
    });

    it("should return false when lock doesn't exist", async () => {
      mockKv.get.mockResolvedValue(null);
      const held = await isLockHeld("test-lock");
      expect(held).toBe(false);
    });
  });

  describe("getLockHolder", () => {
    it("should return lock holder ID", async () => {
      mockKv.get.mockResolvedValue("lock-id-123");
      const holder = await getLockHolder("test-lock");
      expect(holder).toBe("lock-id-123");
    });

    it("should return null when no lock", async () => {
      mockKv.get.mockResolvedValue(null);
      const holder = await getLockHolder("test-lock");
      expect(holder).toBeNull();
    });
  });
});

