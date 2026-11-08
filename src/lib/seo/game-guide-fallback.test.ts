import { describe, expect, it } from "vitest";
import { getFallbackGameGuide } from "./game-guide-fallback";
import { locales } from "../../lib/i18n";

describe("getFallbackGameGuide", () => {
  it("generates a complete GameGuide object with all 6 locales", () => {
    const guide = getFallbackGameGuide("cyber-highway-3d", "사이버 하이웨이 3D");

    expect(guide).toBeDefined();
    for (const locale of locales) {
      expect(guide.origin[locale]).toBeDefined();
      expect(guide.origin[locale]).toContain("사이버 하이웨이 3D");
      expect(guide.how[locale]).toBeDefined();
      expect(guide.rules?.[locale]).toHaveLength(3);
    }
  });

  it("generates 3 complete FAQs in all 6 locales with clean names", () => {
    const guide = getFallbackGameGuide("block-breaker-3d", "");

    expect(guide.faqs).toHaveLength(3);
    for (const locale of locales) {
      for (const faq of guide.faqs) {
        expect(faq.q[locale].length).toBeGreaterThan(5);
        expect(faq.a[locale].length).toBeGreaterThan(10);
      }
    }
    // Formats empty name from slug
    expect(guide.origin.en).toContain("Block Breaker 3d");
  });
});
