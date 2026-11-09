import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getGameRecommendations, CATALOG_GAMES, CURATED_CLUSTERS } from "./game-recommendations";
import { locales } from "../i18n";

describe("game-recommendations", () => {
  it("contains all 162 catalog games", () => {
    expect(Object.keys(CATALOG_GAMES)).toHaveLength(162);
  });

  // 2026-11-10: CATALOG_GAMES는 index.astro GAMES의 스냅샷이다. 신작이 index에만
  // 추가되면 추천 체인에서 빠지므로, 두 목록이 어긋나면 여기서 실패시킨다.
  it("stays in sync with the playable games in index.astro", () => {
    const page = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    const catalog = page.slice(page.indexOf("const GAMES"), page.indexOf("const byCat"));
    const playable = [...catalog.matchAll(/slug:\s*"([^"]+)"(?:,\s*kind:\s*"([^"]+)")?/g)]
      .filter((m) => (m[2] ?? "game") === "game")
      .map((m) => m[1])
      .sort();
    expect(Object.keys(CATALOG_GAMES).sort()).toEqual(playable);
  });

  it("only references catalog games in curated clusters", () => {
    for (const [key, list] of Object.entries(CURATED_CLUSTERS)) {
      expect(CATALOG_GAMES[key], `cluster key ${key}`).toBeDefined();
      for (const s of list) expect(CATALOG_GAMES[s], `${key} → ${s}`).toBeDefined();
    }
  });

  it("returns exactly 4 recommendations for flagship titles", () => {
    const recs = getGameRecommendations("dot-fishing", "ko", 4);
    expect(recs).toHaveLength(4);
    expect(recs.map((r) => r.slug)).not.toContain("dot-fishing");
    expect(recs[0].slug).toBe("cat-fishing");
    expect(recs[0].href).toBe("/ko/cat-fishing/");
    expect(recs[0].title).toBe("고양이 낚시");
    expect(recs[0].emoji).toBe("🐟");
  });

  it("never includes the target game itself", () => {
    for (const slug of ["chess", "vampire-survivor", "block-blast", "wordle"]) {
      const recs = getGameRecommendations(slug, "en", 4);
      expect(recs.map((r) => r.slug)).not.toContain(slug);
    }
  });

  it("works across all 6 locales with localized titles and links", () => {
    for (const locale of locales) {
      const recs = getGameRecommendations("chess", locale, 4);
      expect(recs).toHaveLength(4);
      for (const rec of recs) {
        expect(rec.href).toBe(`/${locale}/${rec.slug}/`);
        expect(rec.title.length).toBeGreaterThan(0);
        expect(rec.emoji.length).toBeGreaterThan(0);
      }
    }
  });

  it("provides deterministic recommendations for unknown/fallback slugs", () => {
    const recs1 = getGameRecommendations("unknown-game-slug-x", "ko", 4);
    const recs2 = getGameRecommendations("unknown-game-slug-x", "ko", 4);
    expect(recs1).toHaveLength(4);
    expect(recs1.map((r) => r.slug)).toEqual(recs2.map((r) => r.slug));
  });

  it("prioritizes same-category games when curated list is partial", () => {
    const recs = getGameRecommendations("hearts-game", "en", 4);
    expect(recs).toHaveLength(4);
    // hearts is card category
    const cardGames = recs.filter((r) => r.cat === "card");
    expect(cardGames.length).toBeGreaterThanOrEqual(1);
  });
});
