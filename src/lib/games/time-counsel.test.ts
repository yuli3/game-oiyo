import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COLUMNS,
  COLUMN_CARDS,
  GAME_ID,
  LIMIT,
  begin,
  createBrief,
  createRun,
  file,
  safeCard,
  tick,
  toggle,
  type Card,
  type Run,
} from "./time-counsel";

function choose(run: Run, cards: Card[]): Run {
  let current = run.phase === "ready" ? begin(run) : run;
  for (const card of cards) current = toggle(current, card);
  return file(current);
}

describe("time counsel", () => {
  it("points each fact at one card and has a single winning brief", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const brief = createBrief(seed);
      expect(createBrief(seed)).toEqual(brief);
      for (const column of COLUMNS) {
        expect(COLUMN_CARDS[column]).toContain(brief.target[column]);
      }
      const safe = COLUMNS.map((column) => safeCard(brief, column));
      expect(choose(createRun(brief), safe).phase).toBe("won");
      let wins = 0;
      const [when, where, who] = COLUMNS.map((column) => COLUMN_CARDS[column]);
      for (const a of when) {
        for (const b of where) {
          for (const c of who) {
            if (choose(createRun(brief), [a, b, c]).phase === "won") wins += 1;
          }
        }
      }
      expect(wins).toBe(1);
    }
  });

  it("names the edge when the pointed card is filed", () => {
    const brief = createBrief(4);
    const picks = COLUMNS.map((column) => safeCard(brief, column));
    picks[0] = brief.target.when;
    const judged = choose(createRun(brief), picks);
    expect(judged.phase).toBe("lost");
    expect(judged.findings[0]).toMatchObject({ column: "when", pick: brief.target.when, result: "rebutted" });
    expect(judged.findings[1].result).toBe("stood");
    expect(judged.findings[2].result).toBe("stood");
  });

  it("files an empty brief when the clock ends", () => {
    let run = begin(createRun(createBrief(1)));
    expect(tick({ ...run, phase: "ready" })).toEqual({ ...run, phase: "ready" });
    for (let step = 0; step < LIMIT; step += 1) run = tick(run);
    expect(run.phase).toBe("lost");
    expect(run.elapsed).toBe(LIMIT);
    expect(run.findings.map((finding) => finding.result)).toEqual(["empty", "empty", "empty"]);
    expect(tick(run)).toEqual(run);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/time-counsel.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="time-counsel"');
    expect(catalog).toContain('slug: "time-counsel"');
    expect(GAME_ID).toBe("time-counsel");
  });
});
