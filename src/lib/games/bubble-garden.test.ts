import { describe, expect, it } from "vitest";
import {
  BOMB, EMPTY, LEVEL_COUNT, RAINBOW, STONE, buildLevel, colorCount, emptyGrid, newGame, bestAngle, neighbors,
  removeFloating, resolveShot, rowLength, swap, traceShot, type GameState,
} from "./bubble-garden";

function autoplay(index: number, seed?: number): GameState {
  let s = newGame(index, seed);
  while (s.status === "play" && s.shots < 300) {
    const b = bestAngle(s);
    if (b.swap) s = swap(s);
    s = resolveShot(s, traceShot(s.grid, b.angle, s.drops).cell).state;
  }
  return s;
}

describe("bubble garden", () => {
  it("has 30 deterministic stages that get harder", () => {
    expect(LEVEL_COUNT).toBe(30);
    expect(buildLevel(12)).toEqual(buildLevel(12));
    expect(buildLevel(29).colors).toBeGreaterThan(buildLevel(0).colors);
    expect(colorCount(buildLevel(29).grid)).toBeGreaterThan(colorCount(buildLevel(0).grid));
    // stones from stage 11, bombs from stage 16
    const has = (i: number, v: number) => buildLevel(i).grid.some((row) => row.includes(v));
    expect(has(5, STONE) || has(5, BOMB)).toBe(false);
    expect(has(12, STONE)).toBe(true);
    expect(has(20, BOMB)).toBe(true);
  });

  it("never starts with floating bubbles or a one-colour ceiling", () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const g = buildLevel(i).grid.map((r) => r.slice());
      expect(removeFloating(g)).toHaveLength(0);
      const top = buildLevel(i).grid[0];
      for (let c = 2; c < top.length; c++) expect(top[c] === top[c - 1] && top[c] === top[c - 2]).toBe(false);
    }
  });

  it("hex neighbours are symmetric", () => {
    for (let r = 0; r < 6; r++) for (let c = 0; c < rowLength(r); c++) {
      for (const [a, b] of neighbors(r, c)) expect(neighbors(a, b).some(([x, y]) => x === r && y === c)).toBe(true);
    }
  });

  it("pops three of a colour and drops what hangs below", () => {
    const g = emptyGrid();
    g[0][0] = 0; g[0][1] = 0; g[1][0] = 1; g[2][0] = 2;
    const s: GameState = { ...newGame(0), grid: g, current: 0, next: 0 };
    const res = resolveShot(s, [0, 2]);
    expect(res.popped).toHaveLength(3);
    expect(res.dropped.map((d) => d.value).sort()).toEqual([1, 2]);
    expect(res.state.grid[1][0]).toBe(EMPTY);
  });

  it("a miss counts toward the ceiling drop; a big pop earns a rainbow", () => {
    let s: GameState = { ...newGame(0), missesPerDrop: 2 };
    const g = emptyGrid();
    g[0][0] = 1; g[0][4] = 2;
    s = { ...s, grid: g, current: 0, next: 0 };
    s = resolveShot(s, [0, 8]).state;
    expect(s.misses).toBe(1);
    s = resolveShot(s, [0, 7]).state;
    expect(s.drops).toBe(1);
    expect(s.misses).toBe(0);

    const big = emptyGrid();
    for (let c = 0; c < 7; c++) big[0][c] = 3;
    big[0][8] = 1;
    const r = resolveShot({ ...newGame(0), grid: big, current: 3, next: 1 }, [1, 0]);
    expect(r.rainbowEarned).toBe(true);
    expect(r.state.current).toBe(RAINBOW);
  });

  it("bombs clear their neighbours, stones included", () => {
    const g = emptyGrid();
    g[0][0] = 0; g[0][1] = 0; g[0][2] = BOMB; g[0][3] = STONE; g[0][5] = 1;
    const res = resolveShot({ ...newGame(0), grid: g, current: 0, next: 0 }, [1, 0]);
    expect(res.exploded.length).toBeGreaterThanOrEqual(2);
    expect(res.state.grid[0][3]).toBe(EMPTY);
  });

  it("a careful player can clear every stage", () => {
    let wins = 0;
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const won = [undefined, 11, 23].some((seed) => autoplay(i, seed).status === "won");
      expect(won, `stage ${i + 1}`).toBe(true);
      wins += won ? 1 : 0;
    }
    expect(wins).toBe(LEVEL_COUNT);
  }, 60_000);
});
