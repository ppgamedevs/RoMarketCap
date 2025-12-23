import { describe, it, expect } from "vitest";
import { explainRomcChangeShort, explainForecastDirection } from "./explain";

describe("explain", () => {
  describe("explainRomcChangeShort", () => {
    it("should explain revenue growth", () => {
      const result = explainRomcChangeShort(
        {
          romcScore: 75,
          previousRomcScore: 70,
          revenueLatest: 1000000,
          previousRevenue: 800000,
        },
        "en",
      );
      expect(result).toContain("revenue");
      expect(result).toContain("growth");
    });

    it("should explain employee changes", () => {
      const result = explainRomcChangeShort(
        {
          romcScore: 80,
          previousRomcScore: 75,
          employees: 50,
          previousEmployees: 30,
        },
        "en",
      );
      expect(result).toContain("hiring");
    });

    it("should return default message if no significant changes", () => {
      const result = explainRomcChangeShort(
        {
          romcScore: 70,
          previousRomcScore: 70,
        },
        "en",
      );
      expect(result).toContain("Data update");
    });
  });

  describe("explainForecastDirection", () => {
    it("should explain positive forecast", () => {
      const result = explainForecastDirection(75, "en");
      expect(result).toContain("positive");
    });

    it("should explain negative forecast", () => {
      const result = explainForecastDirection(30, "en");
      expect(result).toContain("negative");
    });
  });
});

