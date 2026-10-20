// Daily untranslatable creature. A need is a four-beat rhythm, not a sentence,
// so the six locales share one lesson (2026-10-20). The marks stay in one
// order. Only the teaching order and the six asks change with the date.

import { mulberry32, shuffle } from "./daily";

export const GAME_ID = "untranslatable-creature";
export const SIGNALS = ["hunger", "rest", "play", "clean"] as const;
export const ASKS = 6;
export const MISSES = 3;

export type Signal = (typeof SIGNALS)[number];
export type Phase = "ready" | "teach" | "ask" | "won" | "lost";

export const RHYTHM: Record<Signal, readonly number[]> = {
  hunger: [1, 0, 1, 0],
  rest: [1, 1, 0, 0],
  play: [1, 0, 0, 1],
  clean: [0, 1, 1, 0],
};

export interface Lesson {
  seed: number;
  teach: Signal[];
  asks: Signal[];
}

export interface Run {
  lesson: Lesson;
  phase: Phase;
  step: number;
  misses: number;
}

function distinct(asks: Signal[]): number {
  return new Set(asks).size;
}

export function createLesson(seed: number): Lesson {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0xc0ea747e);
  const teach = shuffle(SIGNALS, rng);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const asks = Array.from({ length: ASKS }, () => teach[Math.floor(rng() * teach.length)] ?? teach[0]);
    if (distinct(asks) >= 3) return { seed: mixed, teach, asks };
  }
  return {
    seed: mixed,
    teach: [...SIGNALS],
    asks: ["hunger", "rest", "play", "clean", "hunger", "play"],
  };
}

export function createRun(lesson: Lesson): Run {
  return { lesson, phase: "ready", step: 0, misses: 0 };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "teach" };
}

export function nextTeach(run: Run): Run {
  if (run.phase !== "teach") return run;
  const step = run.step + 1;
  if (step >= run.lesson.teach.length) return { ...run, phase: "ask", step: 0 };
  return { ...run, step };
}

export function answer(run: Run, signal: Signal): Run {
  if (run.phase !== "ask") return run;
  if (signal === run.lesson.asks[run.step]) {
    const step = run.step + 1;
    if (step >= ASKS) return { ...run, step, phase: "won" };
    return { ...run, step };
  }
  const misses = run.misses + 1;
  if (misses >= MISSES) return { ...run, misses, phase: "lost" };
  return { ...run, misses };
}
