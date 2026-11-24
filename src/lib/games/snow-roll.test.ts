import { describe, expect, it } from "vitest";
import { COLS, R0, ROWS, STAGE_COUNT, ballR, levelFor, maxSpeed, newRoll, pilotRun, snowAt, starsFor, steer, stepRoll, type RollLevel } from "./snow-roll";

const open = (over: Partial<RollLevel> = {}): RollLevel => ({
  stage: 0, snow: new Array(COLS * ROWS).fill(1), rocks: [], fences: [], mud: [],
  start: { x: 180, y: 480 }, spot: { x: 180, y: 120 }, body: 20, head: null, timeLimit: 999, par: 0, ...over,
});

describe("snow-roll", () => {
  it("builds 30 yards: one ball first, then a body and a head", () => {
    expect(levelFor(0).head).toBeNull();
    expect(levelFor(9).head).toBeNull();
    const z = levelFor(STAGE_COUNT - 1);
    expect(z.head).not.toBeNull();
    expect(z.head!.max).toBeLessThan(z.body);
    expect(z.rocks.length + z.fences.length + z.mud.length).toBeGreaterThan(5);
    // cold cache: each levelFor builds and autopilot-checks its yard (~4.8 s alone)
  }, 60_000);

  it("every stage is built in time by the autopilot, with 3 stars, and by a sloppy one", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const l = levelFor(st);
      const run = pilotRun(l, 0, 1);
      expect(run.won, `stage ${st + 1}`).toBe(true);
      expect(starsFor(run)).toBe(3);
      expect(pilotRun(l, 0.7, 11).won, `stage ${st + 1} sloppy`).toBe(true);
    }
  }, 60_000);

  it("growing the head as big as the body fails on the snowman stages", () => {
    let failed = 0;
    for (let st = 10; st < STAGE_COUNT; st++) if (!pilotRun(levelFor(st), 0, 1, 240, true).won) failed++;
    expect(failed).toBeGreaterThanOrEqual(18);
  }, 60_000);

  it("rolling over fresh snow grows the ball, clears the snow and slows it down", () => {
    const s = newRoll(open());
    const before = snowAt(s, 180, 400);
    steer(s, 180, 300);
    for (let k = 0; k < 120; k++) stepRoll(s, 1 / 60);
    expect(ballR(s)).toBeGreaterThan(R0 * 1.3);
    expect(snowAt(s, 180, 400)).toBeLessThan(before);
    expect(maxSpeed(ballR(s))).toBeLessThan(maxSpeed(R0));
  });

  it("parking a big enough body on the spot wins a one-ball stage", () => {
    const s = newRoll(open({ body: R0 + 0.5 }));
    s.ball.vol = 1.3;
    s.ball.x = 180;
    s.ball.y = 130;
    stepRoll(s, 1 / 60);
    expect(s.won).toBe(true);
  });

  it("a head that grows past the limit cannot be lifted", () => {
    const s = newRoll(open({ head: { start: { x: 60, y: 400 }, min: 10, max: 12 } }));
    s.phase = "head";
    s.bodyR = 20;
    s.ball.vol = 8; // radius 14
    stepRoll(s, 1 / 60);
    expect(s.over).toBe(true);
    expect(s.cause).toBe("big");
  });
});
