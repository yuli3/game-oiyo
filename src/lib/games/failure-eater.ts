// Daily failure eater. A wrong jump on open ground becomes a creature on that
// beat, and a missed hurdle plants one on the next open beat. The failure is
// the next pass's terrain, not a hidden score (2026-10-20).

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "failure-eater";
export const BEATS = 10;
export const LIVES = 3;
export const HURDLES = 4;

export type Beat = "ground" | "hurdle";
export type Phase = "ready" | "play" | "won" | "lost";

export interface Level {
  seed: number;
  beats: Beat[];
}

export interface Run {
  level: Level;
  monsters: number[];
  fails: number;
  cursor: number;
  phase: Phase;
}

export function createLevel(seed: number): Level {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xf41eea7e);
  const picks = shuffle(Array.from({ length: BEATS }, (_, index) => index), rng).slice(0, HURDLES);
  const beats: Beat[] = Array.from({ length: BEATS }, () => "ground");
  for (const index of picks) beats[index] = "hurdle";
  return { seed: mixed, beats };
}

export function createRun(level: Level): Run {
  return { level, monsters: [], fails: 0, cursor: 0, phase: "ready" };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function hazard(run: Run, index: number): boolean {
  return run.level.beats[index] === "hurdle" || run.monsters.includes(index);
}

export function act(run: Run, jump: boolean): Run {
  if (run.phase !== "play") return run;
  if (jump === hazard(run, run.cursor)) {
    const cursor = run.cursor + 1;
    if (cursor >= BEATS) return { ...run, cursor, phase: "won" };
    return { ...run, cursor };
  }
  const monsters = [...run.monsters];
  const beat = run.cursor;
  if (jump && run.level.beats[beat] === "ground" && !monsters.includes(beat)) monsters.push(beat);
  if (!jump && run.level.beats[beat] === "hurdle") {
    const next = run.level.beats.findIndex((cell, index) => index > beat && cell === "ground" && !monsters.includes(index));
    if (next >= 0) monsters.push(next);
  }
  const fails = run.fails + 1;
  if (fails >= LIVES) return { ...run, monsters, fails, cursor: 0, phase: "lost" };
  return { ...run, monsters, fails, cursor: 0 };
}
