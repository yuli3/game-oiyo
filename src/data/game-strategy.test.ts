import { describe, expect, it } from "vitest";
import { STRATEGY_GUIDES } from "./game-strategy";

const LOCALES = ["ko", "en", "ja", "zh", "fr", "es"] as const;

describe("strategy guide evidence contract", () => {
  it("gives every pilot a six-locale variant scope and visible HTTPS sources", () => {
    // chess joined the pilot on 2026-08-17: /chess is the highest-impression page
    // on game.oiyo.net (zh 54, ko 14 over 60 days) and sits at position ~72, which
    // is the depth-shortage signal this guide format exists to answer.
    expect(Object.keys(STRATEGY_GUIDES).sort()).toEqual(["chess", "hearts-game", "minesweeper", "solitaire", "texas-holdem"]);
    for (const guide of Object.values(STRATEGY_GUIDES)) {
      for (const locale of LOCALES) expect(guide.variantNote[locale].trim().length).toBeGreaterThan(40);
      expect(guide.sources.length).toBeGreaterThan(0);
      for (const source of guide.sources) {
        expect(source.label.trim().length).toBeGreaterThan(0);
        expect(source.href.startsWith("https://")).toBe(true);
      }
    }
  });

  it("keeps the Hold'em guide aligned with the no-betting trainer", () => {
    const guide = STRATEGY_GUIDES["texas-holdem"];
    const instructionalEnglish = [
      ...guide.tips.flatMap((tip) => [tip.heading.en, tip.body.en]),
      ...guide.mistakes.en,
    ].join(" ");
    expect(instructionalEnglish).not.toMatch(/late position|early position|calling cost|play aggressively/i);
    expect(guide.variantNote.en).toContain("no chips, blinds, betting, or position");
    expect(guide.tips.some((tip) => tip.body.en.includes("9/47"))).toBe(true);
  });

  it("does not restore the unsupported Klondike 80% claim or unsafe ace advice", () => {
    const guide = STRATEGY_GUIDES.solitaire;
    const allEnglish = [guide.intro.en, ...guide.tips.map((tip) => tip.body.en), ...guide.mistakes.en].join(" ");
    expect(allEnglish).not.toMatch(/80%|eighty percent/i);
    expect(allEnglish).toContain("Aces and 2s");
  });
});
