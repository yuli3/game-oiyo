import { describe, expect, it } from "vitest";
import { createTileRummy } from "./tile-rummy";
import { TILE_RUMMY_LEAGUE, TILE_RUMMY_LEAGUE_COUNT, leagueStage } from "./tile-rummy-league";

describe("tile rummy league", () => {
  it("ships twenty stages that never get easier", () => {
    expect(TILE_RUMMY_LEAGUE_COUNT).toBe(20);
    const weight = (i: number) => TILE_RUMMY_LEAGUE[i].opponents + TILE_RUMMY_LEAGUE[i].level * 1.5;
    expect(weight(TILE_RUMMY_LEAGUE_COUNT - 1)).toBeGreaterThan(weight(0));
    expect(TILE_RUMMY_LEAGUE[0]).toMatchObject({ opponents: 1, level: 1 });
    expect(TILE_RUMMY_LEAGUE[19]).toMatchObject({ opponents: 3, level: 3 });
  });

  it("pins a distinct deal per stage", () => {
    const seeds = new Set(TILE_RUMMY_LEAGUE.map((stage) => stage.seed));
    expect(seeds.size).toBe(TILE_RUMMY_LEAGUE_COUNT);
    for (const stage of TILE_RUMMY_LEAGUE) {
      const a = createTileRummy({ seed: stage.seed, opponents: stage.opponents });
      const b = createTileRummy({ seed: stage.seed, opponents: stage.opponents });
      expect(a.hands).toEqual(b.hands);
      expect(a.hands.length).toBe(stage.opponents + 1);
    }
  });

  it("rejects an index outside the league", () => {
    expect(leagueStage(-1)).toBeNull();
    expect(leagueStage(20)).toBeNull();
    expect(leagueStage(1.5)).toBeNull();
    expect(leagueStage(0)).toBe(TILE_RUMMY_LEAGUE[0]);
  });
});
