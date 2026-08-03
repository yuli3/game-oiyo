import { describe, expect, it } from "vitest";
import {
  FREECELL_SAVE_KEY,
  LEGACY_FREECELL_SAVE_KEY,
  clearLegacyFreeCellSave,
  loadFreeCellSaveV2,
  migrateLegacyFreeCellSave,
  parseFreeCellSaveV2,
  serializeFreeCellSaveV2,
  storeFreeCellSaveV2,
  type FreeCellSaveV2,
} from "./freecell-save";
import { createFreeCellGame, moveFreeCellCards, FREECELL_SUITS, type FreeCellState } from "./freecell";

const NOW = 2_000_000;

function dealAndMoveOne(): FreeCellState {
  const game = createFreeCellGame(() => 0.42);
  // Move the top card of pile 0 into the first empty free cell — always legal.
  const result = moveFreeCellCards(game, { type: "tableau", index: 0, cardIndex: game.tableau[0].length - 1 }, { type: "free", index: 0 });
  if (!result.ok) throw new Error("bad fixture move");
  return result.state;
}

function wonState(): FreeCellState {
  return {
    tableau: Array.from({ length: 8 }, () => []),
    freeCells: [null, null, null, null],
    foundation: FREECELL_SUITS.map((suit) => Array.from({ length: 13 }, (_, index) => ({
      suit,
      power: index + 1,
      value: index === 0 ? "A" : index === 10 ? "J" : index === 11 ? "Q" : index === 12 ? "K" : String(index + 1),
      isRed: suit === "hearts" || suit === "diamonds",
      id: `${suit}-${index + 1}`,
    }))),
  };
}

function validSave(overrides: Partial<Omit<FreeCellSaveV2, "version">> = {}): Omit<FreeCellSaveV2, "version"> {
  return {
    state: dealAndMoveOne(),
    moves: 1,
    elapsedSeconds: 12,
    legacyMigrated: false,
    savedAtEpochMs: NOW - 1_000,
    ...overrides,
  };
}

describe("freecell save v2 parser", () => {
  it("round-trips a valid in-progress game", () => {
    const save = validSave();
    const parsed = parseFreeCellSaveV2(serializeFreeCellSaveV2(save), NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.moves).toBe(1);
    expect(parsed?.legacyMigrated).toBe(false);
  });

  it("fails closed on corrupt or foreign payloads", () => {
    expect(parseFreeCellSaveV2(null, NOW)).toBeNull();
    expect(parseFreeCellSaveV2("not json {", NOW)).toBeNull();
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(validSave({ moves: -1 })), NOW)).toBeNull();
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(validSave({ elapsedSeconds: -1 })), NOW)).toBeNull();
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(validSave({ savedAtEpochMs: NOW + 600_000 })), NOW)).toBeNull();
    expect(parseFreeCellSaveV2(JSON.stringify({ ...validSave(), legacyMigrated: "no" }), NOW)).toBeNull();
  });

  it("rejects an already-won board as non-restorable", () => {
    const save = validSave({ state: wonState() });
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(save), NOW)).toBeNull();
  });

  it("rejects a tampered card (mismatched suit/power/id)", () => {
    const state = dealAndMoveOne();
    const tampered: FreeCellState = { ...state, freeCells: [{ ...state.freeCells[0]!, power: 13 }, null, null, null] };
    const save = validSave({ state: tampered });
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(save), NOW)).toBeNull();
  });

  it("rejects a duplicated or incomplete deck", () => {
    const state = dealAndMoveOne();
    const duplicated: FreeCellState = { ...state, tableau: [[...state.tableau[0], state.freeCells[0]!], ...state.tableau.slice(1)] };
    const save = validSave({ state: duplicated });
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(save), NOW)).toBeNull();
  });
});

describe("freecell legacy v1 migration", () => {
  it("promotes a valid in-progress v1 board without fabricating moves or timing", () => {
    const state = dealAndMoveOne();
    const migrated = migrateLegacyFreeCellSave(JSON.stringify({ version: 1, state }));
    expect(migrated).not.toBeNull();
    expect(migrated?.moves).toBe(0);
    expect(migrated?.elapsedSeconds).toBe(0);
    expect(migrated?.legacyMigrated).toBe(true);
    // migrateLegacyFreeCellSave stamps savedAtEpochMs with the real clock, not NOW.
    expect(parseFreeCellSaveV2(serializeFreeCellSaveV2(migrated!), Date.now())).not.toBeNull();
  });

  it("rejects migrating an already-won or corrupt v1 board", () => {
    expect(migrateLegacyFreeCellSave(JSON.stringify({ version: 1, state: wonState() }))).toBeNull();
    expect(migrateLegacyFreeCellSave("not json {")).toBeNull();
    expect(migrateLegacyFreeCellSave(null)).toBeNull();
  });

  it("moves a v1 save to the v2 key exactly once during load", () => {
    const state = dealAndMoveOne();
    const written = new Map<string, string>([
      [LEGACY_FREECELL_SAVE_KEY, JSON.stringify({ version: 1, state })],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    // loadFreeCellSaveV2's migration path stamps savedAtEpochMs with the real
    // clock, so read it back with the real clock too rather than fixed NOW.
    const loaded = loadFreeCellSaveV2(Date.now(), storage);
    expect(loaded?.legacyMigrated).toBe(true);
    expect(written.has(LEGACY_FREECELL_SAVE_KEY)).toBe(false);
    expect(written.has(FREECELL_SAVE_KEY)).toBe(true);
    const reloaded = loadFreeCellSaveV2(Date.now(), storage);
    expect(reloaded?.legacyMigrated).toBe(true);
  });

  it("removes only the legacy key and never throws on blocked storage", () => {
    const written = new Map<string, string>([
      [LEGACY_FREECELL_SAVE_KEY, "{}"],
      [FREECELL_SAVE_KEY, "keep"],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    clearLegacyFreeCellSave(storage);
    expect(written.has(LEGACY_FREECELL_SAVE_KEY)).toBe(false);
    expect(written.get(FREECELL_SAVE_KEY)).toBe("keep");
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => clearLegacyFreeCellSave(throwing)).not.toThrow();
    expect(loadFreeCellSaveV2(NOW, throwing)).toBeNull();
    expect(() => storeFreeCellSaveV2(validSave(), throwing)).not.toThrow();
  });
});
