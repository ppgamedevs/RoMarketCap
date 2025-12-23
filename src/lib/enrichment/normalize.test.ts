import { describe, expect, test } from "vitest";
import { extractDomain, extractMetaFromHtml, normalizeWebsite, sanitizeText } from "./normalize";

describe("enrichment normalize", () => {
  test("normalizeWebsite canonicalizes to https origin", () => {
    expect(normalizeWebsite("example.com")).toBe("https://example.com");
    expect(normalizeWebsite("http://Example.com/path?x=1")).toBe("https://example.com");
  });

  test("extractDomain strips www", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com");
  });

  test("sanitizeText strips HTML and caps length", () => {
    expect(sanitizeText("<b>Hello</b>   world", 20)).toBe("Hello world");
    const long = "a".repeat(500);
    expect(sanitizeText(long, 240)!.length).toBeLessThanOrEqual(240);
  });

  test("extractMetaFromHtml gets title and description", () => {
    const html = `<html><head><title>My Title</title><meta name="description" content="Desc here"></head></html>`;
    const out = extractMetaFromHtml(html);
    expect(out.title).toBe("My Title");
    expect(out.description).toBe("Desc here");
  });
});


