import { describe, expect, test } from "vitest";
import { signNewsletterConfirmToken, verifyNewsletterConfirmToken } from "./token";

describe("newsletter token", () => {
  test("sign and verify works", () => {
    process.env.NEXTAUTH_SECRET = "test_secret";
    const token = signNewsletterConfirmToken("sub_123");
    const v = verifyNewsletterConfirmToken(token);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.subscriberId).toBe("sub_123");
  });
});


