import { describe, expect, it } from "vitest";
import {
  KINGDOMINO_SAVE_KEY,
  clearKingdominoSave,
  loadKingdominoSave,
  parseKingdominoSave,
  serializeKingdominoSave,
  storeKingdominoSave,
} from "./kingdomino-save";
import { startGame, claim, place, type GameState } from "./ai/kingdomino";
import { allLegalPlacements } from "./kingdomino";

const NOW = 2_000_000;

function fixedRng(sequence: number[]): () => number {
  let index = 0;
  return () => sequence[Math.min(index++, sequence.length - 1)];
}

/** Plays through the four setup claims so the game reaches its first "place" turn. */
function freshRoundState(): GameState {
  const s = startGame(fixedRng([0.1, 0.2, 0.3, 0.4, 0.5]));
  while (s.pending.kind === "claim") {
    claim(s, s.pending.options[0]);
  }
  return s;
}

function validSave(overrides: Partial<GameState> = {}) {
  const state = { ...freshRoundState(), ...overrides };
  return { state, level: 2 as const, savedAtEpochMs: NOW - 1_000 };
}

describe("kingdomino save v1 parser", () => {
  it("round-trips a valid post-setup state", () => {
    const save = validSave();
    const parsed = parseKingdominoSave(serializeKingdominoSave(save), NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.state.phase).toBe("round");
    expect(parsed?.level).toBe(2);
  });

  it("round-trips a state with an in-progress placement on the board", () => {
    const s = freshRoundState();
    if (s.pending.kind === "place") {
      const legal = allLegalPlacements(s.you.board, s.pending.tile);
      if (s.pending.owner === "you" && legal.length > 0) place(s, legal[0]);
    }
    const parsed = parseKingdominoSave(serializeKingdominoSave({ state: s, level: 1, savedAtEpochMs: NOW - 1_000 }), NOW);
    expect(parsed).not.toBeNull();
  });

  it("fails closed on corrupt or foreign payloads", () => {
    expect(parseKingdominoSave(null, NOW)).toBeNull();
    expect(parseKingdominoSave("not json {", NOW)).toBeNull();
    expect(parseKingdominoSave(serializeKingdominoSave({ ...validSave(), level: 4 as never }), NOW)).toBeNull();
    expect(parseKingdominoSave(serializeKingdominoSave({ ...validSave(), savedAtEpochMs: NOW + 600_000 }), NOW)).toBeNull();
  });

  it("rejects a gameover phase/pending as non-resumable", () => {
    const save = validSave({ phase: "gameover" as GameState["phase"] });
    expect(parseKingdominoSave(serializeKingdominoSave(save), NOW)).toBeNull();
    const save2 = validSave();
    save2.state.pending = { kind: "gameover" };
    expect(parseKingdominoSave(serializeKingdominoSave(save2), NOW)).toBeNull();
  });

  it("rejects a tile with a terrain/crown combination that doesn't match its id", () => {
    const s = freshRoundState();
    const tampered = { ...s, deck: s.deck.map((tile, i) => (i === 0 ? { ...tile, a: { ...tile.a, crowns: 9 } } : tile)) };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });

  it("rejects a duplicated tile id inside the deck", () => {
    const s = freshRoundState();
    const tampered = { ...s, deck: [s.deck[0], ...s.deck.slice(1, 23), s.deck[0]] };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });

  it("rejects a current/draft slot referencing a tile id outside the saved deck", () => {
    const s = freshRoundState();
    const foreignTile = { id: 47, a: { terrain: "mine" as const, crowns: 3 }, b: { terrain: "wheat" as const, crowns: 0 } };
    const tampered = { ...s, current: [{ tile: foreignTile, owner: "you" as const }, ...s.current.slice(1)] };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });

  it("rejects a claim pending whose options don't match the draft's actual unclaimed slots", () => {
    const s = startGame(fixedRng([0.1, 0.2, 0.3, 0.4]));
    expect(s.pending.kind).toBe("claim");
    const tampered = { ...s, pending: { kind: "claim" as const, owner: (s.pending as { owner: "you" | "ai" }).owner, options: [] } };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });

  it("rejects a place pending whose canPlace flag lies about legal placements", () => {
    const s = freshRoundState();
    if (s.pending.kind === "place") {
      const tampered = { ...s, pending: { ...s.pending, canPlace: !s.pending.canPlace } };
      expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
    }
  });

  it("rejects a board occupying more than a 5x5 footprint", () => {
    const s = freshRoundState();
    const board = s.you.board.map((row) => [...row]);
    board[0][0] = "wheat";
    board[8][8] = "wheat"; // both corners together span 9 rows/cols — well past the 5x5 kingdom cap
    const tampered = { ...s, you: { ...s.you, board } };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });

  it("rejects a crown recorded on an empty cell", () => {
    const s = freshRoundState();
    const crowns = s.you.crowns.map((row) => [...row]);
    crowns[0][0] = 1; // (0,0) has no terrain
    const tampered = { ...s, you: { ...s.you, crowns } };
    expect(parseKingdominoSave(serializeKingdominoSave({ state: tampered, level: 2, savedAtEpochMs: NOW - 1_000 }), NOW)).toBeNull();
  });
});

describe("kingdomino save storage", () => {
  it("stores, loads, and clears through an in-memory storage shim", () => {
    const written = new Map<string, string>();
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    storeKingdominoSave(validSave(), storage);
    expect(written.has(KINGDOMINO_SAVE_KEY)).toBe(true);
    expect(loadKingdominoSave(NOW, storage)?.level).toBe(2);
    clearKingdominoSave(storage);
    expect(written.has(KINGDOMINO_SAVE_KEY)).toBe(false);
  });

  it("never throws on blocked storage", () => {
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => storeKingdominoSave(validSave(), throwing)).not.toThrow();
    expect(loadKingdominoSave(NOW, throwing)).toBeNull();
    expect(() => clearKingdominoSave(throwing)).not.toThrow();
  });
});
