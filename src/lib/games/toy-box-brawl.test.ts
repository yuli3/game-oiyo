import { describe, expect, it } from "vitest";
import { MAX_LINE, SPECS, STAGE_COUNT, TOY_STAGES, battle, costOf, lines, pilot, starsFor, toy } from "./toy-box-brawl";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ tries: 3, noise: 0.25, seed }));

describe("toy-box-brawl", () => {
  it("has 30 shelves whose enemy boxes grow", () => {
    expect(TOY_STAGES).toHaveLength(STAGE_COUNT);
    expect(TOY_STAGES[29].enemy.length).toBeGreaterThan(TOY_STAGES[0].enemy.length);
    expect(TOY_STAGES[29].coins).toBeGreaterThan(TOY_STAGES[0].coins);
    for (const st of TOY_STAGES) {
      expect(st.best).toBeGreaterThan(0);
      expect(st.best).toBeLessThanOrEqual(MAX_LINE);
    }
  }, T);

  it("fights front to front, with shields, lobs, drums, hand-offs and roly-polys", () => {
    // two soldiers trade 3s: both fall on the first exchange
    expect(battle([toy("soldier")], [toy("soldier")]).won).toBe(false);
    // a knight's shield eats the first hit, so it wins the same trade
    const k = battle([toy("knight")], [toy("soldier")]);
    expect(k.won).toBe(true);
    expect(k.left).toBe(1);
    // a catapult at the back softens the enemy's last toy before the fight
    expect(battle([toy("soldier"), toy("catapult")], [toy("soldier")]).events[0].kind).toBe("lob");
    // a drum makes every friend hit one harder
    const d = battle([toy("doll"), toy("drum")], [toy("soldier")]);
    expect(d.events.some((e) => e.kind === "drum")).toBe(true);
    // a doll stands back up once
    expect(battle([toy("doll")], [toy("rocket")]).events.some((e) => e.kind === "rise")).toBe(true);
    // a robot hands +2/+2 to the toy behind when it falls
    expect(battle([toy("robot"), toy("soldier")], [toy("rocket"), toy("rocket")]).events.some((e) => e.kind === "pass")).toBe(true);
  }, T);

  it("only lists lines the coins can pay for, at most five long", () => {
    const st = TOY_STAGES[12];
    for (const l of lines(st)) {
      expect(l.length).toBeLessThanOrEqual(MAX_LINE);
      expect(costOf(l)).toBeLessThanOrEqual(st.coins);
    }
    expect(SPECS.teddy.cost).toBeGreaterThan(SPECS.soldier.cost);
  }, T);

  it("has a three-star line on every stage that keeps the most toys standing", () => {
    for (const st of TOY_STAGES) {
      let top = 0;
      for (const l of lines(st)) {
        const r = battle(l.map((k) => toy(k)), st.enemy);
        if (r.won) top = Math.max(top, r.left);
        if (r.won && r.left === st.best) expect(starsFor(st, r)).toBe(3);
      }
      expect(top).toBe(st.best);
    }
  }, T);

  it("lets human-like players who buy sensibly and retry win almost every box", () => {
    let wins = 0;
    for (const st of TOY_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(90);
  }, T);

  it("beats random shopping and ordering most of the time", () => {
    let wins = 0;
    let n = 0;
    for (const st of TOY_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", tries: 1, seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.2);
    // and the seeds the stages were checked against never win
    for (const st of TOY_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", tries: 1, seed }).won).toBe(false);
  }, T);
});
