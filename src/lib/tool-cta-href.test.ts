import { describe, expect, it } from "vitest";
import { toolCtaHref, TOOL_CTA_BLOG_SLUGS, TOOL_CTA_FAMILY_OVERRIDES } from "./tool-cta-href";

describe("toolCtaHref", () => {
  it("never points at ahoxy.com", () => {
    const samples = [
      ...Object.keys(TOOL_CTA_FAMILY_OVERRIDES),
      ...Object.keys(TOOL_CTA_BLOG_SLUGS),
      "crypto-tax-calculator",
      "totally-unknown-tool",
    ];
    for (const tool of samples) {
      const href = toolCtaHref(tool, "ko");
      expect(href.includes("ahoxy.com"), href).toBe(false);
      expect(
        /^https:\/\/((blog|game)\.)?oiyo\.net\//.test(href) || href.startsWith("/"),
        href,
      ).toBe(true);
    }
  });

  it("maps used calculators to live blog tool slugs", () => {
    expect(toolCtaHref("bmi", "ko")).toBe(
      "https://blog.oiyo.net/ko/bmi-calculator/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta",
    );
    expect(toolCtaHref("compound", "en")).toBe(
      "https://blog.oiyo.net/en/compound-interest-calculator/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta",
    );
  });

  it("keeps oiyo overrides, game-local chess/gomoku, hubs unknown tools", () => {
    expect(toolCtaHref("adhd-screening", "ko")).toMatch(/^https:\/\/oiyo\.net\/ko\/adhd\/test\?/);
    expect(toolCtaHref("chess", "ko")).toBe("/ko/chess/");
    expect(toolCtaHref("gomoku", "en")).toBe("/en/gomoku/");
    expect(toolCtaHref("crypto-tax-calculator", "ko")).toBe(
      "https://blog.oiyo.net/ko/tools/?utm_source=blog_oiyo&utm_medium=referral&utm_campaign=tool_cta",
    );
  });
});
