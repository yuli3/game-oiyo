// Daily patch dungeon. Button labels stay on the first room's verbs.
// Each later room swaps two verbs and says only that pair. The verb the room
// needs is one of those two, so the button that still wears its old name is
// the wrong press (2026-10-21).

import { mulberry32 } from "./daily";

export const GAME_ID = "patch-dungeon";
export const ROOMS = 5;
export const VERBS = ["step", "brace", "look"] as const;

export type Verb = (typeof VERBS)[number];
export type Phase = "ready" | "play" | "won" | "lost";

export interface Room {
  swapped: [Verb, Verb] | null;
  need: Verb;
}

export interface Puzzle {
  seed: number;
  rooms: Room[];
  maps: Verb[][];
}

export interface Run {
  puzzle: Puzzle;
  phase: Phase;
  index: number;
}

export function createPuzzle(seed: number): Puzzle {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xc4e70001);
  let map: Verb[] = ["step", "brace", "look"];
  const rooms: Room[] = [];
  const maps: Verb[][] = [];
  for (let room = 0; room < ROOMS; room += 1) {
    let swapped: [Verb, Verb] | null = null;
    if (room > 0) {
      const left = Math.floor(rng() * VERBS.length);
      let right = Math.floor(rng() * (VERBS.length - 1));
      if (right >= left) right += 1;
      const a = map[left] ?? "step";
      const b = map[right] ?? "brace";
      swapped = [a, b];
      const next = map.slice();
      next[left] = b;
      next[right] = a;
      map = next;
    }
    const need = swapped ? (rng() < 0.5 ? swapped[0] : swapped[1]) : (VERBS[Math.floor(rng() * VERBS.length)] ?? "step");
    rooms.push({ swapped, need });
    maps.push(map.slice());
  }
  return { seed: mixed, rooms, maps };
}

export function createRun(puzzle: Puzzle): Run {
  return { puzzle, phase: "ready", index: 0 };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function press(run: Run, index: number): Run {
  if (run.phase !== "play" || index < 0 || index >= VERBS.length) return run;
  const room = run.puzzle.rooms[run.index];
  const map = run.puzzle.maps[run.index];
  if (!room || !map) return run;
  if (map[index] !== room.need) return { ...run, phase: "lost" };
  const next = run.index + 1;
  if (next >= ROOMS) return { ...run, index: next, phase: "won" };
  return { ...run, index: next };
}

export function expire(run: Run): Run {
  if (run.phase !== "play") return run;
  return { ...run, phase: "lost" };
}

export function holds(puzzle: Puzzle, room: number, verb: Verb): number {
  const map = puzzle.maps[room] ?? [];
  const index = map.indexOf(verb);
  return index < 0 ? 0 : index;
}
