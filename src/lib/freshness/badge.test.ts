import { describe, it, expect } from "vitest";
import { classifyFreshness, getFreshnessBadge } from "./badge";

describe("freshness badge", () => {
  it("classifies fresh (<7 days)", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(threeDaysAgo, threeDaysAgo)).toBe("fresh");
  });

  it("classifies stale (7-30 days)", () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(tenDaysAgo, tenDaysAgo)).toBe("stale");
  });

  it("classifies old (>30 days)", () => {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(fortyDaysAgo, fortyDaysAgo)).toBe("old");
  });

  it("uses most recent date", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    // Should use threeDaysAgo (most recent)
    expect(classifyFreshness(tenDaysAgo, threeDaysAgo)).toBe("fresh");
  });

  it("handles null dates", () => {
    expect(classifyFreshness(null, null)).toBe("old");
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(null, threeDaysAgo)).toBe("fresh");
    expect(classifyFreshness(threeDaysAgo, null)).toBe("fresh");
  });

  it("returns correct badge info", () => {
    const fresh = getFreshnessBadge("fresh");
    expect(fresh.status).toBe("fresh");
    expect(fresh.label).toBe("Fresh");
    expect(fresh.labelRo).toBe("Actualizat");

    const stale = getFreshnessBadge("stale");
    expect(stale.status).toBe("stale");
    expect(stale.label).toBe("Stale");

    const old = getFreshnessBadge("old");
    expect(old.status).toBe("old");
    expect(old.label).toBe("Old");
  });
});

