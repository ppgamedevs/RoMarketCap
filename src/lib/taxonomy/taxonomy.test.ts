import { describe, expect, test } from "vitest";
import { countyLabel } from "./counties";
import { industryLabel } from "./industries";

describe("taxonomy labels", () => {
  test("returns fallback for unknown slug", () => {
    expect(countyLabel("unknown", "ro")).toBe("unknown");
    expect(industryLabel("unknown", "en")).toBe("unknown");
  });

  test("returns known labels", () => {
    expect(countyLabel("cluj", "ro")).toBe("Cluj");
    expect(countyLabel("bucuresti", "en")).toBe("Bucharest");
  });
});


