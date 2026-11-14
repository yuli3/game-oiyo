import { describe, expect, it } from "vitest";
import { locales } from "../lib/i18n";
import { CATALOG_GAMES } from "../lib/games/game-recommendations";
import { EMBED_COPY, EMBEDDABLE_GAMES, embedSnippet, gameEmbedUrl, isEmbeddableGame } from "./embeddable-games";

describe("embeddable games", () => {
  it("only lists catalog games", () => {
    for (const slug of EMBEDDABLE_GAMES) expect(CATALOG_GAMES[slug]).toBeDefined();
  });

  it("has embed copy for every locale", () => {
    for (const l of locales) expect(EMBED_COPY[l].title.length).toBeGreaterThan(0);
  });

  it("snippet carries a followable credit link to the canonical game page", () => {
    const s = embedSnippet("en", "tents-and-trees", "Tents & Trees");
    expect(s).toContain(`src="${gameEmbedUrl("en", "tents-and-trees")}"`);
    expect(s).toContain('<a href="https://game.oiyo.net/en/tents-and-trees/">');
    expect(s).not.toContain("nofollow");
  });

  it("rejects non-whitelisted slugs", () => {
    expect(isEmbeddableGame("sudoku")).toBe(true);
    expect(isEmbeddableGame("village")).toBe(false);
  });
});
