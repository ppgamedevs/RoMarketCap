import { describe, it, expect } from "vitest";
import { normalizeQuery, tokenizeQuery } from "./normalize";

describe("normalizeQuery", () => {
  it("should trim whitespace", () => {
    expect(normalizeQuery("  test  ")).toBe("test");
  });

  it("should collapse multiple spaces", () => {
    expect(normalizeQuery("test    query")).toBe("test query");
  });

  it("should remove diacritics", () => {
    expect(normalizeQuery("România")).toBe("romania");
    expect(normalizeQuery("Ștefan")).toBe("stefan");
  });

  it("should lowercase", () => {
    expect(normalizeQuery("TEST")).toBe("test");
  });

  it("should handle empty string", () => {
    expect(normalizeQuery("")).toBe("");
  });
});

describe("tokenizeQuery", () => {
  it("should split by spaces", () => {
    expect(tokenizeQuery("test query")).toEqual(["test", "query"]);
  });

  it("should filter empty tokens", () => {
    expect(tokenizeQuery("test   query")).toEqual(["test", "query"]);
  });

  it("should normalize tokens", () => {
    expect(tokenizeQuery("România Ștefan")).toEqual(["romania", "stefan"]);
  });
});

