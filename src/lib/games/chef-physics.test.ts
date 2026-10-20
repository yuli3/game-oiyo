import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DISHES,
  GAME_ID,
  act,
  begin,
  createPuzzle,
  createRun,
  expire,
  texture,
  type Act,
  type Dish,
  type Run,
} from "./chef-physics";

const ACTS: Act[] = ["W", "L", "C", "T"];

function puzzleOf(dish: Dish) {
  return { seed: 1, rounds: [dish] };
}

function solvable(dish: Dish): Act[][] {
  const found: Act[][] = [];
  const walk = (run: Run, prefix: Act[]) => {
    if (prefix.length > 4 || run.phase === "lost") return;
    if (run.phase === "won") {
      found.push(prefix);
      return;
    }
    if (run.phase !== "play") return;
    for (const choice of ACTS) {
      const next = act(run, choice);
      if (next === run) continue;
      walk(next, [...prefix, choice]);
    }
  };
  walk(begin(createRun(puzzleOf(dish))), []);
  return found;
}

function follow(dish: Dish, choices: readonly Act[]): boolean {
  let run = begin(createRun(puzzleOf(dish)));
  for (const choice of choices) {
    run = act(run, choice);
    if (run.phase === "lost") return false;
    if (run.phase === "won") return true;
  }
  return run.phase === "won";
}

function heatMax(dish: Dish): Act[] {
  const choices: Act[] = [];
  let heat = dish.heat;
  while (heat < 2 && choices.length < 4) {
    choices.push("W");
    heat += 1;
  }
  choices.push("T");
  return choices;
}

function coolOff(dish: Dish): Act[] {
  const choices: Act[] = [];
  let heat = dish.heat;
  while (heat > 0 && choices.length < 4) {
    choices.push("L");
    heat -= 1;
  }
  choices.push("T");
  return choices;
}

describe("chef physics", () => {
  it("plates every dish, and the fixed habits miss", () => {
    expect(DISHES).toHaveLength(6);
    for (const dish of DISHES) {
      expect(solvable(dish).length).toBeGreaterThan(0);
      expect(follow(dish, ["T"])).toBe(false);
      expect(follow(dish, ["C", "T"])).toBe(false);
      expect(follow(dish, heatMax(dish))).toBe(false);
      expect(follow(dish, coolOff(dish))).toBe(false);
    }
  });

  it("needs two waits before the crisp piece can leave the pan", () => {
    const dish = DISHES[0]!;
    expect(dish.target).toBe("crisp");
    const started = begin(createRun(puzzleOf(dish)));
    expect(act(started, "T").phase).toBe("lost");
    const dried = act(act(started, "W"), "W");
    expect(texture(dried.heat, dried.moisture, dried.cut)).toBe("crisp");
    const plated = act(dried, "T");
    expect(plated.phase).toBe("won");
    expect(plated.kept).toBe(1);
    const cut = act(started, "C");
    expect(act(cut, "C")).toBe(cut);
    expect(expire(started).phase).toBe("lost");
    expect(expire(plated)).toEqual(plated);
    expect(begin(plated)).toEqual(plated);
  });

  it("serves three different textures from the date seed", () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.rounds).toHaveLength(3);
      const keys = puzzle.rounds.map((dish) => `${dish.heat}:${dish.moisture}:${dish.target}`);
      expect(new Set(keys).size).toBe(3);
      expect(new Set(puzzle.rounds.map((dish) => dish.target)).size).toBe(3);
      for (const dish of puzzle.rounds) expect(solvable(dish).length).toBeGreaterThan(0);
    }
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/chef-physics.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="chef-physics"');
    expect(catalog).toContain('slug: "chef-physics"');
    expect(GAME_ID).toBe("chef-physics");
  });
});
