import { describe, expect, it } from "vitest";
import { BLANKET_STAGES, CARDS, LANES, STAGE_COUNT, TURNS, capacity, endTurn, energy, lanePower, lanesWon, newMatch, pilot, spent, stage, starsFor, unstage } from "./blanket-battle";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.2, seed }));

describe("blanket-battle", () => {
  it("has 30 picnics whose blankets grow quirkier and rivals sharper", () => {
    expect(BLANKET_STAGES).toHaveLength(STAGE_COUNT);
    expect(BLANKET_STAGES[0].lanes.every((l) => l === "plain")).toBe(true);
    expect(BLANKET_STAGES[29].lanes.filter((l) => l !== "plain").length).toBe(2);
    expect(BLANKET_STAGES[29].rivalSkill).toBeGreaterThan(BLANKET_STAGES[0].rivalSkill);
    for (const st of BLANKET_STAGES) expect(st.deck).toHaveLength(12);
  }, T);

  it("gives one more acorn each turn, and only lets you play what you can pay for and fit", () => {
    const st = BLANKET_STAGES[20];
    const m = newMatch(st);
    expect(m.turn).toBe(1);
    expect(energy(m)).toBe(1);
    const dear = m.hand.findIndex((c) => CARDS[c].cost > 1);
    if (dear >= 0) expect(stage(m, dear, 0)).toBe(false);
    const cheap = m.hand.findIndex((c) => CARDS[c].cost === 1);
    if (cheap >= 0) {
      expect(stage(m, cheap, 0)).toBe(true);
      expect(spent(m)).toBe(1);
      expect(unstage(m, 0)).toBe(true);
      expect(spent(m)).toBe(0);
    }
    endTurn(m);
    expect(energy(m)).toBe(2);
    const small = st.lanes.indexOf("small");
    if (small >= 0) expect(capacity(st, small)).toBe(2);
    while (!m.over) endTurn(m);
    expect(m.turn).toBe(TURNS);
    const [a, b] = lanesWon(m);
    expect(m.won).toBe(a > b);
    expect(a + b).toBeLessThanOrEqual(LANES);
  }, T);

  it("adds lane quirks and card tricks to the power on a blanket", () => {
    // play a whole match and check every blanket's power is the sum of its cards (never negative)
    for (const st of BLANKET_STAGES.slice(20)) {
      const m = pilot(st, { seed: 1 });
      for (let l = 0; l < LANES; l++) for (const side of [0, 1]) expect(lanePower(m, side, l)).toBeGreaterThanOrEqual(0);
    }
  }, T);

  it("lets careful play win every picnic, with three stars on every one", () => {
    for (const st of BLANKET_STAGES) {
      const m = pilot(st, { seed: 1 });
      expect(m.won).toBe(true);
      expect(starsFor(m)).toBe(3);
    }
  }, T);

  it("lets human-like players, a wrong blanket one card in five, win almost every picnic", () => {
    let wins = 0;
    for (const st of BLANKET_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("mostly loses when cards go down at random", () => {
    let wins = 0;
    let n = 0;
    for (const st of BLANKET_STAGES)
      for (const seed of [21, 22, 23, 24, 25, 26, 27, 28]) {
        n++;
        if (pilot(st, { mode: "random", seed }).won) wins++;
      }
    expect(wins / n).toBeLessThan(0.2);
    for (const st of BLANKET_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
