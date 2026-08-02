import { describe, expect, it } from "vitest";
import {
  actHoldem,
  createHoldem,
  holdemCards,
  holdemOutcome,
  parseHoldem,
  serializeHoldem,
} from "./texas-holdem";
describe("texas holdem round", () => {
  it("deals deterministic unique cards", () => {
    const a = createHoldem(7),
      b = createHoldem(7);
    expect(a.deck).toEqual(b.deck);
    expect(new Set(a.deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
  it("advances and folds immutably", () => {
    const a = createHoldem(1),
      b = actHoldem(a, "advance"),
      c = actHoldem(b, "fold");
    expect(a.stage).toBe("preflop");
    expect(b.stage).toBe("flop");
    expect(holdemOutcome(c)).toBe("lose");
  });
  it("resolves showdown and restores only active hands", () => {
    let s = createHoldem(3);
    s = actHoldem(s, "advance");
    expect(parseHoldem(serializeHoldem(s))?.stage).toBe("flop");
    s = actHoldem(actHoldem(actHoldem(s, "advance"), "advance"), "advance");
    expect(holdemOutcome(s)).not.toBeNull();
    expect(parseHoldem(serializeHoldem(s))).toBeNull();
    expect(holdemCards(s).board).toHaveLength(5);
  });
});
