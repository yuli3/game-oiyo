import { describe, expect, it } from "vitest";
import { normalizeGameLocale, translateGameText, type GameTextTable } from "./game-text";

const table: GameTextTable = {
  "정화 의뢰": { en: "Cleanup jobs", ja: "清掃依頼" },
  "{0}개 박리": { en: "{0} peeled", fr: "{0} décollés" },
};

describe("translateGameText", () => {
  it("keeps the Korean source on Korean pages", () => {
    expect(translateGameText(table, "ko", "정화 의뢰")).toBe("정화 의뢰");
    expect(translateGameText(table, "ko", "{0}개 박리", 3)).toBe("3개 박리");
  });
  it("uses the locale, then English", () => {
    expect(translateGameText(table, "ja", "정화 의뢰")).toBe("清掃依頼");
    expect(translateGameText(table, "es", "정화 의뢰")).toBe("Cleanup jobs");
    expect(translateGameText(table, "fr", "{0}개 박리", 4)).toBe("4 décollés");
  });
  it("falls back to the source for unknown strings", () => {
    expect(translateGameText(table, "en", "없는 문구")).toBe("없는 문구");
  });
});

describe("normalizeGameLocale", () => {
  it("reads BCP47 tags", () => {
    expect(normalizeGameLocale("zh-CN")).toBe("zh");
    expect(normalizeGameLocale("ko")).toBe("ko");
    expect(normalizeGameLocale("de")).toBe("en");
    expect(normalizeGameLocale(undefined)).toBe("en");
  });
});
