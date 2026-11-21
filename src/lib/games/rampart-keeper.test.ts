import { describe, expect, it } from "vitest";
import { BLOCKS, buildWave, canPlace, createSiege, dropBoulder, placeBlock, RAMPART_WAVES, startSiege, stepSiege, waveScore, waveStars } from "./rampart-keeper";
import { autoplay, idle, wallsOnly } from "./rampart-keeper.autopilot";

describe("rampart keeper waves", () => {
  it("has 30 waves in three eras, each introducing its invader", () => {
    expect(RAMPART_WAVES).toBe(30);
    const kinds = (i: number) => new Set(buildWave(i).spawns.map((s) => s.kind));
    expect([...kinds(0)]).toEqual(["soldier"]);
    expect(kinds(3).has("ram")).toBe(true);
    expect(kinds(10).has("giant")).toBe(true);
    expect(kinds(20).has("bomb")).toBe(true);
    expect(buildWave(29).spawns.length).toBeGreaterThan(buildWave(0).spawns.length);
    expect(buildWave(5)).toEqual(buildWave(5));
  });

  it("every wave can be held by a player who builds a wall and aims boulders", () => {
    for (let w = 0; w < RAMPART_WAVES; w++) {
      const s = autoplay(w);
      expect(s.phase, `wave ${w + 1}`).toBe("won");
      expect(waveStars(s)).toBeGreaterThan(0);
      expect(waveScore(s)).toBeGreaterThan(0);
    }
  }, 120_000);

  it("doing nothing loses once rams arrive, and walls alone are not enough later", () => {
    for (const w of [4, 8, 12, 16, 20, 24, 28]) expect(idle(w).phase, `idle wave ${w + 1}`).toBe("lost");
    const lateWalls = [10, 12, 15, 17, 20, 22, 24, 26].filter((w) => wallsOnly(w).phase === "lost");
    expect(lateWalls.length).toBeGreaterThanOrEqual(5);
  }, 120_000);
});

describe("rampart keeper rules", () => {
  it("spends budget per block and refuses when it runs out", () => {
    const s = createSiege(0);
    const start = s.budgetLeft;
    expect(placeBlock(s, "stone", 1)).toBe(true);
    expect(s.budgetLeft).toBe(start - BLOCKS.stone.cost);
    while (canPlace(s, "plank")) placeBlock(s, "plank", s.blocks.length % 8);
    expect(placeBlock(s, "plank", 0)).toBe(false);
  });

  it("boulders need the siege, obey the cooldown and the count", () => {
    const s = createSiege(0);
    expect(dropBoulder(s, 300)).toBe(false);
    startSiege(s);
    expect(dropBoulder(s, 300)).toBe(true);
    expect(dropBoulder(s, 300)).toBe(false);
    for (let i = 0; i < 70; i++) stepSiege(s);
    expect(dropBoulder(s, 300)).toBe(true);
    expect(placeBlock(s, "plank", 0)).toBe(false);
  });
});
