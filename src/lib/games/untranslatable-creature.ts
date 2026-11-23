// Untranslatable Creature v2 (2026-11-23). The old version was four symbol
// buttons. Now it is call-and-response rhythm: the creature drums a phrase,
// then you tap the same phrase back on its belly, in time. Its words have no
// translation, only rhythm, so all six locales play the same lesson.
// 30 stages: phrases grow from 4 to 8 beats, tempo rises, rests get trickier.
// GAME_ID, the w/l record and the "score" best are kept.

export const GAME_ID = "untranslatable-creature";
export const STAGE_COUNT = 30;
export const MOODS = 3; // misses allowed per stage

export type Grade = "perfect" | "good" | "miss";

export interface Phrase {
  beats: number[]; // 1 = drum, 0 = rest; length = steps
  bpm: number;
}

export interface Stage {
  index: number;
  phrases: Phrase[];
  stepMs: number;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stepsFor(index: number): number {
  return index < 6 ? 4 : index < 14 ? 6 : 8;
}
export function bpmFor(index: number): number {
  return 84 + index * 3; // 84 → 171
}
export function phrasesFor(index: number): number {
  return 4 + Math.floor(index / 6); // 4 → 8
}

/** A phrase always starts on a drum and has at least two drums and one rest. */
export function makePhrase(r: () => number, steps: number, bpm: number): Phrase {
  for (let tries = 0; tries < 100; tries++) {
    const beats: number[] = Array.from({ length: steps }, (_, i) => (i === 0 ? 1 : r() < 0.55 ? 1 : 0));
    const on = beats.reduce((a, b) => a + b, 0);
    if (on >= 2 && on < steps) return { beats, bpm };
  }
  return { beats: [1, 0, 1, 0, 1, 1, 0, 1].slice(0, steps), bpm };
}

export function makeStage(index: number): Stage {
  const i = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const r = rng(0xc0ffee + i * 4099);
  const steps = stepsFor(i);
  const bpm = bpmFor(i);
  const phrases: Phrase[] = [];
  for (let k = 0; k < phrasesFor(i); k++) {
    let p = makePhrase(r, steps, bpm);
    // no two identical phrases in a row
    for (let g = 0; g < 10 && phrases.length && phrases[phrases.length - 1]!.beats.join("") === p.beats.join(""); g++) p = makePhrase(r, steps, bpm);
    phrases.push(p);
  }
  return { index: i, phrases, stepMs: Math.round(60000 / bpm / 2) }; // eighth-note steps
}

/** Times (ms from phrase start) at which a drum should sound. */
export function drumTimes(p: Phrase, stepMs: number): number[] {
  const out: number[] = [];
  p.beats.forEach((b, i) => { if (b) out.push(i * stepMs); });
  return out;
}

export const PERFECT_MS = 70;
export const GOOD_MS = 150;

export interface Judged { grades: Grade[]; extra: number; passed: boolean; points: number }

/**
 * Grade the player's taps (ms from the start of their answer window) against
 * the phrase. Each expected drum takes the nearest unused tap within GOOD_MS.
 * Extra taps beyond one stray count against you. Passing needs no misses and
 * at most one stray tap.
 */
export function judge(p: Phrase, stepMs: number, taps: number[]): Judged {
  const want = drumTimes(p, stepMs);
  const used = new Set<number>();
  const grades: Grade[] = want.map((w) => {
    let best = -1;
    let bestD = Infinity;
    taps.forEach((t, k) => {
      if (used.has(k)) return;
      const d = Math.abs(t - w);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (best < 0 || bestD > GOOD_MS) return "miss";
    used.add(best);
    return bestD <= PERFECT_MS ? "perfect" : "good";
  });
  const extra = taps.length - used.size;
  const passed = grades.every((g) => g !== "miss") && extra <= 1;
  const points = grades.reduce((s, g) => s + (g === "perfect" ? 100 : g === "good" ? 50 : 0), 0) - extra * 25;
  return { grades, extra, passed, points: Math.max(0, points) };
}

export interface RunState {
  stage: Stage;
  status: "ready" | "play" | "won" | "lost";
  at: number; // phrase index
  moods: number; // misses left
  score: number;
  streak: number;
}

export function newRun(index: number): RunState {
  return { stage: makeStage(index), status: "ready", at: 0, moods: MOODS, score: 0, streak: 0 };
}

export function begin(s: RunState): RunState {
  return s.status === "ready" ? { ...s, status: "play" } : s;
}

/** Apply a judged answer. A failed phrase costs a mood and is repeated. */
export function answer(s: RunState, j: Judged): RunState {
  if (s.status !== "play") return s;
  if (!j.passed) {
    const moods = s.moods - 1;
    return { ...s, moods, streak: 0, status: moods <= 0 ? "lost" : "play" };
  }
  const streak = s.streak + 1;
  const score = s.score + j.points + Math.min(streak, 8) * 20;
  const at = s.at + 1;
  return { ...s, at, streak, score, status: at >= s.stage.phrases.length ? "won" : "play" };
}

export function stars(s: RunState): number {
  if (s.status !== "won") return 0;
  return s.moods === MOODS ? 3 : s.moods === MOODS - 1 ? 2 : 1;
}
