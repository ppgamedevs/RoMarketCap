/**
 * PROMPT 53: Tests for sanitization helper
 */

import { describe, it, expect } from "vitest";
import { sanitizePayload, sha256StableJson } from "./sanitize";

describe("sanitizePayload", () => {
  it("should whitelist allowed keys", () => {
    const payload = {
      name: "Test Company",
      cui: "RO12345678",
      domain: "test.com",
      allowed: "value",
      notAllowed: "should be removed",
      nested: {
        name: "Nested",
        secret: "should be removed",
      },
    };

    const { sanitized } = sanitizePayload(payload);

    expect(sanitized).toHaveProperty("name");
    expect(sanitized).toHaveProperty("cui");
    expect(sanitized).toHaveProperty("domain");
    expect(sanitized).not.toHaveProperty("notAllowed");
    expect(sanitized).not.toHaveProperty("secret");
  });

  it("should truncate long strings", () => {
    const longString = "a".repeat(1000);
    const payload = { name: longString };

    const { sanitized } = sanitizePayload(payload);

    expect((sanitized as { name: string }).name.length).toBeLessThanOrEqual(500);
  });

  it("should cap total size to 8KB", () => {
    const hugePayload: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      hugePayload[`key${i}`] = "x".repeat(200);
    }

    const { sanitized, sizeBytes } = sanitizePayload(hugePayload);

    expect(sizeBytes).toBeLessThanOrEqual(8 * 1024);
    expect(JSON.stringify(sanitized).length).toBeLessThanOrEqual(8 * 1024);
  });
});

describe("sha256StableJson", () => {
  it("should produce stable hashes for same input", () => {
    const payload = { name: "Test", cui: "RO123" };
    const hash1 = sha256StableJson(payload);
    const hash2 = sha256StableJson(payload);

    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const payload1 = { name: "Test", cui: "RO123" };
    const payload2 = { name: "Test2", cui: "RO123" };

    const hash1 = sha256StableJson(payload1);
    const hash2 = sha256StableJson(payload2);

    expect(hash1).not.toBe(hash2);
  });

  it("should be order-independent", () => {
    const payload1 = { name: "Test", cui: "RO123" };
    const payload2 = { cui: "RO123", name: "Test" };

    const hash1 = sha256StableJson(payload1);
    const hash2 = sha256StableJson(payload2);

    expect(hash1).toBe(hash2);
  });
});

