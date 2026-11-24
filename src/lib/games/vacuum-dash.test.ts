import { describe, expect, it } from "vitest";
import { STAGE_COUNT, VACUUM_STAGES, newRoom, pilot, slide, slidePath, starsFor, type VacuumStage } from "./vacuum-dash";

const T = 60_000;
// clumsier than the cleaners each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.1, seed }));

// . floor, # furniture; the robot starts top left
const room = (rows: string[], limit = 10): VacuumStage => ({
  stage: 0,
  cols: rows[0].length,
  rows: rows.length,
  floor: rows.join("").split("").map((c) => c !== "#"),
  start: 0,
  plan: [],
  par: 2,
  limit,
});

describe("vacuum-dash", () => {
  it("slides until it bumps into something, cleaning on the way", () => {
    const st = room(["...#", "#..#", "...."]);
    expect(slidePath(st, 0, 1)).toEqual([1, 2]); // right, stopped by the furniture at 3
    expect(slidePath(st, 0, 0)).toEqual([]); // the wall
    const r = newRoom(st);
    expect(r.left).toBe(st.floor.filter(Boolean).length - 1);
    expect(slide(r, 0)).toEqual([]); // blocked: no move spent
    expect(r.moves).toBe(0);
    slide(r, 1);
    expect(r.at).toBe(2);
    expect(r.clean[1] && r.clean[2]).toBe(true);
    expect(r.moves).toBe(1);
  }, T);

  it("wins when the floor is clean and loses when the moves run out", () => {
    const st = room(["..", ".."], 3);
    const r = newRoom(st);
    slide(r, 1);
    slide(r, 2);
    slide(r, 3);
    expect(r.won).toBe(true);
    expect(starsFor(r)).toBe(2); // 3 moves, par 2
    const l = newRoom(room(["...", "...", "..."], 1));
    slide(l, 1);
    expect(l.over).toBe(true);
    expect(l.won).toBe(false);
  }, T);

  it("has 30 rooms, bigger later on", () => {
    expect(VACUUM_STAGES).toHaveLength(STAGE_COUNT);
    expect(VACUUM_STAGES[29].cols * VACUUM_STAGES[29].rows).toBeGreaterThan(VACUUM_STAGES[0].cols * VACUUM_STAGES[0].rows);
    for (const st of VACUUM_STAGES) {
      expect(st.floor[st.start]).toBe(true);
      expect(st.limit).toBeGreaterThan(st.par);
    }
  }, T);

  it("keeps a plan that cleans every room in par, for three stars", () => {
    for (const st of VACUUM_STAGES) {
      const r = pilot(st, { mode: "plan" });
      expect(r.won).toBe(true);
      expect(r.moves).toBe(st.par);
      expect(starsFor(r)).toBe(3);
    }
  }, T);

  it("lets clumsier human-like cleaners clear almost every room", () => {
    let wins = 0;
    for (const st of VACUUM_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("rarely cleans up in time swiping at random", () => {
    let wins = 0;
    for (const st of VACUUM_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of VACUUM_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
