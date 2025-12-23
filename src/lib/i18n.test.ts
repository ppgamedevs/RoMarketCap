import { describe, expect, test } from "vitest";
import { t } from "./i18n";

describe("i18n", () => {
  test("returns correct translations", () => {
    expect(t("ro", "nav_company")).toBe("Companii");
    expect(t("en", "nav_company")).toBe("Companies");
  });
});


