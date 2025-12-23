import { describe, expect, test } from "vitest";
import { hashApiKey, last4 } from "./hash";

describe("api key hashing", () => {
  test("hash is deterministic", () => {
    const h1 = hashApiKey("abc", "secret");
    const h2 = hashApiKey("abc", "secret");
    expect(h1).toBe(h2);
  });

  test("last4 works", () => {
    expect(last4("romc_12345678")).toBe("5678");
  });
});


