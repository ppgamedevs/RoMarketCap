/**
 * Tests for ANAF verification cron route
 * 
 * PROMPT 52: Cron dry-run test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";

// Mock dependencies
vi.mock("@/src/lib/db", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/src/lib/flags/flags", () => ({
  isFlagEnabled: vi.fn(),
}));

vi.mock("@/src/lib/locks/distributed", () => ({
  acquireLockWithRetry: vi.fn(),
  releaseLock: vi.fn(),
}));

vi.mock("@/src/lib/flags/readOnly", () => ({
  shouldBlockMutation: vi.fn().mockResolvedValue({ blocked: false }),
}));

vi.mock("@/src/lib/connectors/anaf/verifyCompany", () => ({
  verifyCompany: vi.fn(),
}));

vi.mock("@/src/lib/verification/store", () => ({
  storeVerification: vi.fn(),
  getCompaniesNeedingVerification: vi.fn(),
}));

vi.mock("@/src/lib/company/updateAnafVerification", () => ({
  updateAnafVerification: vi.fn(),
}));

vi.mock("@/src/lib/integrity/updateIntegrityWithVerification", () => ({
  updateIntegrityWithVerification: vi.fn(),
}));

describe("POST /api/cron/anaf-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("should exit cleanly when feature flag is disabled", async () => {
    vi.mocked(isFlagEnabled).mockResolvedValue(false);

    const req = new Request("http://localhost/api/cron/anaf-verify", {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret",
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.ok).toBe(false);
    expect(data.error).toContain("disabled");
  });

  it("should process companies in dry-run mode", async () => {
    vi.mocked(isFlagEnabled).mockResolvedValue(true);
    vi.mocked(acquireLockWithRetry).mockResolvedValue("lock-id");
    vi.mocked(kv.get).mockResolvedValue(null);

    const { getCompaniesNeedingVerification } = await import("@/src/lib/verification/store");
    const { verifyCompany } = await import("@/src/lib/connectors/anaf/verifyCompany");

    vi.mocked(getCompaniesNeedingVerification).mockResolvedValue([
      { id: "company-1", cui: "RO12345678" },
      { id: "company-2", cui: "RO87654321" },
    ]);

    vi.mocked(verifyCompany).mockResolvedValue({
      cui: "RO12345678",
      isActive: true,
      vatRegistered: true,
      source: "ANAF",
      verifiedAt: new Date(),
    });

    const req = new Request("http://localhost/api/cron/anaf-verify?dry=true&limit=10", {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret",
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.dry).toBe(true);
    expect(data.processed).toBe(2);
    expect(data.verified).toBe(2);

    // Should not call store functions in dry-run
    const { storeVerification } = await import("@/src/lib/verification/store");
    expect(vi.mocked(storeVerification)).not.toHaveBeenCalled();
  });

  it("should handle missing CUI gracefully", async () => {
    vi.mocked(isFlagEnabled).mockResolvedValue(true);
    vi.mocked(acquireLockWithRetry).mockResolvedValue("lock-id");
    vi.mocked(kv.get).mockResolvedValue(null);

    const { getCompaniesNeedingVerification } = await import("@/src/lib/verification/store");

    vi.mocked(getCompaniesNeedingVerification).mockResolvedValue([
      { id: "company-1", cui: null },
    ]);

    const req = new Request("http://localhost/api/cron/anaf-verify?dry=true", {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret",
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.errors).toBe(1);
  });

  it("should not throw on verification errors", async () => {
    vi.mocked(isFlagEnabled).mockResolvedValue(true);
    vi.mocked(acquireLockWithRetry).mockResolvedValue("lock-id");
    vi.mocked(kv.get).mockResolvedValue(null);

    const { getCompaniesNeedingVerification } = await import("@/src/lib/verification/store");
    const { verifyCompany } = await import("@/src/lib/connectors/anaf/verifyCompany");

    vi.mocked(getCompaniesNeedingVerification).mockResolvedValue([
      { id: "company-1", cui: "RO12345678" },
    ]);

    vi.mocked(verifyCompany).mockRejectedValue(new Error("Network error"));

    const req = new Request("http://localhost/api/cron/anaf-verify?dry=true", {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret",
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(data.errors).toBe(1);
  });
});

