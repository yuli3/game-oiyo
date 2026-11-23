import { describe, expect, it } from "vitest";
import { HEARTS, LEVELS, PEBBLE, STAGE_COUNT, bite, current, newBureom, playAuto, release, starsFor, stepBureom, timeTo, toss } from "./bureom-crack";

describe("bureom-crack", () => {
  it("has 30 stages that grow", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[0].need).toBe(5);
    expect(LEVELS[29].need).toBe(14);
    expect(LEVELS[0].nuts.some((n) => n.kind === PEBBLE)).toBe(false);
    expect(LEVELS[29].nuts.filter((n) => n.kind === PEBBLE).length).toBe(4);
    expect(LEVELS[29].nuts[0].rate).toBeGreaterThan(LEVELS[0].nuts[0].rate * 1.3);
  });

  it("a sharp player clears every stage; a slow one fails late", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      let w = 0;
      for (let k = 0; k < 10; k++) if (playAuto(st, 0.03, 50 + k).won) w++;
      expect(w, `stage ${st + 1}`).toBe(10);
    }
    expect(starsFor(playAuto(0, 0, 1))).toBe(3);
    let slow = 0;
    for (let k = 0; k < 20; k++) if (playAuto(29, 0.13, 50 + k).won) slow++;
    expect(slow).toBeLessThan(4);
  });

  it("soft, crack, crush and pebbles", () => {
    const s = newBureom(9);
    // skip to the first real nut
    while (current(s)!.kind === PEBBLE) toss(s);
    const n = current(s)!;
    bite(s);
    stepBureom(s, timeTo(n, n.lo) * 0.5);
    expect(release(s)).toBe("soft");
    bite(s);
    const steps = Math.round(timeTo(n, (n.lo + n.hi) / 2) * 1000);
    for (let k = 0; k < steps; k++) stepBureom(s, 0.001);
    expect(["crack", "perfect"]).toContain(release(s));
    expect(s.cracked).toBe(1);
    while (current(s)!.kind === PEBBLE) toss(s);
    bite(s);
    let r = null;
    for (let k = 0; k < 2000 && !r; k++) r = stepBureom(s, 0.01);
    expect(r).toBe("crush");
    expect(s.hearts).toBe(HEARTS - 1);
    const p = newBureom(9);
    const at = p.level.nuts.findIndex((x) => x.kind === PEBBLE);
    p.index = at;
    bite(p);
    for (let k = 0; k < 100; k++) stepBureom(p, 0.01);
    expect(release(p)).toBe("ouch");
  });
});
