import { describe, expect, it } from "vitest";
import {
  EMBERDEEP_SAVE_KEY,
  attackConnects,
  canCast,
  chooseBranch,
  comboDamage,
  hitStopFrames,
  parseEmberdeepSave,
  scoreForHit,
  spendMana,
} from "./emberdeep";

describe("Emberdeep combat rules", () => {
  it("keeps an isolated versioned save key", () => {
    expect(EMBERDEEP_SAVE_KEY).toBe("oiyo:emberdeep:v1");
  });

  it("ramps a four-step combo and rewards air attacks", () => {
    expect(comboDamage(20, 0)).toBe(20);
    expect(comboDamage(20, 3)).toBe(38);
    expect(comboDamage(20, 3, true)).toBe(48);
  });

  it("requires enough mana without partially spending", () => {
    expect(canCast(23, "ember")).toBe(false);
    expect(spendMana(23, "ember")).toBe(23);
    expect(spendMana(45, "storm")).toBe(0);
  });

  it("checks facing, reach and depth lane", () => {
    const hero = { x: 100, y: 300, facing: 1 };
    expect(attackConnects(hero, { x: 170, y: 320 }, 90)).toBe(true);
    expect(attackConnects(hero, { x: 170, y: 370 }, 90)).toBe(false);
    expect(attackConnects(hero, { x: 20, y: 300 }, 90)).toBe(false);
  });

  it("uses a deterministic tie-break for branches", () => {
    expect(chooseBranch(2, 2)).toBe("crypt");
    expect(chooseBranch(1, 3)).toBe("foundry");
  });

  it("caps hit-stop and adds a kill bonus", () => {
    expect(hitStopFrames(200)).toBe(7);
    expect(hitStopFrames(1, true)).toBe(9);
    expect(scoreForHit(10, 0, true)).toBe(600);
  });

  it("rejects malformed saves and normalizes valid values", () => {
    expect(parseEmberdeepSave("{bad")).toBeNull();
    expect(parseEmberdeepSave('{"version":1,"bestScore":42.9,"deepestRoom":3.8,"preferredHero":"warden"}')).toEqual({
      version: 1,
      bestScore: 42,
      deepestRoom: 3,
      preferredHero: "warden",
    });
  });
});
