import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  ROOMS,
  VERBS,
  begin,
  createPuzzle,
  createRun,
  expire,
  holds,
  press,
  type Run,
} from "./patch-dungeon";

function clear(run: Run): Run {
  let current = begin(run);
  while (current.phase === "play") {
    const room = current.puzzle.rooms[current.index];
    if (!room) break;
    current = press(current, holds(current.puzzle, current.index, room.need));
  }
  return current;
}

describe("patch dungeon", () => {
  it("keeps the first room on the printed verbs and then moves the verb the room needs", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.rooms).toHaveLength(ROOMS);
      expect(puzzle.rooms[0]?.swapped).toBeNull();
      expect(puzzle.maps[0]).toEqual([...VERBS]);
      for (let room = 1; room < ROOMS; room += 1) {
        const card = puzzle.rooms[room];
        const previous = puzzle.maps[room - 1];
        const current = puzzle.maps[room];
        expect(card?.swapped).not.toBeNull();
        expect(card && previous && current).toBeTruthy();
        if (!card?.swapped || !previous || !current) continue;
        expect(previous.indexOf(card.need)).not.toBe(current.indexOf(card.need));
        expect(card.swapped).toContain(card.need);
      }
    }
  });

  it("loses the room when the printed verb is pressed after a swap", () => {
    const puzzle = createPuzzle(5);
    let run = begin(createRun(puzzle));
    const first = puzzle.rooms[0];
    expect(first).toBeTruthy();
    if (!first) return;
    run = press(run, VERBS.indexOf(first.need));
    expect(run.phase).toBe("play");
    expect(run.index).toBe(1);
    const second = puzzle.rooms[1];
    expect(second).toBeTruthy();
    if (!second) return;
    const stale = VERBS.indexOf(second.need);
    expect(press(run, stale).phase).toBe("lost");
    expect(press(press(run, stale), 0)).toEqual(press(run, stale));
    expect(begin(press(run, stale))).toEqual(press(run, stale));
  });

  it("clears the dungeon only by following where each verb moved", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const won = clear(createRun(createPuzzle(seed)));
      expect(won.phase).toBe("won");
      expect(won.index).toBe(ROOMS);
    }
    const waiting = expire(begin(createRun(createPuzzle(2))));
    expect(waiting.phase).toBe("lost");
    expect(waiting.index).toBe(0);
    expect(expire(waiting)).toEqual(waiting);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/patch-dungeon.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="patch-dungeon"');
    expect(catalog).toContain('slug: "patch-dungeon"');
    expect(GAME_ID).toBe("patch-dungeon");
  });
});
