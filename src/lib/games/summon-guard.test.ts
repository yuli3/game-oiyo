import { describe, expect, it } from "vitest";
import { GUARD_STAGES, MAX_RANK, OVERRUN, POSTS, STAGE_COUNT, canMerge, merge, newCamp, partner, pilot, starsFor, step, summon, summonCost } from "./summon-guard";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.8, seed }));

describe("summon-guard", () => {
  it("has 30 stages with more waves later on", () => {
    expect(GUARD_STAGES).toHaveLength(STAGE_COUNT);
    expect(GUARD_STAGES[29].waves).toBeGreaterThan(GUARD_STAGES[0].waves);
    for (const st of GUARD_STAGES) {
      expect(st.peakPar).toBeLessThanOrEqual(OVERRUN);
      expect(st.bossHp).toBeGreaterThan(st.hp);
    }
  }, T);

  it("summons at a rising price and merges two equal guards into one of the next rank", () => {
    const c = newCamp({ ...GUARD_STAGES[3], coins: 10000 });
    expect(summonCost(1)).toBeGreaterThan(summonCost(0));
    for (let k = 0; k < POSTS; k++) expect(summon(c)).toBe(k);
    expect(summon(c)).toBe(-1); // no empty post
    const a = c.posts.findIndex((_, i) => partner(c, i) >= 0);
    expect(a).toBeGreaterThanOrEqual(0);
    const b = partner(c, a);
    expect(merge(c, a, b)).toBe(true);
    expect(c.posts[a]!.rank).toBe(2);
    expect(c.posts[b]).toBeNull();
    // mismatched guards don't merge
    const odd = c.posts.findIndex((g, i) => g && g.rank === 1 && c.posts.some((h, j) => h && j !== i && h.kind !== g.kind));
    const other = c.posts.findIndex((h, j) => h && j !== odd && h.kind !== c.posts[odd]!.kind);
    expect(canMerge(c, odd, other)).toBe(false);
    // the same moves always give the same guards
    const d = newCamp({ ...GUARD_STAGES[3], coins: 10000 });
    for (let k = 0; k < POSTS; k++) summon(d);
    expect(d.posts.map((g) => g!.kind)).toEqual(newCampKinds());
    function newCampKinds() {
      const e = newCamp({ ...GUARD_STAGES[3], coins: 10000 });
      for (let k = 0; k < POSTS; k++) summon(e);
      return e.posts.map((g) => g!.kind);
    }
    expect(MAX_RANK).toBe(4);
  }, T);

  it("is overrun when too many monsters are on the track", () => {
    const c = newCamp(GUARD_STAGES[10]);
    while (!c.over) step(c, 0.05);
    expect(c.won).toBe(false);
    expect(c.monsters.length).toBe(OVERRUN);
  }, T);

  it("holds every stage for a quick player, with three stars", () => {
    for (const st of GUARD_STAGES) {
      const c = pilot(st, { react: 0.35, seed: 1 });
      expect(c.won).toBe(true);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("lets human-like players who merge pairs as they appear hold almost every stage", () => {
    let wins = 0;
    for (const st of GUARD_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("overruns players who never merge, and random poking mostly fails", () => {
    for (const st of GUARD_STAGES.slice(4)) expect(pilot(st, { mode: "summon", react: 0.5 }).won).toBe(false);
    let wins = 0;
    let n = 0;
    for (const st of GUARD_STAGES)
      for (const seed of [21, 22, 23, 24]) {
        n++;
        if (pilot(st, { mode: "random", react: 0.7, seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.2);
    for (const st of GUARD_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", react: 0.7, seed }).won).toBe(false);
  }, T);
});
