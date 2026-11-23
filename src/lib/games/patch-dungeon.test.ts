import { describe, expect, it } from "vitest";
import {
  DIRS, FLOOR_COUNT, GAME_ID, HEARTS, IDENTITY, activeMap, begin, makeFloor, newRun, patchNote, press, shortestPath, stars, swapMap,
  type Dir, type RunState,
} from "./patch-dungeon";

function invert(m: Record<Dir, Dir>, want: Dir): Dir {
  return DIRS.find((d) => m[d] === want)!;
}

/** BFS over real play states (hearts, slimes, blink, keys); returns moves to win or -1. */
function solve(start: RunState, limit = 70): number {
  const sig = (s: RunState) => `${s.x},${s.y},${s.hearts},${s.moves % 2},${s.keys},${s.opened.join("|")},${s.taken.join("|")},${s.slimes.map((x) => `${x.x}.${x.y}.${x.dx}.${x.dy}`).join("|")},${s.floor.patches.filter((p) => s.moves >= p.at).length}`;
  let frontier = [start];
  const seen = new Set([sig(start)]);
  for (let depth = 0; depth < limit && frontier.length; depth++) {
    const next: RunState[] = [];
    for (const s of frontier) {
      for (const want of DIRS) {
        const n = press(s, invert(activeMap(s.floor, s.moves), want));
        if (n.status === "won") return depth + 1;
        if (n.status !== "play") continue;
        const k = sig(n);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(n);
      }
    }
    frontier = next;
  }
  return -1;
}

describe("patch dungeon v2", () => {
  it("keeps the record id", () => expect(GAME_ID).toBe("patch-dungeon"));

  it("ships 30 deterministic floors", () => {
    expect(FLOOR_COUNT).toBe(30);
    expect(JSON.stringify(makeFloor(9))).toBe(JSON.stringify(makeFloor(9)));
  });

  it("every floor is winnable through real play with full hearts budget", () => {
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const f = makeFloor(i);
      expect(shortestPath(f.grid, f.start)).toBeGreaterThanOrEqual(6);
      const moves = solve(begin(newRun(i)));
      expect(moves, `floor ${i + 1}`).toBeGreaterThan(0);
    }
  });

  it("every floor's first patch actually changes the controls, and hot patches arrive later", () => {
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const f = makeFloor(i);
      expect(patchNote(f.patches[0]!.map).length).toBeGreaterThan(0);
      expect(f.patches[0]!.at).toBe(0);
      if (i >= 20) expect(f.patches.length).toBe(3);
      for (let k = 1; k < f.patches.length; k++) expect(f.patches[k]!.at).toBeGreaterThan(f.patches[k - 1]!.at);
    }
  });

  it("presses are routed through the patch", () => {
    const m = swapMap(IDENTITY, "up", "left");
    expect(m.up).toBe("left");
    expect(m.left).toBe("up");
    expect(m.down).toBe("down");
  });

  it("bumping a wall costs a move, and no presses count before start", () => {
    const r = newRun(0);
    expect(press(r, "up")).toBe(r);
    const s = begin(r);
    // (1,1) has a wall on the outer ring above it
    const n = press(s, invert(activeMap(s.floor, 0), "up"));
    expect([n.x, n.y]).toEqual([1, 1]);
    expect(n.moves).toBe(1);
    expect(n.hearts).toBe(HEARTS);
  });

  it("stars reward clean, short clears", () => {
    const s = { ...begin(newRun(0)), status: "won" as const, moves: 1 };
    expect(stars(s)).toBe(3);
    expect(stars({ ...s, hearts: 1, moves: 999 })).toBe(1);
  });
});
