import { describe, expect, it } from "vitest";
import { STAGE_COUNT, VILLAGE_STAGES, canPlace, newVillage, pieceScore, pilot, place, score, starsFor, undo } from "./palm-village";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ spread: 3, seed }));

describe("palm-village", () => {
  it("has 30 islands that grow with more pieces to place", () => {
    expect(VILLAGE_STAGES).toHaveLength(STAGE_COUNT);
    expect(VILLAGE_STAGES[29].cols * VILLAGE_STAGES[29].rows).toBeGreaterThan(VILLAGE_STAGES[0].cols * VILLAGE_STAGES[0].rows);
    expect(VILLAGE_STAGES[29].pieces.length).toBeGreaterThan(VILLAGE_STAGES[0].pieces.length);
    for (const st of VILLAGE_STAGES) expect(st.ground.filter((g) => g === "land").length).toBeGreaterThan(st.pieces.length);
  }, T);

  it("scores houses by the trees, well and lantern around them", () => {
    const st = { ...VILLAGE_STAGES[0], ground: new Array(25).fill("land") as Array<"land">, cols: 5, rows: 5 };
    const placed = new Array(25).fill(null);
    placed[12] = "house";
    placed[11] = "tree";
    placed[13] = "tree";
    placed[6] = "well";
    placed[17] = "lantern";
    expect(pieceScore(st, placed, 12)).toBe(2 + 2 + 1);
    expect(pieceScore(st, placed, 6)).toBe(1); // the well serves one house
  }, T);

  it("places only on free land, takes back the last piece, and finishes when the boat is empty", () => {
    const st = VILLAGE_STAGES[5];
    const v = newVillage(st);
    const water = st.ground.indexOf("water");
    if (water >= 0) expect(canPlace(v, water)).toBe(false);
    const land = st.ground.indexOf("land");
    expect(place(v, land)).toBe(true);
    expect(place(v, land)).toBe(false);
    expect(undo(v)).toBe(true);
    expect(v.placed[land]).toBeNull();
    while (!v.over) place(v, v.placed.findIndex((_, i) => canPlace(v, i)));
    expect(starsFor(v)).toBeGreaterThanOrEqual(1); // no village fails
    expect(undo(v)).toBe(false);
  }, T);

  it("gives a careful planner three stars on every island", () => {
    for (const st of VILLAGE_STAGES) expect(starsFor(pilot(st, { beam: 6 }))).toBe(3);
  }, T);

  it("gives human-like builders (good spots, not always the best) two stars on most islands", () => {
    let two = 0;
    for (const st of VILLAGE_STAGES) two += HUMANS.filter((o) => starsFor(pilot(st, o)) >= 2).length;
    expect(two).toBeGreaterThanOrEqual(85);
  }, T);

  it("gives pieces dropped anywhere just the one star", () => {
    let more = 0;
    for (const st of VILLAGE_STAGES) for (const seed of [1, 2, 3]) {
      const v = pilot(st, { mode: "random", seed });
      expect(starsFor(v)).toBeGreaterThanOrEqual(1);
      if (starsFor(v) >= 2) more++;
    }
    expect(more).toBeLessThanOrEqual(4);
    expect(score(pilot(VILLAGE_STAGES[9], HUMANS[0]))).toBe(score(pilot(VILLAGE_STAGES[9], HUMANS[0])));
  }, T);
});
