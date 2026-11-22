import { describe, expect, it } from "vitest";
import { LEVELS, LEVEL_COUNT, initial, parse, slide, solve, starsFor, type Level } from "./ice-penguin";

describe("ice penguin", () => {
  it("has 30 levels whose par grows", () => {
    expect(LEVEL_COUNT).toBe(30);
    expect(LEVELS[29].par).toBeGreaterThan(LEVELS[0].par * 3);
    for (const l of LEVELS) {
      const w = l.rows[0].length;
      for (const r of l.rows) expect(r).toHaveLength(w);
      expect(l.rows.join("").split("P")).toHaveLength(2);
      expect(l.rows.join("").split("H")).toHaveLength(2);
    }
  });

  it("every level is solvable and its par is the true shortest solution", () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const sol = solve(LEVELS[i]);
      expect(sol, `level ${i + 1}`).not.toBeNull();
      expect(sol!.length, `level ${i + 1}`).toBe(LEVELS[i].par);
      // replaying the solution wins
      const p = parse(LEVELS[i]);
      let s = initial(p);
      let won = false;
      for (const d of sol!) {
        const r = slide(p, s, d);
        expect(r.sank).toBe(false);
        s = r.state;
        won = r.won;
      }
      expect(won).toBe(true);
    }
  }, 60_000);

  it("slides until a rock, stops on snow, turns on arrows, sinks in water", () => {
    const lvl: Level = { par: 0, rows: ["P..#", "....", "o.>.", "~..H"] };
    const p = parse(lvl);
    expect(slide(p, initial(p), "right").state.x).toBe(2);
    expect(slide(p, initial(p), "down").state.y).toBe(2); // stops on snow
    const s = { ...initial(p), x: 0, y: 1 };
    expect(slide(p, s, "down").state.y).toBe(2);
    const onArrow = slide(p, { ...initial(p), x: 1, y: 2 }, "right");
    expect(onArrow.state).toMatchObject({ x: 3, y: 2 });
    const sink = slide(p, { ...initial(p), x: 1, y: 3 }, "left");
    expect(sink.sank).toBe(true);
  });

  it("fish must be collected before the door counts, and cracked ice breaks", () => {
    const p = parse({ par: 0, rows: ["P.F#", "...#", "..H#"] });
    let r = slide(p, initial(p), "right");
    expect(r.state.fish).toBe(0);
    r = slide(p, r.state, "down");
    expect(r.won).toBe(true);
    const q = parse({ par: 0, rows: ["Pc.#", "...H"] });
    const a = slide(q, initial(q), "right");
    expect(a.state.broken).toBe(1);
    const back = slide(q, a.state, "left");
    expect(back.sank).toBe(true);
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(8, 5)).toBe(2);
    expect(starsFor(9, 5)).toBe(1);
  });
});
