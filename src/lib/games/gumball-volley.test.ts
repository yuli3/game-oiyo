import { describe, expect, it } from "vitest";
import { CELL, COLS, FLOOR, PLUS, ROWS, STAGE_COUNT, VOLLEY_STAGES, X0, Y0, newShop, pilot, play, starsFor, volley, type VolleyStage } from "./gumball-volley";

const T = 60_000;
// shakier than the aimers each shop was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ aim: 0.025, seed }));

const shop = (rows: number[][], balls = 1): VolleyStage => ({ stage: 0, rows, start: rows.length, balls, par: 1 });
const empty = () => new Array(COLS).fill(0);

describe("gumball-volley", () => {
  it("knocks one off a block per hit, and pops it at zero", () => {
    // a block of 2 straight above the middle: a gumball shot straight up hits it, comes back, and is done
    const row = empty();
    row[3] = 2;
    const s = newShop(shop([row]));
    const res = volley(s, Math.PI / 2);
    expect(res.hits).toBe(1);
    expect(s.grid[3]).toBe(1);
    const s2 = newShop(shop([row], 2));
    const r2 = volley(s2, Math.PI / 2);
    expect(r2.popped).toBe(1);
    expect(s2.grid[3]).toBe(0);
    expect(r2.landX).toBeCloseTo(X0 + 3.5 * CELL, 0);
  }, T);

  it("picks up + bubbles for an extra gumball next volley", () => {
    const row = empty();
    row[3] = PLUS;
    const other = empty();
    other[0] = 5;
    const s = newShop(shop([other, row]));
    play(s, Math.PI / 2);
    expect(s.balls).toBe(2);
  }, T);

  it("brings the blocks down a row after each volley, and loses when one reaches the counter", () => {
    const row = empty();
    row[0] = 99;
    const s = newShop({ stage: 0, rows: [row], start: 1, balls: 1, par: 1 });
    let n = 0;
    while (!s.over && n++ < 20) play(s, Math.PI / 2);
    expect(s.won).toBe(false);
    expect(s.volleys).toBe(ROWS);
    expect(FLOOR).toBeGreaterThan(Y0 + ROWS * CELL);
  }, T);

  it("has 30 shops, longer later on", () => {
    expect(VOLLEY_STAGES).toHaveLength(STAGE_COUNT);
    expect(VOLLEY_STAGES[29].rows.length).toBeGreaterThan(VOLLEY_STAGES[0].rows.length);
  }, T);

  // Heavy proofs are split into stretches of shops so each test stays well inside the time limit on a busy CI runner.
  for (let from = 0; from < STAGE_COUNT; from += 5) {
    it(`lets the careful aimer clear shops ${from + 1}–${from + 5} with three stars`, () => {
      for (const st of VOLLEY_STAGES.slice(from, from + 5)) expect(starsFor(pilot(st))).toBe(3);
    }, T);
  }

  // Each human-like seed plays the shops in stretches; the last test checks at least 104 of the 120 runs win.
  const humanWins: number[] = [];
  for (const o of HUMANS) {
    for (let from = 0; from < STAGE_COUNT; from += 10) {
      it(`plays shakier human-like seed ${o.seed} on shops ${from + 1}–${from + 10}`, () => {
        let wins = 0;
        for (const st of VOLLEY_STAGES.slice(from, from + 10)) if (pilot(st, o).won) wins++;
        humanWins.push(wins);
      }, T);
    }
  }
  it("lets shakier human-like aimers clear almost every shop", () => {
    expect(humanWins).toHaveLength(HUMANS.length * 3);
    expect(humanWins.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(104);
  }, T);

  it("rarely clears a shop aiming at random", () => {
    let wins = 0;
    for (const st of VOLLEY_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of VOLLEY_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
