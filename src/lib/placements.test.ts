import { describe, expect, test } from "vitest";
import { appendUtm, getPlacementsForLocation, isSafeHttpUrl } from "./placements";

describe("placements", () => {
  test("isSafeHttpUrl blocks non-http(s)", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });

  test("appendUtm merges query params", () => {
    expect(appendUtm("https://example.com", "utm_source=a&utm_medium=b")).toContain("utm_source=a");
  });

  test("getPlacementsForLocation filters by location and sanitizes", async () => {
    const json = JSON.stringify([
      {
        id: "p1",
        title_ro: "T1",
        title_en: "T1",
        desc_ro: "D1",
        desc_en: "D1",
        href: "https://example.com",
        utm: "utm_source=romc",
        locations: ["companies"],
        enabled: true,
      },
      {
        id: "p2",
        title_ro: "X",
        title_en: "X",
        desc_ro: "X",
        desc_en: "X",
        href: "javascript:alert(1)",
        locations: ["companies"],
        enabled: true,
      },
    ]);
    const out = await getPlacementsForLocation("companies", "ro", json);
    expect(out.length).toBe(1);
    expect(out[0]!.href).toContain("utm_source=romc");
  });
});


