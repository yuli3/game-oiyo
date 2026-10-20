import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEALS,
  GAME_ID,
  begin,
  createPuzzle,
  createRun,
  expire,
  leap,
  look,
  plank,
  type Act,
  type Deal,
  type Run,
} from "./last-pixel";

function puzzleOf(deal: Deal) {
  return { seed: 1, rounds: [deal] };
}

function solvable(deal: Deal): boolean {
  const seen = new Set<string>();
  const queue: Run[] = [begin(createRun(puzzleOf(deal)))];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.phase === "won") return true;
    if (current.phase !== "play") continue;
    const key = `${current.body}:${current.sky}:${current.row.join("")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(look(current), plank(current), leap(current));
  }
  return false;
}

function play(deal: Deal, policy: (run: Run) => Act): boolean {
  let run = begin(createRun(puzzleOf(deal)));
  for (let step = 0; step < 8; step += 1) {
    if (run.phase === "won") return true;
    if (run.phase !== "play") return false;
    const next = policy(run);
    if (next === "look") run = look(run);
    else if (next === "plank") run = plank(run);
    else run = leap(run);
  }
  return run.phase === "won";
}

const lookAll = (run: Run): Act => {
  if (run.row.includes("?") && run.body > 0) return "look";
  if ((run.row.includes("?") || run.row.includes("H")) && run.sky > 0) return "plank";
  return "leap";
};

const plankAll = (run: Run): Act => {
  if ((run.row.includes("?") || run.row.includes("H")) && run.sky > 0) return "plank";
  if (run.row.includes("?") && run.body > 0) return "look";
  return "leap";
};

describe("last pixel", () => {
  it("clears every deal without a single greedy touch", () => {
    expect(DEALS.length).toBeGreaterThanOrEqual(8);
    for (const deal of DEALS) {
      expect(solvable(deal)).toBe(true);
      expect(play(deal, lookAll)).toBe(false);
      expect(play(deal, plankAll)).toBe(false);
      expect(leap(begin(createRun(puzzleOf(deal)))).phase).toBe("lost");
    }
  });

  it("breaks a floor when a foothold lands on one, and clears the known pair by mixing", () => {
    const deal = DEALS[0]!;
    expect(deal.cells.join("")).toBe("FHHF");
    const started = begin(createRun(puzzleOf(deal)));
    expect(look(started).body).toBe(0);
    expect(leap(plank(plank(look(started)))).phase).toBe("lost");
    const paved = plank(plank(started));
    const opened = look(paved);
    expect(opened.row.join("")).toBe("FPPF");
    expect(leap(opened).phase).toBe("won");
    expect(leap(opened).kept).toBe(opened.body + opened.sky);
    expect(expire(started).phase).toBe("lost");
    expect(expire(leap(opened))).toEqual(leap(opened));
    expect(begin(leap(opened))).toEqual(leap(opened));
  });

  it("builds three different crossings from the date seed", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.rounds).toHaveLength(3);
      const keys = puzzle.rounds.map((deal) => `${deal.body}:${deal.sky}:${deal.cells.join("")}:${deal.open.map((flag) => (flag ? "1" : "0")).join("")}`);
      expect(new Set(keys).size).toBe(3);
      for (const deal of puzzle.rounds) expect(solvable(deal)).toBe(true);
    }
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/last-pixel.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="last-pixel"');
    expect(catalog).toContain('slug: "last-pixel"');
    expect(GAME_ID).toBe("last-pixel");
  });
});
