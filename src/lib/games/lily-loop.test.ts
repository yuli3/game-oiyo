import { describe, expect, it } from "vitest";
import { EMPTY, LILY_STAGES, STAGE_COUNT, canSend, critter, lap, lapLength, lineAt, newPond, pilot, send, starsFor, tick, type LilyStage } from "./lily-loop";

const T = 60_000;
// send without looking more often than the keepers each pond was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.15, seed }));

/** A 2 × 3 mosaic: top row colour 0, bottom row colour 1. */
function tiny(lanes: LilyStage["lanes"], pads = 1): LilyStage {
  return { stage: 0, rows: 2, cols: 3, cells: [0, 0, 0, 1, 1, 1], colors: ["#f00", "#00f"], lanes, pads, plan: [], par: 2 };
}

describe("lily-loop", () => {
  it("looks along each side of the mosaic, nearest cell first", () => {
    const st = tiny([]);
    expect(lapLength(st)).toBe(10);
    expect(lineAt(st, 0)).toEqual([0, 3]); // top, first column, looking down
    expect(lineAt(st, 3)).toEqual([2, 1, 0]); // right side, top row, looking left
    expect(lineAt(st, 5)).toEqual([5, 2]); // bottom, last column, looking up
    expect(lineAt(st, 9)).toEqual([0, 1, 2]); // left side, top row, looking right
  }, T);

  it("eats only its own colour that it can see, as far as that colour goes", () => {
    const st = tiny([[[1, 3]], [[0, 3]]]);
    const p = newPond(st);
    lap(p, 0); // the blue frog: from the top it sees red first, so it eats only from the sides and bottom
    expect(p.cells.slice(3)).toEqual([EMPTY, EMPTY, EMPTY]);
    expect(p.cells.slice(0, 3)).toEqual([0, 0, 0]);
    lap(p, 1);
    expect(p.won).toBe(true);
    expect(starsFor(p)).toBe(3);
  }, T);

  it("puts a still-hungry frog on a pad, and jams when the pads are full", () => {
    const st = tiny([[[1, 4], [1, 4]], [[0, 3]]], 1);
    const p = newPond(st);
    lap(p, 0); // eats 3 blue, 1 left: waits on the pad
    expect(p.pads[0]).toEqual([1, 1]);
    lap(p, 0); // nothing blue left to eat, and the pad is taken
    expect(p.over).toBe(true);
    expect(p.why).toBe("jam");
  }, T);

  it("only sends a frog when the start of the loop is clear", () => {
    const p = newPond(tiny([[[0, 3]], [[1, 3]]], 1));
    expect(send(p, 0)).toBe(true);
    expect(canSend(p)).toBe(false);
    tick(p);
    tick(p);
    expect(canSend(p)).toBe(false); // it has only reached the second pad
    tick(p);
    expect(canSend(p)).toBe(true);
  }, T);

  it("draws round, mirrored critters for the later ponds", () => {
    const pic = critter(1, 11, 5);
    expect(pic.rows).toHaveLength(11);
    for (const row of pic.rows) expect(row).toBe(row.split("").reverse().join(""));
    expect(new Set(pic.rows.join("").replace(/\./g, "")).size).toBeGreaterThanOrEqual(4);
  }, T);

  it("has 30 ponds, from 2 colours to 5 and fewer waiting pads later", () => {
    expect(LILY_STAGES).toHaveLength(STAGE_COUNT);
    expect(LILY_STAGES[0].colors).toHaveLength(2);
    expect(Math.max(...LILY_STAGES.slice(22).map((s) => s.colors.length))).toBe(5);
    expect(LILY_STAGES[0].pads).toBeGreaterThan(LILY_STAGES[29].pads);
    for (const st of LILY_STAGES) {
      // every frog's berries add up to exactly the picture
      st.colors.forEach((_, k) => {
        const cells = st.cells.filter((v) => v === k).length;
        const food = st.lanes.flat().filter((f) => f[0] === k).reduce((n, f) => n + f[1], 0);
        expect(food).toBe(cells);
      });
      expect(st.par).toBe(st.plan.length);
    }
  }, T);

  it("clears every pond with its plan, for three stars", () => {
    for (const st of LILY_STAGES) {
      const p = pilot(st, { mode: "plan" });
      expect(p.won).toBe(true);
      expect(p.sends).toBe(st.par);
      expect(starsFor(p)).toBe(3);
    }
  }, T);

  it("lets human-like keepers who look less often clear almost every pond", () => {
    let wins = 0;
    for (const st of LILY_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("rewards planning: random sends rarely earn three stars, and from stage 21 they mostly jam", () => {
    let three = 0;
    for (const st of LILY_STAGES.slice(10)) for (const seed of [21, 22, 23, 24]) if (starsFor(pilot(st, { mode: "random", seed })) === 3) three++;
    expect(three).toBeLessThan(20);
    let wins = 0;
    for (const st of LILY_STAGES.slice(20)) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of LILY_STAGES.slice(20)) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
