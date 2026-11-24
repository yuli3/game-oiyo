import { describe, expect, it } from "vitest";
import { BENCH, COLS, EMPTY, GONDOLA_STAGES, ROCK, STAGE_COUNT, canLeave, newStation, pilot, starsFor, tap, type GondolaStage } from "./gondola-queue";

const T = 60_000;
// sloppier than the tappers each station was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.12, seed }));

describe("gondola-queue", () => {
  it("lets a hiker leave only along empty cells to the top", () => {
    const g = [0, 1, EMPTY, 0, 0, 0, 1, ROCK, 2, 1, 1, 1];
    expect(canLeave(g, 2, 0)).toBe(true); // top row
    expect(canLeave(g, 2, 8)).toBe(true); // the empty cell above
    expect(canLeave(g, 2, 6)).toBe(false); // hemmed in
    expect(canLeave(g, 2, 7)).toBe(false); // a rock is nobody
    expect(COLS).toBe(6);
  }, T);

  it("seats three of the gondola's colour, benches the rest, and boards them when their gondola comes", () => {
    const st: GondolaStage = { stage: 0, rows: 1, grid: [1, 0, 0, 0, 1, 1], gondolas: [0, 1], par: 1 };
    const s = newStation(st);
    expect(tap(s, 0)).toBe("benched");
    expect(s.bench).toEqual([1]);
    tap(s, 1);
    tap(s, 2);
    expect(tap(s, 3)).toBe("departed");
    expect(s.aboard).toBe(1); // the benched hiker hopped on
    expect(s.bench).toEqual([]);
    tap(s, 4);
    expect(tap(s, 5)).toBe("departed");
    expect(s.won).toBe(true);
    expect(starsFor(s)).toBe(3);
  }, T);

  it("jams when five wait on the bench", () => {
    const st: GondolaStage = { stage: 0, rows: 1, grid: [1, 1, 1, 2, 2, 0], gondolas: [0, 1, 2], par: 1 };
    const s = newStation(st);
    for (let k = 0; k < BENCH; k++) tap(s, k);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  }, T);

  it("has 30 stations with a whole number of gondolas and a crowd that grows", () => {
    expect(GONDOLA_STAGES).toHaveLength(STAGE_COUNT);
    for (const st of GONDOLA_STAGES) {
      const hikers = st.grid.filter((x) => x >= 0).length;
      expect(hikers).toBe(st.gondolas.length * 3);
      for (const c of new Set(st.gondolas)) expect(st.grid.filter((x) => x === c).length).toBe(st.gondolas.filter((x) => x === c).length * 3);
    }
    expect(GONDOLA_STAGES[29].gondolas.length).toBeGreaterThan(GONDOLA_STAGES[0].gondolas.length);
  }, T);

  it("lets careful players send every crowd up with three stars", () => {
    for (const st of GONDOLA_STAGES) {
      const s = pilot(st, { seed: 1 });
      expect(s.won).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  }, T);

  it("lets human-like players who tap carelessly now and then clear almost every station", () => {
    let wins = 0;
    for (const st of GONDOLA_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("jams the station for players who tap at random", () => {
    let wins = 0;
    for (const st of GONDOLA_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(12);
    for (const st of GONDOLA_STAGES.slice(2)) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
