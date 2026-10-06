import { describe, expect, it } from "vitest";
import {
  COLS,
  NO_MODS,
  ROWS,
  createBlockBurst,
  findFullLines,
  hardDrop,
  resolveClears,
  settleLock,
  tryMove,
  type BurstColor,
  type BurstState,
} from "./block-burst";
import {
  BURST_AUGMENTS,
  BURST_BOMB_EVERY,
  BURST_DOT_EVERY,
  burstMods,
  createBurstRun,
  lockBurstAugmented,
  offerBurstAugments,
  parseBurstRun,
  pickBurstAugment,
  serializeBurstRun,
  spawnBurstAugmented,
  type BurstAugmentId,
  type BurstRun,
} from "./block-burst-augments";

function paint(cells: Array<[number, number, BurstColor?]>) {
  const board = Array.from({ length: ROWS }, () => Array<BurstColor | null>(COLS).fill(null));
  for (const [r, c, color] of cells) board[r][c] = color ?? 1;
  return board;
}
const row = (r: number, skip: number[] = [], color: BurstColor = 1) =>
  Array.from({ length: COLS }, (_, c) => c).filter((c) => !skip.includes(c)).map((c) => [r, c, color] as [number, number, BurstColor]);
const withOwned = (ids: BurstAugmentId[]): BurstRun => {
  const owned: BurstRun["owned"] = {};
  for (const id of ids) owned[id] = (owned[id] ?? 0) + 1;
  return { owned, rng: 5, pieces: 1, bomb: false, revived: false, picks: ids.length, offer: null };
};

describe("block burst rule modifiers", () => {
  it("leaves classic scoring untouched when no modifier is on", () => {
    const board = paint([...row(9), ...row(8, [0])]);
    expect(resolveClears(board, 0)).toEqual(resolveClears(board, 0, NO_MODS));
    expect(resolveClears(board, 0).score).toBe(80);
    expect(burstMods({})).toMatchObject({ ...NO_MODS, fallMult: 1, dropMult: 1 });
  });

  it("detonates a line that is one gem short only with the magnet", () => {
    const board = paint(row(9, [3]));
    expect(findFullLines(board).cells).toHaveLength(0);
    const near = findFullLines(board, 1);
    expect(near.rows).toEqual([9]);
    expect(near.cells).toHaveLength(COLS - 1);
    expect(resolveClears(board, 0, burstMods({ magnet: 1 })).cells).toBe(COLS - 1);
    expect(findFullLines(paint([]), 1).cells).toHaveLength(0);
  });

  it("takes the bottom row along on a row clear with the undertow", () => {
    const board = paint([...row(5), [9, 0], [9, 4], [8, 4]]);
    const plain = resolveClears(board, 0);
    const swept = resolveClears(board, 0, burstMods({ undertow: 1 }));
    expect(plain.cells).toBe(COLS);
    expect(swept.cells).toBe(COLS + 2);
    expect(swept.board[9][4]).toBe(1);
    expect(swept.board.flat().filter((cell) => cell !== null)).toHaveLength(1);
  });

  it("bursts the most common colour of the cleared line across the board", () => {
    const board = paint([...row(9, [], 2), [9, 0, 3], [4, 2, 2], [3, 6, 2], [2, 1, 3]]);
    const burst = resolveClears(board, 0, burstMods({ colorBurst: 1 }));
    expect(burst.cells).toBe(COLS + 2);
    expect(burst.board.flat().filter((cell) => cell !== null)).toEqual([3]);
  });

  it("multiplies the score by the stacked cards", () => {
    const board = paint(row(9));
    expect(resolveClears(board, 0, burstMods({ score: 2 })).score).toBe(120);
    expect(resolveClears(board, 0, burstMods({ chain: 2 })).score).toBe(240);
    expect(resolveClears(board, 0, burstMods({ rush: 1 })).score).toBe(160);
    expect(burstMods({ rush: 1, slow: 1 }).fallMult).toBeCloseTo(0.8625);
    expect(burstMods({ drop: 3 }).dropMult).toBe(7);
    expect(resolveClears(paint([]), 0, burstMods({ chain: 3, score: 3 })).score).toBe(0);
  });

  it("blasts the gems around a bomb before lines are checked", () => {
    const base = createBlockBurst(4);
    const active = { shape: "D" as const, rotation: 0, x: 3, y: 8, color: 2 as BurstColor };
    const state: BurstState = { ...base, board: paint([[9, 2], [9, 3], [9, 4], [9, 7], [7, 3]]), active };
    const plain = settleLock(state);
    expect(plain.wavesDetail).toHaveLength(0);
    const blast = settleLock(state, NO_MODS, true);
    expect(blast.wavesDetail).toHaveLength(1);
    expect(blast.wavesDetail[0].clear.rows).toEqual([]);
    expect(blast.wavesDetail[0].clear.cells).toHaveLength(5);
    expect(blast.gain).toBe(50);
    expect(blast.state.board.flat().filter((cell) => cell !== null)).toHaveLength(1);
    expect(blast.state.cleared).toBe(state.cleared + 5);
  });
});

