import { describe, expect, it } from "vitest";
import {
  LEGACY_SOLITAIRE_SAVE_KEY,
  SOLITAIRE_SAVE_KEY,
  loadSolitaireSaveV2,
  migrateLegacySolitaireSave,
  parseSolitaireSaveV2,
  restoredSolitaireSeconds,
  serializeSolitaireSaveV2,
  solitaireDailySeed,
  type SolitaireSaveV2,
} from "./solitaire-save";
import { applySolitaireMove, createSeededSolitaireDeal, dealSolitaire } from "./solitaire";

const TODAY = "2026-08-01";
const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

function inProgressState() {
  return applySolitaireMove(dealSolitaire(() => 0.3), { type: "draw" })!;
}

function validSave(overrides: Partial<Omit<SolitaireSaveV2, "version">> = {}): Omit<SolitaireSaveV2, "version"> {
  return {
    mode: "daily",
    dailyDate: TODAY,
    seed: solitaireDailySeed(943),
    state: inProgressState(),
    elapsedSeconds: 40,
    moves: 3,
    undoCount: 1,
    legacyMigrated: false,
    savedAtEpochMs: NOW - 7_000,
    ...overrides,
  };
}

describe("seeded solitaire deal", () => {
  it("is deterministic per seed and covers the full deck", () => {
    const first = createSeededSolitaireDeal(42);
    expect(createSeededSolitaireDeal(42)).toEqual(first);
    expect(createSeededSolitaireDeal(43)).not.toEqual(first);
    const cards = [...first.stock, ...first.waste, ...first.tableau.flat()];
    expect(new Set(cards.map((card) => card.id)).size).toBe(52);
  });

  it("derives one stable daily seed per day index", () => {
    expect(solitaireDailySeed(10)).toBe(solitaireDailySeed(10));
    expect(solitaireDailySeed(10)).not.toBe(solitaireDailySeed(11));
  });
});

describe("solitaire save v2 parser", () => {
  it("round-trips a valid in-progress save", () => {
    const save = validSave();
    const parsed = parseSolitaireSaveV2(serializeSolitaireSaveV2(save), TODAY, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("daily");
    expect(parsed?.moves).toBe(3);
    expect(parsed?.state.waste.length).toBe(save.state.waste.length);
  });

  it("fails closed on corrupt metadata or board", () => {
    expect(parseSolitaireSaveV2(null, TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2("not json {", TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ mode: "draw-3" as never })), TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ elapsedSeconds: -1 })), TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ seed: 123 })), TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ moves: 2, undoCount: 3 })), TODAY, NOW)).toBeNull();
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ savedAtEpochMs: NOW + 600_000 })), TODAY, NOW)).toBeNull();
    const duplicated = inProgressState();
    duplicated.stock[0] = { ...duplicated.stock[1] };
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ state: duplicated })), TODAY, NOW)).toBeNull();
  });

  it("rejects a stale daily but keeps free saves date-independent", () => {
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ dailyDate: "2026-07-31" })), TODAY, NOW)).toBeNull();
    const free = validSave({ mode: "free", dailyDate: "2026-07-31", seed: 123 });
    expect(parseSolitaireSaveV2(serializeSolitaireSaveV2(free), TODAY, NOW)).not.toBeNull();
  });

  it("continues wall-clock time on restore without rewinding", () => {
    const parsed = parseSolitaireSaveV2(serializeSolitaireSaveV2(validSave({ elapsedSeconds: 40, savedAtEpochMs: NOW - 12_000 })), TODAY, NOW)!;
    expect(restoredSolitaireSeconds(parsed, NOW)).toBe(52);
    expect(restoredSolitaireSeconds(parsed, parsed.savedAtEpochMs - 60_000)).toBe(40);
  });
});

describe("solitaire legacy v1 migration", () => {
  it("promotes a valid v1 board as an untimed free game", () => {
    const migrated = migrateLegacySolitaireSave(JSON.stringify({ version: 1, state: inProgressState() }), NOW);
    expect(migrated).not.toBeNull();
    expect(migrated?.mode).toBe("free");
    expect(migrated?.legacyMigrated).toBe(true);
    expect(migrated?.elapsedSeconds).toBe(0);
  });

  it("moves a v1 save to the v2 key exactly once during load", () => {
    const written = new Map<string, string>([
      [LEGACY_SOLITAIRE_SAVE_KEY, JSON.stringify({ version: 1, state: inProgressState() })],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    const loaded = loadSolitaireSaveV2(TODAY, NOW, storage);
    expect(loaded?.legacyMigrated).toBe(true);
    expect(written.has(LEGACY_SOLITAIRE_SAVE_KEY)).toBe(false);
    expect(written.has(SOLITAIRE_SAVE_KEY)).toBe(true);
    const reloaded = loadSolitaireSaveV2(TODAY, NOW, storage);
    expect(reloaded?.legacyMigrated).toBe(true);
  });

  it("discards a corrupt v1 payload instead of migrating it", () => {
    expect(migrateLegacySolitaireSave("not json {", NOW)).toBeNull();
    expect(migrateLegacySolitaireSave(JSON.stringify({ version: 1, state: { stock: [] } }), NOW)).toBeNull();
  });
});
