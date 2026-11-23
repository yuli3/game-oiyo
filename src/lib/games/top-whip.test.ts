import { describe, expect, it } from "vitest";
import { mulberry } from "./pixel-kit";
import { LEVELS, STAGE_COUNT, newWhip, parTime, pilotSwipe, starsFor, stepWhip, whip, type WhipState } from "./top-whip";

function play(stage: number, noise: number, seed: number, react: number): WhipState {
  const s = newWhip(stage);
  const rng = mulberry(seed);
  let wait = 0;
  for (let i = 0; i < 60 * 120 && !s.end; i++) {
    if (wait > 0) wait -= 1 / 60;
    else {
      const w = pilotSwipe(s);
      if (w) {
        const a = Math.atan2(w.y1 - w.y0, w.x1 - w.x0) + (rng() - 0.5) * 2 * noise;
        const len = Math.hypot(w.x1 - w.x0, w.y1 - w.y0);
        const cx = (w.x0 + w.x1) / 2;
        const cy = (w.y0 + w.y1) / 2;
        whip(s, cx - (Math.cos(a) * len) / 2, cy - (Math.sin(a) * len) / 2, cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2, w.dt * (1 + (rng() - 0.5) * 2 * noise));
        wait = react;
      }
    }
    stepWhip(s, 1 / 60);
  }
  return s;
}

describe("top whip", () => {
  it("has 30 ponds that add gates and hazards", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].gates.length).toBeGreaterThan(LEVELS[0].gates.length);
    expect(LEVELS[29].decay).toBeGreaterThan(LEVELS[0].decay);
    expect(LEVELS.some((l) => l.rocks.length) && LEVELS.some((l) => l.holes.length) && LEVELS.some((l) => l.drifts.length) && LEVELS.some((l) => l.sleds.length) && LEVELS.some((l) => l.wind.x)).toBe(true);
  });

  it("a careful player brings the top home on every pond", () => {
    for (let st = 0; st < STAGE_COUNT; st++) expect(play(st, 0, 1, 0).end, `stage ${st + 1}`).toBe("home");
  }, 60_000);

  it("a sloppier player still wins most ponds", () => {
    let wins = 0;
    let total = 0;
    for (let st = 0; st < STAGE_COUNT; st += 3) {
      for (let k = 0; k < 3; k++) {
        total++;
        if (play(st, 0.3, 50 + k, 0.5).end === "home") wins++;
      }
    }
    expect(wins).toBeGreaterThanOrEqual(total * 0.8);
  }, 60_000);

  it("a swipe that misses the top does nothing", () => {
    const s = newWhip(0);
    expect(whip(s, 10, 10, 60, 10, 0.1)).toBe(false);
    expect(s.whips).toBe(0);
    expect(whip(s, s.top.x - 30, s.top.y, s.top.x + 30, s.top.y, 0.06)).toBe(true);
    expect(s.top.vx).toBeGreaterThan(100);
  });

  it("the top falls over when nobody whips it", () => {
    const s = newWhip(5);
    for (let i = 0; i < 60 * 30 && !s.end; i++) stepWhip(s, 1 / 60);
    expect(s.end).toBe("fell");
  });

  it("stars compare time with the autopilot", () => {
    const par = parTime(0);
    expect(par).toBeGreaterThan(2);
    expect(starsFor(par, par)).toBe(3);
    expect(starsFor(par * 5 + 20, par)).toBe(1);
  });
});
