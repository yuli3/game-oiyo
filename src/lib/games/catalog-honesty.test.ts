import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The catalog page advertises a number of games. Before `kind` existed the
 * headline said 48 while the array held 52 entries — including four random
 * tools and three Lost Ark calculators. These tests keep the public claim tied
 * to what is actually a game, so the two cannot drift apart again.
 *
 * Source: company-brain decision `game-catalog-classification-2026-07-27`.
 */
const SOURCE = "src/pages/[...lang]/index.astro";
const page = readFileSync(SOURCE, "utf8");
const catalog = page.slice(page.indexOf("const GAMES"), page.indexOf("const byCat"));

/** Entries that must never be counted or marked up as games. */
const NOT_GAMES: Record<string, string> = {
  "dice-roller": "tool",
  "wheel-spinner": "tool",
  "lotto-generator": "tool",
  plinko: "tool",
  "balance-game": "casual",
  "dot-pet": "casual",
  tamagotchi: "casual",
  "lostark-raid-distribution": "calculator",
  "lostark-auction-calculator": "calculator",
  "lostark-bus-calculator": "calculator",
};

function entries() {
  return [...catalog.matchAll(/slug:\s*"([^"]+)"(?:,\s*kind:\s*"([^"]+)")?/g)].map((m) => ({
    slug: m[1],
    kind: m[2] ?? "game",
  }));
}

describe("game catalog honesty", () => {
  it("tags every non-game entry with the right kind", () => {
    const found = Object.fromEntries(entries().map((e) => [e.slug, e.kind]));
    for (const [slug, kind] of Object.entries(NOT_GAMES)) {
      expect(found[slug], `${slug} is missing from the catalog`).toBeDefined();
      expect(found[slug], `${slug} must be tagged "${kind}", not counted as a game`).toBe(kind);
    }
  });

  it("advertises exactly the number of real games, in every locale", () => {
    const all = entries();
    const gameCount = all.filter((e) => e.kind === "game").length;
    expect(gameCount).toBe(all.length - Object.keys(NOT_GAMES).length);

    // The headline copy is hand-written per locale, so it is the piece most
    // likely to go stale — assert it rather than trusting it.
    const header = page.slice(0, page.indexOf("const catLabel"));
    const numbers = [...header.matchAll(/\b(\d{2})\b/g)].map((m) => Number(m[1]));
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(n).toBe(gameCount);
  });

  it("derives the displayed count and the schema type from kind", () => {
    // A dice roller marked up as schema.org/Game is a false claim to search
    // engines, not just an internal tidiness issue.
    expect(page).toContain("const gameCount = GAMES.filter(isGame).length");
    expect(page).toContain('"@type": schemaType(g)');
    expect(page).toContain("{gameCount}");
  });
});
