import { describe, expect, test } from "vitest";
import { generateReferralCode } from "./code";

describe("generateReferralCode", () => {
  test("generates stable length and safe charset", () => {
    const c = generateReferralCode(10);
    expect(c).toHaveLength(10);
    expect(/^[23456789abcdefghjkmnpqrstuvwxyz]+$/.test(c)).toBe(true);
  });
});


