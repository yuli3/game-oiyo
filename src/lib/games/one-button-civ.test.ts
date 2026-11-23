import { describe, expect, it } from "vitest";
import { HEARTS, PLOTS, STAGE_COUNT, begin, makeIsland, newCiv, plotUnder, season, stars, tap, tick, timeLimit, upcoming, type CivState } from "./one-button-civ";

/** Plays an island with a simple rule set. `walls` = whether it defends raids. */
function autopilot(s0: CivState, walls: boolean): CivState {
  let s = begin(s0);
  const dt = 1 / 30;
  while (s.status === "play") {
    const p = plotUnder(s);
    const se = season(s);
    const threats = new Set(upcoming(s).map((u) => u.plot));
    const cur = s.plots[p];
    if (se === "wall" && walls && threats.has(p) && cur !== "wall") s = tap(s);
    else if (se === "field" && !threats.has(p) && cur !== "field" && cur !== "wall") s = tap(s);
    else if (se === "road" && (cur === "empty" || cur === "ash") && p % 4 === 0 && !threats.has(p)) s = tap(s);
    s = tick(s, dt);
  }
  return s;
}

describe("one-button-civ", () => {
  it("islands are deterministic and get harder", () => {
    expect(makeIsland(7)).toEqual(makeIsland(7));
    const a = makeIsland(0);
    const z = makeIsland(STAGE_COUNT - 1);
    expect(z.goal).toBeGreaterThan(a.goal);
    expect(z.seasonS).toBeLessThan(a.seasonS);
    expect(z.raids.length).toBeGreaterThan(a.raids.length);
    for (let i = 0; i < STAGE_COUNT; i++) {
      const isl = makeIsland(i);
      for (const r of isl.raids) {
        expect(r.plot).toBeGreaterThanOrEqual(0);
        expect(r.plot).toBeLessThan(PLOTS);
        expect(r.at).toBeLessThan(timeLimit(isl));
      }
    }
  });

  it("tap builds the season's building under the builder", () => {
    let s = begin(newCiv(0));
    expect(season(s)).toBe("field");
    s = tap(s);
    expect(s.plots[plotUnder(s)]).toBe("field");
    expect(tap(s)).toBe(s); // same building again is a no-op
  });

  it("a careful player can clear every island", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const s = autopilot(newCiv(i), true);
      expect(s.status, `island ${i + 1}`).toBe("won");
      expect(stars(s)).toBeGreaterThan(0);
    }
  });

  it("ignoring raids loses once raids get frequent", () => {
    for (let i = 6; i < STAGE_COUNT; i++) expect(autopilot(newCiv(i), false).status, `island ${i + 1}`).toBe("lost");
  });

  it("an unwalled raid burns plots and costs a heart", () => {
    let s = begin(newCiv(4));
    const first = s.island.raids[0]!;
    while (s.raidsDone === 0) s = tick(s, 0.1);
    expect(s.hearts).toBe(HEARTS - 1);
    expect(s.plots[first.plot]).toBe("ash");
  });
});
