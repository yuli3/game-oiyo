import { describe, expect, it } from "vitest";
import { STAGE_COUNT, TRAY_SIZE, TRAY_STAGES, freeTiles, isFree, newPicnic, pick, pilot, starsFor, type TrayStage } from "./trio-tray";

const T = 60_000;
// slower-witted than the players each blanket was built against: a careless grab one pick in ten
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.1, seed }));

describe("trio-tray", () => {
  it("lets only uncovered tiles move, and pops three of a kind", () => {
    const st: TrayStage = {
      stage: 0, cols: 6, rows: 4, par: 3,
      tiles: [
        { x: 0, y: 0, z: 0, kind: 1 },
        { x: 1, y: 1, z: 1, kind: 2 },
        { x: 4, y: 0, z: 0, kind: 1 },
        { x: 4, y: 2, z: 0, kind: 1 },
        { x: 2, y: 2, z: 0, kind: 2 },
        { x: 0, y: 2, z: 0, kind: 2 },
      ],
    };
    const p = newPicnic(st);
    expect(isFree(p, 0)).toBe(false); // the kind-2 tile above lies on it
    expect(pick(p, 0)).toBe("blocked");
    expect(pick(p, 2)).toBe("placed");
    expect(pick(p, 1)).toBe("placed");
    expect(pick(p, 3)).toBe("placed");
    expect(p.tray).toEqual([1, 1, 2]); // kinds stay together
    expect(pick(p, 0)).toBe("matched");
    expect(p.tray).toEqual([2]);
    pick(p, 4);
    expect(pick(p, 5)).toBe("matched");
    expect(p.won).toBe(true);
  }, T);

  it("ends the picnic when the tray fills with seven", () => {
    const tiles = Array.from({ length: 7 }, (_, k) => ({ x: k * 2, y: 0, z: 0, kind: k }));
    const p = newPicnic({ stage: 0, cols: 14, rows: 2, par: 3, tiles });
    for (let k = 0; k < TRAY_SIZE; k++) pick(p, k);
    expect(p.over).toBe(true);
    expect(p.won).toBe(false);
  }, T);

  it("has 30 blankets that grow from 18 tiles, each dealt in whole threes", () => {
    expect(TRAY_STAGES).toHaveLength(STAGE_COUNT);
    expect(TRAY_STAGES[0].tiles).toHaveLength(18);
    expect(TRAY_STAGES[29].tiles.length).toBeGreaterThan(TRAY_STAGES[0].tiles.length * 3);
    for (const st of TRAY_STAGES) {
      const counts = new Map<number, number>();
      for (const t of st.tiles) counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
      for (const n of counts.values()) expect(n % 3).toBe(0);
      expect(freeTiles(newPicnic(st)).length).toBeGreaterThan(0);
    }
  }, T);

  it("lets careful players clear every blanket with three stars", () => {
    for (const st of TRAY_STAGES) {
      const p = pilot(st, { seed: 1 });
      expect(p.won).toBe(true);
      expect(starsFor(p)).toBe(3);
    }
  }, T);

  it("lets human-like players who grab carelessly now and then clear almost every blanket", () => {
    let wins = 0;
    for (const st of TRAY_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(110);
  }, T);

  it("fills the tray for players who grab at random", () => {
    let wins = 0;
    for (const st of TRAY_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(18);
    for (const st of TRAY_STAGES.slice(2)) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
