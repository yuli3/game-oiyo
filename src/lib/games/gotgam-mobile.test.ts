import { describe, expect, it } from "vitest";
import { PUZZLES, STAGE_COUNT, freeHooks, hang, newBoard, par, parseKey, solved, starsFor, torques } from "./gotgam-mobile";

describe("gotgam mobile", () => {
  it("has 30 puzzles that add fruit, rods, ties and magpies", () => {
    expect(PUZZLES).toHaveLength(STAGE_COUNT);
    expect(PUZZLES[29].fruits.length).toBeGreaterThan(PUZZLES[0].fruits.length);
    expect(PUZZLES[29].rods.length).toBe(3);
    expect(PUZZLES.some((p) => Object.keys(p.locked).length) && PUZZLES.some((p) => p.blocked.length)).toBe(true);
  });

  it("every puzzle starts unbalanced or unfinished and its built answer balances every rod", () => {
    for (const p of PUZZLES) {
      const b = newBoard(p);
      expect(solved(b)).toBe(false);
      for (const f of p.fruits) if (p.locked[f.id] === undefined) expect(hang(b, f.id, p.answer[f.id])).toBe(true);
      expect(solved(b), `stage ${p.stage + 1}`).toBe(true);
      expect(b.moves).toBe(par(p));
      expect(starsFor(b.moves, p)).toBe(3);
      for (const k of Object.values(p.answer)) expect(p.blocked).not.toContain(k);
    }
  });

  it("works out torque through hanging rods", () => {
    const p = PUZZLES[29];
    const { torque, load } = torques(p, p.answer);
    expect(torque.every((t) => t === 0)).toBe(true);
    expect(load[0]).toBe(p.fruits.reduce((s, f) => s + f.w, 0));
  });

  it("can't move tied fruit or use magpie and rod hooks; dropping on a full hook bumps the old fruit", () => {
    const p = PUZZLES[22];
    const b = newBoard(p);
    const tied = Number(Object.keys(p.locked)[0]);
    expect(hang(b, tied, null)).toBe(false);
    const free = p.fruits.filter((f) => p.locked[f.id] === undefined);
    expect(hang(b, free[0].id, p.blocked[0])).toBe(false);
    const rodHook = p.rods[1].parent!;
    expect(hang(b, free[0].id, `${rodHook.rod}:${rodHook.pos}`)).toBe(false);
    const k = freeHooks(p).find((h) => !Object.values(p.locked).includes(h))!;
    expect(hang(b, free[0].id, k)).toBe(true);
    expect(hang(b, free[1].id, k)).toBe(true);
    expect(b.place[free[0].id]).toBe(null);
    expect(parseKey(k).rod).toBeGreaterThanOrEqual(0);
  });
});
