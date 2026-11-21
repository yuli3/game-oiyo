import { describe, expect, it } from "vitest";
import {
  DUEL_LEAGUES, ROUNDS, compareDuel, createMatch, decodeDuel, duelUrl, encodeDuel, leagueCleared, leagueTarget,
  perfectScore, scoreSequence, scoreStop, scoreTimed, stopPosition, totalScore,
} from "./link-duel";

describe("link duel matches", () => {
  it("the same league and seed always give the same ten rounds", () => {
    expect(createMatch(3, 12345)).toEqual(createMatch(3, 12345));
    expect(createMatch(3, 12345)).not.toEqual(createMatch(3, 12346));
    const m = createMatch(0, 7);
    expect(m.rounds).toHaveLength(ROUNDS);
    const kinds = m.rounds.map((r) => r.kind).sort();
    expect(kinds).toEqual(["count", "count", "odd", "odd", "sequence", "sequence", "stop", "stop", "sum", "sum"]);
  });

  it("every league can be cleared by good play, for many seeds", () => {
    for (let lv = 0; lv < DUEL_LEAGUES; lv++) {
      for (let seed = 1; seed <= 40; seed++) {
        const m = createMatch(lv, seed * 7919);
        const scores = m.rounds.map(perfectScore);
        expect(leagueCleared(lv, scores), `league ${lv + 1} seed ${seed}`).toBe(true);
        // A good-but-human player: answers right at 60% of the time limit, stops a bar a little off.
        const human = m.rounds.map((r) => r.kind === "stop" ? scoreStop(r, r.target + r.width / 2) : r.kind === "sequence" ? 100 : scoreTimed(true, r.limitMs * 0.35, r.limitMs));
        expect(totalScore(human), `human league ${lv + 1}`).toBeGreaterThanOrEqual(leagueTarget(lv));
      }
    }
  });

  it("count rounds show exactly the answer's number of dots and offer it", () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const r of createMatch(11, seed).rounds) {
        if (r.kind === "count") {
          expect(r.dots.length).toBe(r.answer);
          expect(r.options).toContain(r.answer);
          expect(new Set(r.options).size).toBe(4);
        }
        if (r.kind === "sum") expect(r.options).toContain(r.a + r.b);
        if (r.kind === "odd") expect(r.index).toBeLessThan(r.size * r.size);
      }
    }
  });

  it("scores rounds fairly", () => {
    expect(scoreTimed(false, 10, 1000)).toBe(0);
    expect(scoreTimed(true, 2000, 1000)).toBe(0);
    expect(scoreTimed(true, 0, 1000)).toBe(100);
    expect(scoreTimed(true, 500, 1000)).toBe(80);
    const stop = { kind: "stop" as const, periodMs: 1000, target: 0.5, width: 0.1 };
    expect(stopPosition(stop, 250)).toBeCloseTo(0.5);
    expect(stopPosition(stop, 500)).toBeCloseTo(1);
    expect(scoreStop(stop, 0.5)).toBe(100);
    expect(scoreStop(stop, 0.9)).toBe(0);
    const seq = { kind: "sequence" as const, arrows: ["up", "left", "down", "right"] as const, showMs: 500 };
    expect(scoreSequence({ ...seq, arrows: [...seq.arrows] }, ["up", "left", "down", "right"])).toBe(100);
    expect(scoreSequence({ ...seq, arrows: [...seq.arrows] }, ["up", "left", "up"])).toBe(25);
  });
});

describe("duel links", () => {
  it("round-trips league, seed, scores and name", () => {
    const c = { league: 5, seed: 987654321, scores: [100, 0, 55, 87, 92, 61, 70, 99, 3, 44], name: "세운" };
    expect(decodeDuel(encodeDuel(c))).toEqual(c);
    const url = new URL(duelUrl("https://game.oiyo.net/ko/link-duel/?x=1#a", c));
    expect(url.search.startsWith("?duel=")).toBe(true);
    expect(decodeDuel(url.searchParams.get("duel"))).toEqual(c);
  });

  it("rejects edited or broken links", () => {
    const code = encodeDuel({ league: 2, seed: 42, scores: Array(10).fill(80), name: "Ana" });
    const tampered = code.replace(/^2\./, "3.");
    expect(decodeDuel(tampered)).toBeNull();
    expect(code).toContain(".2828"); expect(decodeDuel(code.replace(".2828", ".2s28"))).toBeNull();
    expect(decodeDuel("garbage")).toBeNull();
    expect(decodeDuel("99.1.00000000000000000000.0")).toBeNull();
    expect(decodeDuel(null)).toBeNull();
  });

  it("strips risky characters from names", () => {
    const c = decodeDuel(encodeDuel({ league: 0, seed: 1, scores: Array(10).fill(1), name: "<b>hi</b>!!" }));
    expect(c?.name).toBe("bhib");
  });

  it("compares duels by total and counts rounds", () => {
    const r = compareDuel([100, 50, 0, 0, 0, 0, 0, 0, 0, 0], [90, 70, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(r).toEqual({ verdict: "lose", roundsWon: 1, roundsLost: 1 });
    expect(compareDuel(Array(10).fill(5), Array(10).fill(5)).verdict).toBe("draw");
  });
});
