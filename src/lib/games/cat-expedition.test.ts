import { describe, expect, it } from "vitest";
import {
  FLOORS,
  RECRUIT_FLOORS,
  act,
  alive,
  answerRecruit,
  autoAction,
  autoReward,
  clearedFloorIndexes,
  newRun,
  startFloors,
  takeReward,
  type Run,
} from "./cat-expedition";

function play(seed: number, start = 1, recruit: number | null = null): Run {
  const run = newRun(seed, start);
  for (let i = 0; i < 6000; i++) {
    if (run.phase === "battle") act(run, autoAction(run));
    else if (run.phase === "reward") takeReward(run, autoReward(run));
    else if (run.phase === "recruit") answerRecruit(run, recruit);
    else break;
  }
  return run;
}

describe("cat expedition", () => {
  it("has 30 floors as stages, inside the 10-50 range", () => {
    expect(FLOORS).toBe(30);
  });

  it("replays the same run from the same seed", () => {
    expect(play(42)).toEqual(play(42));
  });

  it("is winnable by the autopilot for some seeds and lost for others", () => {
    const results = Array.from({ length: 120 }, (_, i) => play(i + 1));
    const won = results.filter((r) => r.phase === "won").length;
    const beatRegion1 = results.filter((r) => r.phase === "won" || r.floor > 10).length;
    expect(won).toBeGreaterThan(10);
    expect(won).toBeLessThan(110);
    expect(beatRegion1).toBeGreaterThan(90);
  });

  it("can be won from every region start", () => {
    for (const start of [1, 11, 21]) {
      const wins = Array.from({ length: 80 }, (_, i) => play(i + 1000, start)).filter((r) => r.phase === "won").length;
      expect(wins, `start ${start}`).toBeGreaterThan(0);
    }
  });

  it("offers a recruit on floors 3, 13 and 23 and swaps the cat in", () => {
    const run = newRun(7);
    const seen: number[] = [];
    for (let i = 0; i < 6000 && run.phase !== "won" && run.phase !== "lost"; i++) {
      if (run.phase === "battle") act(run, autoAction(run));
      else if (run.phase === "reward") takeReward(run, autoReward(run));
      else if (run.phase === "recruit") {
        seen.push(run.floor);
        const kind = run.recruit;
        answerRecruit(run, 2);
        expect(run.cats[2].kind).toBe(kind);
      }
    }
    for (const f of seen) expect(RECRUIT_FLOORS).toContain(f);
    expect(seen[0]).toBe(3);
  });

  it("never lets a dead cat act and ends the run when the party falls", () => {
    for (let s = 1; s <= 40; s++) {
      const run = newRun(s);
      for (let i = 0; i < 6000 && run.phase !== "won" && run.phase !== "lost"; i++) {
        if (run.phase === "battle") {
          expect(alive(run.cats[run.actor])).toBe(true);
          act(run, autoAction(run));
        } else if (run.phase === "reward") takeReward(run, autoReward(run));
        else answerRecruit(run, null);
      }
      if (run.phase === "lost") expect(run.cats.every((c) => !alive(c))).toBe(true);
    }
  });

  it("unlocks region starts only after the boss before them", () => {
    expect(startFloors([])).toEqual([1]);
    expect(startFloors([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([1, 11]);
    expect(startFloors([...Array(20).keys()])).toEqual([1, 11, 21]);
  });

  it("reports cleared floors for stage progress", () => {
    const run = play(3);
    const cleared = clearedFloorIndexes(run);
    if (run.phase === "won") expect(cleared).toHaveLength(FLOORS);
    else expect(cleared.at(-1)).toBe(run.floor - 2);
  });
});

describe("cat expedition assets", () => {
  it("ships every registered sprite file", async () => {
    const { existsSync } = await import("node:fs");
    const { CAT_EXPEDITION_SPRITES } = await import("./sprites");
    const urls = [...Object.values(CAT_EXPEDITION_SPRITES.cats), ...Object.values(CAT_EXPEDITION_SPRITES.enemies), ...Object.values(CAT_EXPEDITION_SPRITES.backdrops), "/games/cat-expedition-keyart.webp"];
    for (const url of urls) expect(existsSync(`public${url}`), url).toBe(true);
  });
});
