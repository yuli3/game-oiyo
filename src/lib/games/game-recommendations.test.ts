import { describe, expect, it } from "vitest";
import { getGameRecommendations, CATALOG_GAMES } from "./game-recommendations";
import { locales } from "../i18n";

describe("game-recommendations", () => {
  it("contains all 162 catalog games", () => {
    expect(Object.keys(CATALOG_GAMES)).toHaveLength(162);
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
