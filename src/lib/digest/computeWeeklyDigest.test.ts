import { describe, expect, test } from "vitest";
import { avgDeltaByKey, computeTopMovers } from "./computeWeeklyDigest";

describe("weekly digest helpers", () => {
  test("computeTopMovers returns top up and down", () => {
    const rows = [
      { slug: "a", name: "A", industrySlug: "software", countySlug: "cluj", fromScore: 50, toScore: 60, delta: 10 },
      { slug: "b", name: "B", industrySlug: "software", countySlug: "cluj", fromScore: 50, toScore: 45, delta: -5 },
      { slug: "c", name: "C", industrySlug: "retail", countySlug: "iasi", fromScore: 50, toScore: 55, delta: 5 },
    ];
    const { topUp, topDown } = computeTopMovers(rows, 2);
    expect(topUp[0]!.slug).toBe("a");
    expect(topDown[0]!.slug).toBe("b");
  });

  test("avgDeltaByKey groups and averages", () => {
    const rows = [
      { slug: "a", name: "A", industrySlug: "software", countySlug: "cluj", fromScore: 50, toScore: 60, delta: 10 },
      { slug: "b", name: "B", industrySlug: "software", countySlug: "cluj", fromScore: 50, toScore: 40, delta: -10 },
      { slug: "c", name: "C", industrySlug: "retail", countySlug: "iasi", fromScore: 50, toScore: 55, delta: 5 },
    ];
    const out = avgDeltaByKey(rows, "industrySlug", 5);
    const software = out.find((x) => x.slug === "software")!;
    expect(Math.round(software.avgDelta)).toBe(0);
  });
});


