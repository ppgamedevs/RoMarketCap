import { describe, expect, test } from "vitest";
import { cooldownKey, cooldownSeconds } from "./cooldown";
import { normalizeLaunchOfferText } from "./offer";

describe("cooldown", () => {
  test("cooldown key is stable", () => {
    expect(cooldownKey("claim", "u1", "c1")).toBe("cooldown:claim:u1:c1");
    expect(cooldownKey("submission", "u2", "c9")).toBe("cooldown:submission:u2:c9");
  });

  test("cooldown seconds are correct", () => {
    expect(cooldownSeconds("claim")).toBe(60 * 60 * 24 * 30);
    expect(cooldownSeconds("submission")).toBe(60 * 60 * 24 * 7);
  });
});

describe("launch offer", () => {
  test("normalizes offer text", () => {
    expect(normalizeLaunchOfferText("  hello ")).toBe("hello");
    expect(normalizeLaunchOfferText("")).toBe("");
  });
});


