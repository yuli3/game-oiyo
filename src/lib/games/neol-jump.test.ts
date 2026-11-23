import { describe, expect, it } from "vitest";
import { mulberry } from "./pixel-kit";
import { LEFT_X, LEVELS, STAGE_COUNT, newNeol, pilotFrame, quality, setSteer, starsFor, stepNeol, tap, type Neol } from "./neol-jump";

function play(stage: number, sigma: number, seed: number, tapping = true): Neol {
  const s = newNeol(stage);
  const rng = mulberry(seed);
  const plan = { tapAt: null as number | null };
  let off = 0;
  let lastAir: string | null = null;
  for (let i = 0; i < 120 * 400 && !s.over; i++) {
    if (s.air !== lastAir) {
      lastAir = s.air;
      off = sigma ? (rng() + rng() + rng() - 1.5) * sigma * 2 : 0;
    }
    if (tapping) pilotFrame(s, plan, off);
    else {
      // only starts the stage and steers, never times a landing
      if (s.pending && s.pending.at === Infinity) tap(s);
      const p2 = { tapAt: Infinity as number | null };
      pilotFrame(s, p2, 0);
    }
    stepNeol(s, 1 / 120);
  }
  return s;
}

describe("neol jump", () => {
  it("has 30 stages that reach higher", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    const top = (i: number) => Math.max(...LEVELS[i].charms.map((c) => c.h));
    expect(top(29)).toBeGreaterThan(top(0) * 4);
    expect(LEVELS[29].birds.length).toBeGreaterThan(0);
    expect(LEVELS[29].wind).not.toBe(0);
  });

  it("taps on the beat clear every stage", () => {
    for (let st = 0; st < STAGE_COUNT; st++) expect(play(st, 0, 1).won, `stage ${st + 1}`).toBe(true);
  }, 60_000);

  it("a good player clears most stages, a sloppy one struggles late", () => {
    let good = 0;
    let sloppyLate = 0;
    for (let st = 0; st < STAGE_COUNT; st++) for (const seed of [3, 4]) {
      if (play(st, 0.05, seed).won) good++;
      if (st >= 24 && play(st, 0.09, seed).won) sloppyLate++;
    }
    expect(good).toBeGreaterThanOrEqual(50);
    expect(sloppyLate).toBeLessThanOrEqual(8);
  }, 120_000);

  it("never timing a landing lets the jumps fade and the stage is lost", () => {
    for (const st of [5, 15, 25]) expect(play(st, 0, 1, false).won, `stage ${st + 1}`).toBe(false);
  }, 60_000);

  it("landing off your end of the board is a fall", () => {
    const s = newNeol(0);
    tap(s);
    setSteer(s, LEFT_X + 120);
    for (let i = 0; i < 240 && !s.fallen; i++) stepNeol(s, 1 / 120);
    expect(s.falls).toBe(1);
  });

  it("timing windows and stars", () => {
    expect(quality(0.02)).toBe("perfect");
    expect(quality(-0.1)).toBe("good");
    expect(quality(0.3)).toBe("miss");
    const s = newNeol(0);
    expect(starsFor(s)).toBe(3);
    s.falls = 2;
    expect(starsFor(s)).toBe(1);
  });
});
