import { describe, expect, it } from "vitest";
import { BRIDGE_STAGES, DRAG_FULL, FALL, STAGE_COUNT, U_MAX, newWalker, onIce, pilot, setDrag, starsFor, stepWalker, windAt } from "./bridge-walk";

describe("bridge-walk", () => {
  it("builds 30 crossings: longer, tippier, with more ice and more frequent gusts", () => {
    expect(BRIDGE_STAGES).toHaveLength(STAGE_COUNT);
    const a = BRIDGE_STAGES[0];
    const z = BRIDGE_STAGES[STAGE_COUNT - 1];
    expect(z.length).toBeGreaterThan(a.length);
    expect(z.gravity).toBeGreaterThan(a.gravity);
    expect(z.ice.length).toBeGreaterThan(a.ice.length);
    expect(z.gusts.length / z.length).toBeGreaterThan(a.gusts.length / a.length);
  });

  it("balancing against the lean and its speed crosses every bridge with 3 stars", () => {
    for (const s of BRIDGE_STAGES) {
      const w = pilot(s);
      expect(w.won, `bridge ${s.stage + 1}`).toBe(true);
      expect(starsFor(w), `bridge ${s.stage + 1}`).toBe(3);
    }
  });

  it("a human balancing 0.18 s late and ±30 % off on each correction crosses every bridge", () => {
    for (const s of BRIDGE_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { lag: 0.18, wobble: 0.3, seed }).won, `bridge ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("never correcting, slamming full left or right, reacting 0.4 s late or over-correcting falls in on every bridge", () => {
    for (const s of BRIDGE_STAGES) {
      expect(pilot(s, { mode: "none" }).fell, `bridge ${s.stage + 1} none`).toBe(true);
      expect(pilot(s, { mode: "bang", lag: 0.18 }).fell, `bridge ${s.stage + 1} bang`).toBe(true);
      expect(pilot(s, { lag: 0.4, wobble: 0.3, seed: 9 }).fell, `bridge ${s.stage + 1} late`).toBe(true);
      expect(pilot(s, { kp: 900, kd: 40, lag: 0.18 }).fell, `bridge ${s.stage + 1} over-correcting`).toBe(true);
    }
  });

  it("too gentle a correction falls in on most of the later bridges", () => {
    let fell = 0;
    for (const s of BRIDGE_STAGES.slice(10)) if (pilot(s, { kp: 90, kd: 30, lag: 0.18 }).fell) fell++;
    expect(fell).toBeGreaterThanOrEqual(15);
  });

  it("a drag right leans the walker left, capped at a full drag; past the fall angle they fall", () => {
    const s = BRIDGE_STAGES[0];
    const w = newWalker(s);
    setDrag(w, DRAG_FULL * 3);
    expect(w.push).toBe(-U_MAX);
    setDrag(w, DRAG_FULL / 2);
    expect(w.push).toBeCloseTo(-U_MAX / 2, 9);
    expect(windAt(s, 0)).toBe(0);
    expect(onIce(s, s.ice[0].from + 0.1)).toBe(true);
    const f = newWalker(s);
    f.lean = FALL - 0.001;
    f.spin = 1;
    expect(stepWalker(f, 1 / 60)).toBe(true);
    expect(f.fell).toBe(true);
  });
});
