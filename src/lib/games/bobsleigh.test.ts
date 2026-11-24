import { describe, expect, it } from "vitest";
import { BOB_TRACKS, STAGE_COUNT, curve, lineAt, newSled, pilot, starsFor, stepSled } from "./bobsleigh";

describe("bobsleigh", () => {
  it("builds 30 tracks: longer, with more and higher bends", () => {
    expect(BOB_TRACKS).toHaveLength(STAGE_COUNT);
    const a = BOB_TRACKS[0];
    const z = BOB_TRACKS[STAGE_COUNT - 1];
    expect(z.length).toBeGreaterThan(a.length);
    expect(z.bends.length).toBeGreaterThan(a.bends.length);
    for (const t of BOB_TRACKS) {
      expect(Number.isFinite(t.goal)).toBe(true);
      for (let i = 1; i < t.bends.length; i++) expect(t.bends[i].at - t.bends[i].half).toBeGreaterThanOrEqual(t.bends[i - 1].at + t.bends[i - 1].half);
    }
  });

  it("riding the line (holding while under it) wins every track with 3 stars", () => {
    for (const t of BOB_TRACKS) {
      const s = pilot(t);
      expect(s.won, `track ${t.stage + 1}`).toBe(true);
      expect(starsFor(s), `track ${t.stage + 1}`).toBe(3);
    }
  });

  it("a steady human (120 ms behind, aiming ±0.05 off the line) wins every track", () => {
    for (const t of BOB_TRACKS) for (const seed of [5, 31, 47, 53]) expect(pilot(t, { lag: 0.12, wobble: 0.05, bias: 0.02, seed }).won, `track ${t.stage + 1} seed ${seed}`).toBe(true);
  });

  it("never steering skids too slow, always holding flips, and steering late or low loses every track", () => {
    for (const t of BOB_TRACKS) {
      const never = pilot(t, { mode: "never" });
      expect(never.won || never.flipped, `track ${t.stage + 1} never`).toBe(false);
      expect(pilot(t, { mode: "always" }).flipped, `track ${t.stage + 1} always`).toBe(true);
      expect(pilot(t, { lag: 0.35, wobble: 0.05, seed: 9 }).won, `track ${t.stage + 1} late`).toBe(false);
      expect(pilot(t, { bias: -0.15 }).won, `track ${t.stage + 1} low`).toBe(false);
    }
  });

  it("the line grows with speed squared; riding far above it flips", () => {
    const t = BOB_TRACKS[0];
    const b = t.bends[0];
    expect(curve(t, b.at)).toBeCloseTo(b.k, 9);
    expect(curve(t, 0)).toBe(0);
    expect(lineAt(t, b.at, 20) / lineAt(t, b.at, 10)).toBeCloseTo(4, 6);
    const s = newSled(t);
    s.s = b.at;
    s.v = 20;
    s.h = 1;
    expect(stepSled(s, 1 / 60)).toBe("flip");
  });
});