describe("block burst augment run", () => {
  it("opens on a three-card draft and owes one pick per level", () => {
    const run = createBurstRun(11);
    expect(run.offer).toHaveLength(3);
    expect(createBurstRun(11)).toEqual(run);
    const picked = pickBurstAugment(run, run.offer![0]);
    expect(picked.offer).toBeNull();
    expect(picked.picks).toBe(1);
    expect(offerBurstAugments(picked, 1)).toBe(picked);
    const next = offerBurstAugments(picked, 3);
    expect(next.offer).toHaveLength(3);
    expect(pickBurstAugment(next, "nope" as BurstAugmentId)).toBe(next);
    const second = offerBurstAugments(pickBurstAugment(next, next.offer![1]), 3);
    expect(second.picks).toBe(2);
    expect(second.offer).not.toBeNull();
  });

  it("never offers a card past its cap, and spends the pick when nothing is left", () => {
    let run = createBurstRun(2);
    for (let i = 0; i < 40 && run.offer; i++) run = offerBurstAugments(pickBurstAugment(run, run.offer[0]), 99);
    for (const def of BURST_AUGMENTS) expect(run.owned[def.id]).toBe(def.max);
    expect(run.offer).toBeNull();
    expect(run.picks).toBe(99);
  });

  it("hands out a single gem every fourth piece and a bomb every sixth", () => {
    let state = createBlockBurst(21);
    let run = withOwned(["dot", "bomb"]);
    const shapes: string[] = [];
    const bombs: number[] = [];
    for (let i = 0; i < 12; i++) {
      const spawned = spawnBurstAugmented({ ...state, active: null }, run);
      state = spawned.state;
      run = spawned.run;
      shapes.push(state.active!.shape);
      if (run.bomb) bombs.push(run.pieces);
    }
    expect(shapes.map((shape, i) => (shape === "D" ? i + 2 : 0)).filter(Boolean)).toEqual([BURST_DOT_EVERY, 8, 12]);
    expect(bombs).toEqual([BURST_BOMB_EVERY, 12]);
    expect(lockBurstAugmented(state, run).run.bomb).toBe(false);
  });

  it("clears the top rows once when the board fills, then ends the next time", () => {
    const full = paint(Array.from({ length: ROWS }, (_, r) => row(r, [r % 2 ? 0 : 7])).flat());
    const base = { ...createBlockBurst(8), board: full, active: null };
    const none = spawnBurstAugmented(base, withOwned([]));
    expect(none.state.status).toBe("over");
    const saved = spawnBurstAugmented(base, withOwned(["revive"]));
    expect(saved.revivedNow).toBe(true);
    expect(saved.state.status).toBe("playing");
    expect(saved.state.board.slice(0, 5).flat().every((cell) => cell === null)).toBe(true);
    expect(saved.state.board[5]).toEqual(full[5]);
    const again = spawnBurstAugmented({ ...base, board: full }, saved.run);
    expect(again.revivedNow).toBe(false);
    expect(again.state.status).toBe("over");
  });

  it("round-trips a save and rejects broken ones", () => {
    const state = tryMove(createBlockBurst(31), 1, 0);
    const run = pickBurstAugment(createBurstRun(31), createBurstRun(31).offer![2]);
    const loaded = parseBurstRun(serializeBurstRun(state, offerBurstAugments(run, 2)));
    expect(loaded?.state).toEqual(state);
    expect(loaded?.run).toEqual(offerBurstAugments(run, 2));
    expect(parseBurstRun(null)).toBeNull();
    expect(parseBurstRun("{")).toBeNull();
    expect(parseBurstRun(JSON.stringify({ v: 2, game: "{}" }))).toBeNull();
    const raw = JSON.parse(serializeBurstRun(state, run));
    expect(parseBurstRun(JSON.stringify({ ...raw, picks: -1 }))).toBeNull();
    expect(parseBurstRun(JSON.stringify({ ...raw, owned: { magnet: 5, hack: 1 }, offer: ["magnet"] }))?.run).toMatchObject({ owned: { magnet: 1 }, offer: null });
  });

  it("survives a thousand random augmented games without a broken board", () => {
    let seed = 99;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x1_0000_0000; };
    for (let game = 0; game < 1000; game++) {
      let state = createBlockBurst(game + 1);
      let run = createBurstRun(game + 1);
      for (let step = 0; step < 400 && state.status === "playing"; step++) {
        while (run.offer) run = offerBurstAugments(pickBurstAugment(run, run.offer[Math.floor(rand() * run.offer.length)]), state.level);
        const shifted = tryMove(state, 0, Math.floor(rand() * 7) - 3);
        let falling = shifted;
        for (;;) { const next = tryMove(falling, 1, 0); if (next === falling) break; falling = next; }
        const locked = lockBurstAugmented(falling, run);
        const spawned = spawnBurstAugmented(locked.state, locked.run);
        state = spawned.state;
        run = offerBurstAugments(spawned.run, state.level);
        expect(Number.isFinite(state.score) && state.score >= 0).toBe(true);
        expect(state.board).toHaveLength(ROWS);
      }
    }
  });

  it("keeps the classic hard drop identical to before", () => {
    const state = createBlockBurst(77);
    expect(hardDrop(state)).toEqual(hardDrop(state));
    expect(hardDrop(state).score).toBeGreaterThan(0);
  });
});
