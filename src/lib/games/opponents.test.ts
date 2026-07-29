import { describe, expect, it } from "vitest";
import {
  OPPONENTS, opponentBlurb, opponentName, opponentsForTier, pickOpponent,
  type OpponentLocale,
} from "./opponents";

const LOCALES: OpponentLocale[] = ["ko", "en", "ja", "zh", "fr", "es"];

describe("opponent roster", () => {
  it("covers every tier", () => {
    for (const tier of [1, 2, 3] as const) {
      expect(opponentsForTier(tier).length).toBeGreaterThan(0);
    }
  });

  it("has a name and blurb in all six locales", () => {
    // A missing locale would surface as a raw key or an English string inside a
    // Korean UI — the class of bug that has bitten this repo before.
    for (const o of OPPONENTS) {
      for (const locale of LOCALES) {
        expect(o.name[locale], `${o.id}.name.${locale}`).toBeTruthy();
        expect(o.blurb[locale], `${o.id}.blurb.${locale}`).toBeTruthy();
      }
    }
  });

  it("uses unique ids", () => {
    const ids = OPPONENTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps korean copy free of latin letters", () => {
    // Guards the specific slip of leaving an English word inside localized copy.
    for (const o of OPPONENTS) {
      expect(o.blurb.ko, `${o.id}.blurb.ko`).not.toMatch(/[A-Za-z]/);
      expect(o.blurb.ja, `${o.id}.blurb.ja`).not.toMatch(/[A-Za-z]/);
      expect(o.blurb.zh, `${o.id}.blurb.zh`).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe("pickOpponent", () => {
  it("is deterministic for the same seed", () => {
    // Re-rendering must not swap who you are playing mid-game.
    const a = pickOpponent(2, "connect-four:2");
    const b = pickOpponent(2, "connect-four:2");
    expect(a.id).toBe(b.id);
  });

  it("only returns opponents of the requested tier", () => {
    for (const tier of [1, 2, 3] as const) {
      for (const seed of ["a", "b", "c", "gomoku", "chess:1", "reversi:9"]) {
        expect(pickOpponent(tier, seed).tier).toBe(tier);
      }
    }
  });

  it("spreads across the pool rather than always picking the first", () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, i) => pickOpponent(1, `seed-${i}`).id),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it("handles an empty seed", () => {
    expect(() => pickOpponent(1, "")).not.toThrow();
  });
});

describe("locale accessors", () => {
  it("returns the requested locale", () => {
    const harry = OPPONENTS.find((o) => o.id === "harry")!;
    expect(opponentName(harry, "ko")).toBe("해리");
    expect(opponentName(harry, "ja")).toBe("ハリー");
  });

  it("falls back to english for an unknown locale", () => {
    const harry = OPPONENTS.find((o) => o.id === "harry")!;
    expect(opponentName(harry, "de")).toBe("Harry");
    expect(opponentBlurb(harry, "de")).toBe(harry.blurb.en);
  });
});
