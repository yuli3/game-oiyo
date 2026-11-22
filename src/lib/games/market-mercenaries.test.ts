import { describe, expect, it } from "vitest";
import {
  BENCH_SIZE, ROUND_COUNT, START_HEARTS, afterFight, autoRun, buy, enemyBand, fieldCap, fight, guildCounts, guildLevel, isBossRound, newRun,
  place, reroll, rollShop, sell, simulate, type Merc, type RunState,
} from "./market-mercenaries";

function withShop(s: RunState, shop: RunState["shop"], gold = 20): RunState {
  return { ...s, shop, gold };
}

describe("market-mercenaries", () => {
  it("starts with gold, a full shop and an empty field", () => {
    const s = newRun(3);
    expect(s.shop).toHaveLength(5);
    expect(s.gold).toBe(5);
    expect(s.hearts).toBe(START_HEARTS);
    expect(s.field.every((m) => m === null)).toBe(true);
    expect(rollShop(0, 3, 0)).toEqual(rollShop(0, 3, 0));
  });

  it("buys onto the field, then the bench, and merges three copies into a two-star", () => {
    let s = withShop(newRun(1), ["stick", "stick", "stick", "lid", "sling"]);
    s = buy(s, 0);
    expect(s.field[1]?.id).toBe("stick");
    s = buy(s, 1);
    expect(s.bench.filter(Boolean)).toHaveLength(1);
    s = buy(s, 2);
    const all = [...s.field, ...s.bench].filter(Boolean) as Merc[];
    expect(all).toHaveLength(1);
    expect(all[0].star).toBe(2);
    expect(s.field[1]?.star).toBe(2);
    expect(s.gold).toBe(17);
    s = buy(s, 4);
    expect(s.field[5]?.id).toBe("sling");
  });

  it("refuses to buy without gold and charges for a reroll", () => {
    const s = withShop(newRun(1), ["ox", null, null, null, null], 2);
    expect(buy(s, 0)).toBe(s);
    const r = reroll(s);
    expect(r.gold).toBe(1);
    expect(r.shop).not.toEqual(s.shop);
  });

  it("caps the field by round and sells for gold", () => {
    let s = withShop(newRun(1), ["lid", "sling", "granny", "stick", "gate"], 30);
    for (let i = 0; i < 4; i++) s = buy(s, i);
    expect(fieldCap(0)).toBe(3);
    expect(s.field.filter(Boolean)).toHaveLength(3);
    expect(s.bench[0]?.id).toBe("stick");
    const before = s;
    s = place(s, { where: "bench", i: 0 }, { where: "field", i: 3 });
    expect(s).toBe(before);
    const g = s.gold;
    s = sell(s, { where: "field", i: 1 });
    expect(s.gold).toBe(g + 1);
    expect(s.bench).toHaveLength(BENCH_SIZE);
  });

  it("counts distinct guild members", () => {
    const c = guildCounts([{ uid: 1, id: "stick", star: 1 }, { uid: 2, id: "stick", star: 2 }, { uid: 3, id: "sword", star: 1 }, null]);
    expect(c.blade).toBe(2);
    expect(guildLevel(2)).toBe(1);
    expect(guildLevel(3)).toBe(2);
  });

  it("a stronger band wins and an empty field loses", () => {
    const strong: Array<Merc | null> = [{ uid: 1, id: "ox", star: 2 }, { uid: 2, id: "twin", star: 2 }, null, null, { uid: 3, id: "xbow", star: 2 }, null, null, null];
    expect(simulate(strong, enemyBand(0)).winner).toBe(0);
    expect(fight(newRun(1)).won).toBe(false);
  });

  it("boss rounds cost two hearts and the run ends at zero", () => {
    expect(isBossRound(9)).toBe(true);
    expect(enemyBand(9).some((m) => m?.id === "boss")).toBe(true);
    let s = { ...newRun(1), round: 9 };
    s = afterFight(s, false);
    expect(s.hearts).toBe(START_HEARTS - 2);
    s = { ...s, hearts: 1 };
    expect(afterFight(s, false).status).toBe("lost");
    expect(afterFight({ ...newRun(1), round: ROUND_COUNT - 1 }, true).status).toBe("won");
  });

  it("every round's band fits the field and grows over the run", () => {
    const size = (r: number) => enemyBand(r).filter(Boolean).length;
    for (let r = 0; r < ROUND_COUNT; r++) expect(size(r)).toBeGreaterThan(0);
    expect(size(18)).toBeGreaterThan(size(1));
  });

  it("the autopilot clears the whole run sometimes but not always", () => {
    let won = 0;
    let deep = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = autoRun(seed);
      if (s.status === "won") won++;
      if (s.round >= 9) deep++;
    }
    expect(won).toBeGreaterThanOrEqual(4);
    expect(won).toBeLessThanOrEqual(24);
    expect(deep).toBeGreaterThanOrEqual(20);
  }, 60000);
});
