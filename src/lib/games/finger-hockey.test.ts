import { describe, expect, it } from "vitest";
import { GOALS_TO_WIN, MATCH_SECONDS, OVERTIME_SECONDS, TABLE_COUNT, TABLE_H, TABLE_W, clampTarget, matchWinner, newMatch, setTarget, simulate, stepMatch } from "./finger-hockey";

describe("finger-hockey", () => {
  it("keeps each mallet in its own half", () => {
    expect(clampTarget(0, 150, 10).y).toBeGreaterThan(TABLE_H / 2);
    expect(clampTarget(1, 150, 500).y).toBeLessThan(TABLE_H / 2);
    expect(clampTarget(0, -50, 400).x).toBeGreaterThan(0);
  });

  it("scores a goal when the puck enters the top mouth", () => {
    const m = newMatch(0, 2);
    m.pause = 0;
    m.pucks[0] = { x: TABLE_W / 2, y: 30, vx: 0, vy: -800 };
    m.mallets[1].x = 20; // out of the way
    m.targets[1] = { x: 30, y: 40 };
    let goal = null;
    for (let f = 0; f < 30 && goal === null; f++) goal = stepMatch(m, 1 / 60, []).goal;
    expect(goal).toBe(0);
    expect(m.score[0]).toBe(1);
  });

  it("bounces off the end wall outside the goal mouth", () => {
    const m = newMatch(0, 2);
    m.pause = 0;
    m.pucks[0] = { x: 30, y: 40, vx: 0, vy: -600 };
    for (let f = 0; f < 20; f++) stepMatch(m, 1 / 60, []);
    expect(m.score).toEqual([0, 0]);
    expect(m.pucks[0].vy).toBeGreaterThan(0);
  });

  it("follows the player's finger", () => {
    const m = newMatch(0, 1);
    setTarget(m, 0, 60, 480);
    for (let f = 0; f < 30; f++) stepMatch(m, 1 / 60, [1]);
    expect(Math.abs(m.mallets[0].x - 60)).toBeLessThan(2);
  });

  it("every table finishes in time, and an idle player almost never wins", () => {
    let idleWins = 0;
    for (let t = 0; t < TABLE_COUNT; t++) {
      for (let s = 1; s <= 3; s++) {
        const m = simulate(t, s, "idle");
        const w = matchWinner(m);
        expect(w, `table ${t}`).not.toBeNull();
        expect(m.time).toBeLessThanOrEqual(MATCH_SECONDS + OVERTIME_SECONDS + 0.1);
        expect(Math.max(...m.score)).toBeLessThanOrEqual(GOALS_TO_WIN);
        if (w === 0) idleWins++;
      }
    }
    expect(idleWins).toBeLessThanOrEqual(2);
  }, 60000);

  it("a quick, accurate player can beat the early tables", () => {
    let wins = 0;
    for (let s = 1; s <= 6; s++) if (matchWinner(simulate(0, s, { speed: 1500, reaction: 0.05, aim: 0.9 })) === 0) wins++;
    expect(wins).toBeGreaterThanOrEqual(4);
  }, 60000);
});
