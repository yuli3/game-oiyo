import { describe, expect, it } from "vitest";
import { RAISE_TIME, SAFE_POS, STAGES, STAGE_COUNT, fallTime, handAt, newMortar, pressMallet, releaseMallet, setTurner, starsFor, stepMortar, type Mortar } from "./tteok-pound";

const DT = 1 / 60;

/** A human-like pilot: lifts while the hand folds, strikes a reaction time after the hand is clear. */
function reactionPilot(m: Mortar, reaction = 0.18) {
  let seenOut = -1;
  for (let guard = 0; guard < 60 * 400 && !m.over; guard++) {
    if (!m.falling) {
      if (m.hand < 0.3 && m.folded && !m.holding) pressMallet(m);
      if (m.hand >= SAFE_POS && m.handTarget === 1 && m.folded) {
        if (seenOut < 0) seenOut = m.time;
        if (m.time - seenOut >= reaction) {
          if (!m.holding) pressMallet(m);
          if (m.lift >= 0.6) releaseMallet(m);
        }
      } else seenOut = -1;
    }
    stepMortar(m, DT);
  }
}

/** A pilot that knows the partner's plan and strikes the instant the hand is clear. */
function perfectPilot(m: Mortar) {
  for (let guard = 0; guard < 60 * 400 && !m.over; guard++) {
    if (!m.falling && m.folded) {
      if (!m.holding) pressMallet(m);
      if (m.lift >= 0.7 && m.handTarget === 1 && m.cues.length === 0) {
        const land = m.time + fallTime(m.lift);
        if (handAt(m, land) >= SAFE_POS) releaseMallet(m);
      }
    }
    stepMortar(m, DT);
  }
}

describe("tteok-pound", () => {
  it("has 30 stages that get longer and quicker", () => {
    expect(STAGES).toHaveLength(STAGE_COUNT);
    expect(STAGES[29].target).toBeGreaterThan(STAGES[0].target);
    expect(STAGES[29].stay).toBeLessThan(STAGES[0].stay);
    expect(STAGES[0].fake).toBe(0);
    expect(STAGES[29].fake).toBeGreaterThan(0);
  });

  it("a careful human-speed player clears every stage without getting hit", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      for (const seed of [1, 2, 3]) {
        const m = newMortar(s, seed * 31 + s);
        reactionPilot(m);
        expect(m.won, `stage ${s} seed ${seed}`).toBe(true);
        expect(m.ouches).toBe(0);
        expect(starsFor(m)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("anticipating the hand earns perfects and 3 stars", () => {
    for (let s = 0; s < STAGE_COUNT; s += 3) {
      const m = newMortar(s, 77 + s);
      perfectPilot(m);
      expect(m.won, `stage ${s}`).toBe(true);
      expect(starsFor(m), `stage ${s}`).toBe(3);
    }
  });

  it("striking while the hand is in costs a heart", () => {
    const m = newMortar(0, 5);
    while (m.hand > 0.2) stepMortar(m, DT);
    pressMallet(m);
    for (let t = 0; t < RAISE_TIME; t += DT) stepMortar(m, DT);
    releaseMallet(m);
    let got = null;
    for (let t = 0; t < 0.5 && !got; t += DT) got = stepMortar(m, DT).strike;
    expect(got).toBe("ouch");
    expect(m.hearts).toBe(2);
  });

  it("pounding twice without a fold does nothing", () => {
    const m = newMortar(0, 9, true);
    pressMallet(m);
    for (let t = 0; t < RAISE_TIME; t += DT) stepMortar(m, DT);
    releaseMallet(m);
    let got = null;
    for (let t = 0; t < 0.5 && !got; t += DT) got = stepMortar(m, DT).strike;
    expect(got).toBe("unfolded");
    expect(m.pounds).toBe(0);
  });

  it("two players: fold then pound", () => {
    const m = newMortar(0, 9, true);
    setTurner(m, true);
    for (let t = 0; t < 0.4; t += DT) stepMortar(m, DT);
    expect(m.folded).toBe(true);
    setTurner(m, false);
    pressMallet(m);
    for (let t = 0; t < RAISE_TIME; t += DT) stepMortar(m, DT);
    releaseMallet(m);
    let got = null;
    for (let t = 0; t < 0.5 && !got; t += DT) got = stepMortar(m, DT).strike;
    expect(got === "good" || got === "perfect").toBe(true);
    expect(m.pounds).toBe(1);
  });

  it("a weak tap does not count", () => {
    const m = newMortar(0, 3, true);
    setTurner(m, true);
    for (let t = 0; t < 0.4; t += DT) stepMortar(m, DT);
    setTurner(m, false);
    for (let t = 0; t < 0.3; t += DT) stepMortar(m, DT);
    pressMallet(m);
    for (let t = 0; t < 0.1; t += DT) stepMortar(m, DT);
    releaseMallet(m);
    let got = null;
    for (let t = 0; t < 0.5 && !got; t += DT) got = stepMortar(m, DT).strike;
    expect(got).toBe("weak");
  });
});
