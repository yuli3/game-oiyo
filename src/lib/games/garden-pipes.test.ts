import { describe, expect, it } from "vitest";
import { E, N, PIPES_STAGES, S, STAGE_COUNT, W, joined, newGarden, pilot, starsFor, tap, turn, turnsTo, wet, type PipeStage } from "./garden-pipes";

const T = 60_000;
// slip more often than the gardeners each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.16, seed }));

// a 2 × 1 garden: the tap on the left tile, a pipe running right into a flower
const tiny = (start: number[]): PipeStage => ({ stage: 0, cols: 2, rows: 1, source: 0, solved: [E, W], start, par: 1, limit: 5 });

describe("garden-pipes", () => {
  it("turns a tile a quarter turn clockwise", () => {
    expect(turn(N)).toBe(E);
    expect(turn(W)).toBe(N);
    expect(turn(N | E)).toBe(E | S);
    expect(turnsTo(N | S, E | W)).toBe(1);
    expect(turnsTo(N, N | E)).toBe(-1);
  }, T);

  it("joins up only with every tile wet and no open end", () => {
    const st = tiny([0, 0]);
    expect(joined(st, [E, W])).toBe(true);
    expect(joined(st, [E, S])).toBe(false); // an open end, and the flower dry
    expect(wet(st, [E, N])).toEqual([true, false]);
  }, T);

  it("wins when the last tile turns into place, and counts the taps", () => {
    const g = newGarden(tiny([0, 1])); // the flower starts a quarter turn back (facing down)
    expect(g.tiles[1]).toBe(S);
    tap(g, 0); // the tap's tile, turned off and …
    tap(g, 0);
    tap(g, 0);
    tap(g, 0); // … back round
    tap(g, 1);
    expect(g.won).toBe(true);
    expect(g.taps).toBe(5);
    expect(starsFor(g)).toBe(2); // par 1, within par + 4
  }, T);

  it("has 30 gardens, bigger later on", () => {
    expect(PIPES_STAGES).toHaveLength(STAGE_COUNT);
    expect(PIPES_STAGES[29].cols * PIPES_STAGES[29].rows).toBeGreaterThan(PIPES_STAGES[0].cols * PIPES_STAGES[0].rows);
    for (const st of PIPES_STAGES) {
      expect(joined(st, st.solved)).toBe(true);
      expect(st.limit).toBeGreaterThan(st.par);
    }
  }, T);

  it("keeps the answer's taps, which join every garden in par for three stars", () => {
    for (const st of PIPES_STAGES) {
      const g = pilot(st, { mode: "plan" });
      expect(g.won).toBe(true);
      expect(g.taps).toBe(st.par);
      expect(starsFor(g)).toBe(3);
    }
  }, T);

  it("lets human-like gardeners who slip more often join almost every garden", () => {
    let wins = 0;
    for (const st of PIPES_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("never joins a garden tapping at random", () => {
    let wins = 0;
    for (const st of PIPES_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of PIPES_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
