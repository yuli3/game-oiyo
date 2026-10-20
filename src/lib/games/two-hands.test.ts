import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BODY,
  DEALS,
  GAME_ID,
  begin,
  createPuzzle,
  createRun,
  cross,
  expire,
  help,
  holeRun,
  type Act,
  type Deal,
  type Run,
} from "./two-hands";

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
    const key = `${current.top.join("")}:${current.bottom.join("")}:${current.sky}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(help(current, "L"), help(current, "R"), cross(current));
  }
  return false;
}

function play(deal: Deal, policy: (run: Run) => Act): boolean {
  let run = begin(createRun(puzzleOf(deal)));
  const seen = new Set<string>();
  for (let step = 0; step < 8; step += 1) {
    if (run.phase === "won") return true;
    if (run.phase !== "play") return false;
    const key = `${run.top.join("")}:${run.bottom.join("")}:${run.sky}`;
    if (seen.has(key)) return false;
    seen.add(key);
    const act = policy(run);
    if (act === "L" || act === "R") run = help(run, act);
    else run = cross(run);
  }
  return run.phase === "won";
}

const leftAll = (run: Run): Act => {
  if (run.top.includes("H") && run.sky > 0) return "L";
  if (run.bottom.includes("H") && run.sky > 0) return "R";
  return "E";
};

const rightAll = (run: Run): Act => {
  if (run.bottom.includes("H") && run.sky > 0) return "R";
  if (run.top.includes("H") && run.sky > 0) return "L";
  return "E";
};

const longerFirst = (run: Run): Act => {
  if (holeRun(run.top) <= BODY && holeRun(run.bottom) <= BODY) return "E";
  if (holeRun(run.top) > BODY && holeRun(run.bottom) <= BODY && run.top.includes("H") && run.sky > 0) return "L";
  if (holeRun(run.bottom) > BODY && holeRun(run.top) <= BODY && run.bottom.includes("H") && run.sky > 0) return "R";
  if (holeRun(run.top) >= holeRun(run.bottom) && run.top.includes("H") && run.sky > 0) return "L";
  if (run.bottom.includes("H") && run.sky > 0) return "R";
  return "E";
};

describe("two hands", () => {
  it("clears every deal only when the hands take turns", () => {
    expect(DEALS.length).toBeGreaterThanOrEqual(8);
    for (const deal of DEALS) {
      expect(solvable(deal)).toBe(true);
      expect(play(deal, leftAll)).toBe(false);
      expect(play(deal, rightAll)).toBe(false);
      expect(play(deal, longerFirst)).toBe(false);
      expect(cross(begin(createRun(puzzleOf(deal)))).phase).toBe("lost");
    }
  });

  it("opens the other path when the longer hand goes first", () => {
    const deal = DEALS[0]!;
    expect(deal.top.join("")).toBe("HHHF");
    const started = begin(createRun(puzzleOf(deal)));
    const rushed = cross(help(help(started, "L"), "L"));
    expect(holeRun(rushed.bottom)).toBeGreaterThan(BODY);
    expect(rushed.phase).toBe("lost");
    const cleared = cross(help(help(started, "R"), "L"));
    expect(cleared.phase).toBe("won");
    expect(cleared.kept).toBe(0);
    expect(expire(started).phase).toBe("lost");
    expect(expire(cleared)).toEqual(cleared);
    expect(begin(cleared)).toEqual(cleared);
  });

  it("builds three different deals from the date seed", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.rounds).toHaveLength(3);
      const keys = puzzle.rounds.map((deal) => `${deal.sky}:${deal.top.join("")}:${deal.bottom.join("")}`);
      expect(new Set(keys).size).toBe(3);
      for (const deal of puzzle.rounds) expect(solvable(deal)).toBe(true);
    }
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/two-hands.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="two-hands"');
    expect(catalog).toContain('slug: "two-hands"');
    expect(GAME_ID).toBe("two-hands");
  });
});
