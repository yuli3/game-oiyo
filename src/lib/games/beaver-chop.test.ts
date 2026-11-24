import { describe, expect, it } from "vitest";
import { CHOP_STAGES, HEAL_EVERY, HEARTS, STAGE_COUNT, branchAt, chop, newTree, pilot, safeSide, starsFor, step, type ChopStage } from "./beaver-chop";

const T = 60_000;
// slower and sloppier than the choppers each tree was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ pace: 0.3, slip: 0.025, seed }));

const tiny: ChopStage = { stage: 0, branches: [0, 0, 1, 1, 0, -1, 0, 0, 0, 0], target: 6, drain: 0.1, ramp: 0 };

describe("beaver-chop", () => {
  it("bites a log, and a branch dropping on your side costs a heart", () => {
    const tr = newTree(tiny);
    expect(chop(tr, 1)).toEqual(["chop"]); // the bottom log goes; the next has no branch
    expect(branchAt(tr, 1)).toBe(1); // a branch on the right comes next
    expect(chop(tr, 1)).toEqual(["chop", "bonk"]); // staying right: it drops on you
    expect(tr.hearts).toBe(HEARTS - 1);
    expect(branchAt(tr, 0)).toBe(0); // and snaps off
    expect(safeSide(tr)).toBe(-1); // the next log has a right branch too
    expect(chop(tr, -1)).toEqual(["chop"]);
  }, T);

  it("costs a heart for walking into a branch, gives one back every so often, and ends on an empty clock", () => {
    const tr = newTree(tiny);
    chop(tr, -1);
    chop(tr, -1); // a right branch is now at the beaver's height
    expect(chop(tr, 1)).toContain("bonk");
    expect(HEAL_EVERY).toBeGreaterThan(5);
    const idle = newTree(tiny);
    for (let k = 0; k < 600; k++) step(idle, 0.1);
    expect(idle.over).toBe(true);
    expect(idle.won).toBe(false);
  }, T);

  it("never puts branches on both sides back to back", () => {
    expect(CHOP_STAGES).toHaveLength(STAGE_COUNT);
    for (const st of CHOP_STAGES) for (let i = 1; i < st.branches.length; i++) expect(st.branches[i] !== 0 && st.branches[i] === -st.branches[i - 1]).toBe(false);
    expect(CHOP_STAGES[0].target).toBe(30);
    expect(CHOP_STAGES[29].target).toBeGreaterThan(100);
  }, T);

  it("lets quick, careful choppers clear every tree with three stars", () => {
    for (const st of CHOP_STAGES) {
      const tr = pilot(st, { pace: 0.2 });
      expect(tr.won).toBe(true);
      expect(starsFor(tr)).toBe(3);
    }
  }, T);

  it("lets slower human-like choppers who misread now and then clear almost every tree", () => {
    let wins = 0;
    for (const st of CHOP_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("bonks random choppers out of hearts", () => {
    for (const st of CHOP_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
