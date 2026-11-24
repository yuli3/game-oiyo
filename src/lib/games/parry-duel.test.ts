import { describe, expect, it } from "vitest";
import { FUMBLE, PARRY_STAGES, PLAYER_HP, STAGE_COUNT, choose, combo, hitTime, newDuel, pilot, starsFor, stepDuel, tap } from "./parry-duel";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ spread: 0.055, fooled: 0.5, seed }));

describe("parry-duel", () => {
  it("has 30 rivals with longer combos, a narrower beat and more feints later", () => {
    expect(PARRY_STAGES).toHaveLength(STAGE_COUNT);
    const swings = (i: number) => PARRY_STAGES[i].combos.flat().length;
    expect(swings(29)).toBeGreaterThan(swings(0));
    expect(PARRY_STAGES[29].perfect).toBeLessThan(PARRY_STAGES[0].perfect);
    expect(PARRY_STAGES[0].combos.flat().some((s) => s.feint)).toBe(false);
    expect(PARRY_STAGES[29].combos.flat().some((s) => s.feint)).toBe(true);
  }, T);

  it("parries on the beat, blocks a little off it, and fumbles a tap at nothing", () => {
    const r = PARRY_STAGES[3];
    const d = newDuel(r);
    expect(choose(d, "heavy")).toBe(false); // no focus yet
    expect(choose(d, "strike")).toBe(true);
    const sw = combo(d)[0];
    while (d.t < hitTime(sw) - 0.001) stepDuel(d, 0.001);
    expect(combo(d).length).toBeGreaterThanOrEqual(2);
    expect(tap(d)).toBe("parry");
    expect(d.focus).toBe(1);
    const next = combo(d)[1];
    while (d.phase === "defend" && d.t < next.at + 0.05) stepDuel(d, 0.005);
    expect(tap(d)).toBe("fumble");
    expect(tap(d)).toBe("locked");
    const hp = d.hp;
    while (d.phase === "defend" && d.t < hitTime(next) + r.good + 0.02) stepDuel(d, 0.005);
    expect(d.hp).toBeLessThan(hp);
    expect(FUMBLE).toBeGreaterThan(0);
  }, T);

  it("gives a duellist who parries every beat three stars on every stage", () => {
    for (const r of PARRY_STAGES) {
      const d = pilot(r);
      expect(d.won).toBe(true);
      expect(d.hp).toBe(PLAYER_HP);
      expect(starsFor(d)).toBe(3);
    }
  }, T);

  it("lets human-like duellists (55 ms off, fooled by half the feints) beat most rivals", () => {
    let wins = 0;
    for (const r of PARRY_STAGES) {
      const w = HUMANS.filter((o) => pilot(r, o).won).length;
      expect(w).toBeGreaterThanOrEqual(3);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("does not let mashing, tapping early or sloppy timing win", () => {
    for (const r of PARRY_STAGES) {
      expect(pilot(r, { mode: "mash" }).won).toBe(false);
      expect(pilot(r, { mode: "early" }).won).toBe(false);
    }
    expect(PARRY_STAGES.filter((r) => !pilot(r, { spread: 0.11, fooled: 0.9, seed: 2 }).won).length).toBeGreaterThanOrEqual(24);
  }, T);

  it("is deterministic", () => {
    expect(pilot(PARRY_STAGES[17], HUMANS[1]).hp).toBe(pilot(PARRY_STAGES[17], HUMANS[1]).hp);
  }, T);
});
