import { describe, expect, it } from "vitest";
import { HIT_R, MISSES, PANEL_H, PANEL_W, STAGE_COUNT, TWIN_STAGES, bottomThings, diffAt, lopsided, newSearch, pilot, starsFor, tap, type TwinStage } from "./twin-rooms";
import { ITEMS } from "./twin-rooms-art";

const T = 60_000;
// tap wrong more often than the lookers each room was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ mode: "human" as const, slip: 0.25, seed }));

const room: TwinStage = {
  stage: 0,
  things: [
    { item: 0, v: 0, flip: false, x: 50, y: 50 },
    { item: 2, v: 0, flip: false, x: 200, y: 180 },
  ],
  diffs: [
    { kind: "colour", at: 0 },
    { kind: "extra", at: -1, extra: { item: 9, v: 0, flip: false, x: 300, y: 100 } },
  ],
};

describe("twin-rooms", () => {
  it("makes the bottom picture from the top one with its differences", () => {
    const b = bottomThings(room);
    expect(b).toHaveLength(3);
    expect(b[0].v).toBe(1); // colour changed
    expect(b[1]).toEqual(room.things[1]); // the cat is the same
    expect(b[2].item).toBe(9); // the extra duck
    const gone = bottomThings({ ...room, diffs: [{ kind: "gone", at: 1 }] });
    expect(gone).toHaveLength(1);
  }, T);

  it("circles a difference tapped near it, and counts a tap anywhere else as a miss", () => {
    const s = newSearch(room);
    expect(tap(s, 52, 48)).toBe(0);
    expect(tap(s, 52, 48)).toBe(-3); // already found: no harm
    expect(tap(s, 200, 180)).toBe(-1); // the cat is the same in both
    expect(s.misses).toBe(1);
    expect(tap(s, 300, 100)).toBe(1);
    expect(s.won).toBe(true);
    expect(starsFor(s)).toBe(3);
  }, T);

  it("ends the search after five wrong taps", () => {
    const s = newSearch(room);
    for (let k = 0; k < MISSES; k++) tap(s, 150, 20);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  }, T);

  it("only mirrors items whose mirror image looks different", () => {
    expect(lopsided(2)).toBe(true); // the cat has a tail on one side
    expect(lopsided(0)).toBe(false); // the lamp is symmetrical
    for (const it of ITEMS) expect(it.palettes[0]).not.toEqual(it.palettes[1]);
  }, T);

  it("has 30 rooms, from 3 differences to 6, each one far from the others and inside the picture", () => {
    expect(TWIN_STAGES).toHaveLength(STAGE_COUNT);
    expect(TWIN_STAGES[0].diffs).toHaveLength(3);
    expect(TWIN_STAGES[29].diffs).toHaveLength(6);
    for (const st of TWIN_STAGES) {
      st.diffs.forEach((d, k) => {
        const [x, y] = diffAt(st, k);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(PANEL_W);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(PANEL_H);
        if (d.kind === "flip") expect(lopsided(st.things[d.at].item)).toBe(true);
        for (let j = k + 1; j < st.diffs.length; j++) {
          const [bx, by] = diffAt(st, j);
          expect(Math.hypot(bx - x, by - y)).toBeGreaterThan(HIT_R * 2);
        }
      });
    }
    // the gentle changes first: no colour swaps or mirror images in the first three rooms
    for (const st of TWIN_STAGES.slice(0, 3)) for (const d of st.diffs) expect(["gone", "extra"]).toContain(d.kind);
  }, T);

  it("finds every difference straight away for three stars", () => {
    for (const st of TWIN_STAGES) {
      const s = pilot(st);
      expect(s.won).toBe(true);
      expect(s.misses).toBe(0);
      expect(starsFor(s)).toBe(3);
    }
  }, T);

  it("lets human-like lookers who tap wrong more often find almost everything", () => {
    let wins = 0;
    for (const st of TWIN_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("never finds them all tapping at random", () => {
    for (const st of TWIN_STAGES) for (const seed of [21, 22, 23, 24, 1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
