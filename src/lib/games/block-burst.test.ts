import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  applyGravity,
  canPlace,
  createBlockBurst,
  findFullLines,
  hardDrop,
  parseBurst,
  pieceCells,
  resolveClears,
  rerollQueue,
  serializeBurst,
  tickGravity,
  tryMove,
  tryRotate,
  isBoardClear,
  PERFECT_CLEAR_BONUS,
  type BurstColor,
  type BurstState,
} from "./block-burst";
import {
  INITIAL_BLOCK_BURST_QUESTS,
} from "./block-burst-quests";
import {
  pickBlockBurstDialogue,
} from "./block-burst-lore";
import {
  BLOCK_BURST_UPGRADES,
  computeBlockBurstModifiers,
  getBlockBurstUpgradeCost,
  type BlockBurstMetaSave,
} from "./block-burst-meta";

function paint(cells: Array<[number, number]>, color: BurstColor = 1) {
  const board = Array.from({ length: ROWS }, () => Array<BurstColor | null>(COLS).fill(null));
  for (const [r, c] of cells) board[r][c] = color;
  return board;
}

describe("block burst engine", () => {
  it("creates a deterministic spawn and a full next queue", () => {
    expect(createBlockBurst(9)).toEqual(createBlockBurst(9));
    const game = createBlockBurst(3);
    expect(game.active).not.toBeNull();
    expect(game.queue).toHaveLength(3);
    expect(game.status).toBe("playing");
    expect(canPlace(game.board, game.active!)).toBe(true);
  });

  it("clears a full row and drops blocks above it", () => {
    const board = paint(
      Array.from({ length: COLS }, (_, c) => [ROWS - 1, c] as [number, number]).concat([[ROWS - 2, 0]]),
    );
    const found = findFullLines(board);
    expect(found.rows).toEqual([ROWS - 1]);
    expect(found.cols).toEqual([]);
    const resolved = resolveClears(board);
    expect(resolved.waves).toBe(1);
    expect(resolved.cells).toBe(COLS);
    expect(resolved.board[ROWS - 1][0]).toBe(1);
    expect(resolved.board[ROWS - 1][1]).toBeNull();
  });

  it("clears a full column", () => {
    const board = paint(Array.from({ length: ROWS }, (_, r) => [r, 2] as [number, number]));
    const found = findFullLines(board);
    expect(found.cols).toEqual([2]);
    expect(resolveClears(board).board.every((row) => row[2] === null)).toBe(true);
  });

  it("explodes intersecting rows and columns in one wave, then chains", () => {
    const board = paint([
      ...Array.from({ length: COLS }, (_, c) => [ROWS - 1, c] as [number, number]),
      ...Array.from({ length: ROWS - 1 }, (_, r) => [r, 0] as [number, number]),
    ]);
    const found = findFullLines(board);
    expect(found.rows).toEqual([ROWS - 1]);
    expect(found.cols).toEqual([0]);
    const resolved = resolveClears(board);
    expect(resolved.waves).toBeGreaterThanOrEqual(1);
    expect(resolved.score).toBeGreaterThan(resolved.cells * 10);
    expect(resolved.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("applies downward gravity after holes", () => {
    const board = paint([[0, 3], [2, 3]]);
    const next = applyGravity(board);
    expect(next[ROWS - 1][3]).toBe(1);
    expect(next[ROWS - 2][3]).toBe(1);
    expect(next[0][3]).toBeNull();
  });

  it("moves, rotates, and hard-drops a live piece", () => {
    const game = createBlockBurst(11);
    const right = tryMove(game, 0, 1);
    expect(right.active?.x).toBe((game.active?.x ?? 0) + 1);
    const rotated = tryRotate(game);
    expect(pieceCells(rotated.active!).length).toBeGreaterThanOrEqual(4);
    const dropped = hardDrop(game);
    expect(dropped.score).toBeGreaterThan(game.score);
    expect(dropped.board.flat().some(Boolean) || dropped.status === "over").toBe(true);
  });

  it("locks when gravity cannot drop further", () => {
    let state: BurstState = createBlockBurst(21);
    for (let i = 0; i < ROWS + 4; i++) state = tickGravity(state);
    expect(state.board.flat().some(Boolean) || state.status === "over").toBe(true);
  });

  it("round-trips an active save and rejects junk", () => {
    const game = createBlockBurst(4);
    const restored = parseBurst(serializeBurst(game));
    expect(restored?.score).toBe(0);
    expect(restored?.queue).toHaveLength(3);
    expect(parseBurst('{"v":1}')).toBeNull();
    expect(parseBurst(null)).toBeNull();
  });

  it("rerolls queue with 3 new pieces when rerollQueue is called", () => {
    const game = createBlockBurst(10);
    const initialQueue = game.queue.map((p) => ({ ...p }));
    const rerolled = rerollQueue(game);
    expect(rerolled.queue).toHaveLength(3);
    expect(rerolled.queue).not.toEqual(initialQueue);
    expect(rerolled.status).toBe("playing");
    expect(rerolled.rng).not.toBe(game.rng);
  });

  it("detects completely cleared board for perfect clear reward", () => {
    const emptyBoard = Array.from({ length: ROWS }, () => Array<BurstColor | null>(COLS).fill(null));
    expect(isBoardClear(emptyBoard)).toBe(true);

    const nonEmpty = paint([[ROWS - 1, 0]], 1);
    expect(isBoardClear(nonEmpty)).toBe(false);
    expect(PERFECT_CLEAR_BONUS).toBe(1000);
  });
});

describe("block burst deepening systems (quests, lore, meta)", () => {
  it("defines 4 arcade mind quests with 6 locales", () => {
    expect(INITIAL_BLOCK_BURST_QUESTS).toHaveLength(4);
    for (const q of INITIAL_BLOCK_BURST_QUESTS) {
      expect(q.title.ko).toBeDefined();
      expect(q.title.en).toBeDefined();
      expect(q.desc.ko).toBeDefined();
      expect(q.rewardRunes).toBeGreaterThan(0);
      expect(q.maxProgress).toBeGreaterThan(0);
    }
  });

  it("picks lore dialogues across all 5 game triggers", () => {
    const triggers = ["game_start", "line_cleared", "combo_fever", "grid_danger", "game_over"] as const;
    for (const tr of triggers) {
      const dialogue = pickBlockBurstDialogue(tr);
      expect(dialogue).toBeDefined();
      expect(dialogue.speaker).toBeDefined();
      expect(dialogue.name.ko).toBeDefined();
      expect(dialogue.text.ko).toBeDefined();
      expect(dialogue.avatar).toBeDefined();
    }
  });

  it("calculates 5-tier sanctuary upgrades and cost progression", () => {
    expect(BLOCK_BURST_UPGRADES).toHaveLength(5);
    const resonance = BLOCK_BURST_UPGRADES.find((u) => u.id === "crystal_resonance")!;
    expect(resonance.maxLevel).toBe(5);
    expect(getBlockBurstUpgradeCost(resonance, 0)).toBe(150);
    expect(getBlockBurstUpgradeCost(resonance, 1)).toBe(Math.round(150 * 1.6));
    expect(getBlockBurstUpgradeCost(resonance, 5)).toBe(0);
  });

  it("computes active modifiers from upgrade levels", () => {
    const emptySave: BlockBurstMetaSave = {
      version: 1,
      walletRunes: 0,
      upgradeLevels: {},
      totalLinesCleared: 0,
      totalGamesPlayed: 0,
    };
    const baseMods = computeBlockBurstModifiers(emptySave);
    expect(baseMods.scoreMult).toBe(1.0);
    expect(baseMods.emergencyCleanses).toBe(0);
    expect(baseMods.runeHarvestMult).toBe(1.0);

    const upgradedSave: BlockBurstMetaSave = {
      version: 1,
      walletRunes: 500,
      upgradeLevels: {
        crystal_resonance: 2,
        emergency_cleanse: 1,
        crystal_harvest: 3,
      },
      totalLinesCleared: 10,
      totalGamesPlayed: 2,
    };
    const mods = computeBlockBurstModifiers(upgradedSave);
    expect(mods.scoreMult).toBeCloseTo(1.3);
    expect(mods.emergencyCleanses).toBe(1);
    expect(mods.runeHarvestMult).toBeCloseTo(1.75);
  });
});

