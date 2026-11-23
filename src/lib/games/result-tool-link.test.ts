import { describe, expect, it } from "vitest";
import { isYearEndSeason, pickResultTool, toolHref } from "./result-tool-link";

describe("pickResultTool", () => {
  it("sends money games to the compound-interest calculator", () => {
    const t = pickResultTool("blackjack", "ko", 6);
    expect(t.key).toBe("compound");
    expect(t.href.startsWith("https://tools.oiyo.net/ko/compound-interest-calculator/?")).toBe(true);
    expect(pickResultTool("season-workshop", "ko", 6).key).toBe("pay");
  });

  it("uses each country's own take-home pay tool", () => {
    expect(toolHref("pay", "ko")).toBe("https://tools.oiyo.net/ko/salary-calculator/");
    expect(toolHref("pay", "en")).toBe("https://tools.oiyo.net/en/us-take-home-pay-calculator-2026/");
    expect(toolHref("pay", "ja")).toBe("https://tools.oiyo.net/ja/japan-salary-calculator/");
    expect(toolHref("pay", "zh")).toBe("https://tools.oiyo.net/zh/china-salary-calculator/");
    expect(toolHref("pay", "fr")).toBe("https://tools.oiyo.net/fr/france-salary-calculator/");
    expect(toolHref("pay", "es")).toBe("https://tools.oiyo.net/es/spain-salary-calculator/");
  });

  it("offers year-end settlement in ko/ja from November to January only", () => {
    expect(isYearEndSeason("ko", 12)).toBe(true);
    expect(isYearEndSeason("ja", 1)).toBe(true);
    expect(isYearEndSeason("ko", 3)).toBe(false);
    expect(isYearEndSeason("en", 12)).toBe(false);
    expect(pickResultTool("tetris", "ko", 11).href).toContain("/ko/year-end-settlement-calculator/");
    expect(pickResultTool("tetris", "en", 12).href).toContain("/en/us-take-home-pay-calculator-2026/");
  });

  it("tags the link for GA4 and falls back to English for unknown locales", () => {
    const t = pickResultTool("snake", "de", 6);
    const url = new URL(t.href);
    expect(url.pathname).toBe("/en/us-take-home-pay-calculator-2026/");
    expect(url.searchParams.get("utm_campaign")).toBe("result_to_tool");
    expect(url.searchParams.get("utm_content")).toBe("snake");
    expect(t.label.length).toBeGreaterThan(0);
  });
});
