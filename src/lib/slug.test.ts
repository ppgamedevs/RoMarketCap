import { describe, expect, test } from "vitest";
import { makeCompanySlug, slugifyCompanyName } from "./slug";

describe("slug helpers", () => {
  test("slugifyCompanyName is deterministic and ascii", () => {
    const a = slugifyCompanyName("Șantier Naval SRL");
    const b = slugifyCompanyName("Șantier  Naval   SRL");
    expect(a).toBe("santier-naval-srl");
    expect(b).toBe("santier-naval-srl");
  });

  test("makeCompanySlug includes stable suffix", () => {
    const s = makeCompanySlug("Carpathia Software SRL", "RO12345678");
    expect(s).toBe("carpathia-software-srl-ro12345678");
  });
});


