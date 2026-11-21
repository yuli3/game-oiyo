import { describe, expect, it } from "vitest";
import { normalizeGameLocale, translateGameMessage, translateGameText, type GameTextTable } from "./game-text";

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

describe("translateGameMessage", () => {
  const logs: GameTextTable = {
    "{0} 공격! 적에게 {1} 피해를 입혔습니다.": { en: "{0} hits for {1} damage.", ja: "{0}の攻撃！{1}ダメージ。" },
    "나무 검 (Wooden Sword)": { en: "Wooden Sword", ja: "木の剣" },
    "던전에 입장했습니다!": { en: "You entered the dungeon!" },
  };
  it("matches a template and translates the values inside", () => {
    expect(translateGameMessage(logs, "en", "나무 검 (Wooden Sword) 공격! 적에게 7 피해를 입혔습니다.")).toBe("Wooden Sword hits for 7 damage.");
    expect(translateGameMessage(logs, "ja", "나무 검 (Wooden Sword) 공격! 적에게 7 피해를 입혔습니다.")).toBe("木の剣の攻撃！7ダメージ。");
  });
  it("uses exact keys and leaves Korean pages and unknown lines alone", () => {
    expect(translateGameMessage(logs, "en", "던전에 입장했습니다!")).toBe("You entered the dungeon!");
    expect(translateGameMessage(logs, "ko", "던전에 입장했습니다!")).toBe("던전에 입장했습니다!");
    expect(translateGameMessage(logs, "en", "모르는 줄")).toBe("모르는 줄");
  });
});
