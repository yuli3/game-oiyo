/**
 * Link Duel (링크 대결) — an original party game played through a shared link (2026-11-21).
 *
 * Trend basis: "friendslop" (cheap, light games played with friends) was the biggest
 * sub-trend among 2025-26 indie breakouts. Spread hook: friendslop + high concept —
 * "play ten tiny rounds, send the link, your friend plays the exact same ten".
 * No server: the link carries the league, the seed, each round score and a checksum.
 *
 * 12 leagues (stages). A match is 10 rounds drawn from five micro games; each round
 * scores 0-100. Clearing a league needs a total at or above its target.
 */

export const DUEL_SLUG = "link-duel";
export const DUEL_LEAGUES = 12;
export const ROUNDS = 10;

export type RoundKind = "sum" | "stop" | "count" | "odd" | "sequence";
export type Arrow = "up" | "down" | "left" | "right";

export type Round =
  | { kind: "sum"; a: number; b: number; options: number[]; answer: number; limitMs: number }
  | { kind: "stop"; periodMs: number; target: number; width: number }
  | { kind: "count"; dots: { x: number; y: number }[]; options: number[]; answer: number; showMs: number; limitMs: number }
  | { kind: "odd"; size: number; hue: number; delta: number; index: number; limitMs: number }
  | { kind: "sequence"; arrows: Arrow[]; showMs: number };

export interface Match { league: number; seed: number; rounds: Round[] }

export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function options(answer: number, spread: number, r: () => number): number[] {
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const d = 1 + Math.floor(r() * spread);
    const v = answer + (r() < 0.5 ? -d : d);
    if (v > 0) set.add(v);
  }
  return shuffled([...set], r);
}

export function leagueTarget(league: number): number {
  return 520 + league * 18;
}

/** Each match uses every kind twice, in a seeded order; difficulty rises with the league. */
export function createMatch(league: number, seed: number): Match {
  const lv = Math.max(0, Math.min(DUEL_LEAGUES - 1, Math.floor(league)));
  const r = rng((seed >>> 0) ^ (lv * 0x9e3779b1));
  const kinds = shuffled<RoundKind>(["sum", "stop", "count", "odd", "sequence", "sum", "stop", "count", "odd", "sequence"], r);
  const rounds: Round[] = kinds.map((kind) => {
    switch (kind) {
      case "sum": {
        const max = 9 + lv * 6;
        const a = 2 + Math.floor(r() * max);
        const b = 2 + Math.floor(r() * max);
        return { kind, a, b, answer: a + b, options: options(a + b, 3 + Math.floor(lv / 3), r), limitMs: 6000 - lv * 200 };
      }
      case "stop":
        return { kind, periodMs: 1700 - lv * 80, target: 0.2 + r() * 0.6, width: 0.12 - lv * 0.005 };
      case "count": {
        const n = 5 + Math.floor(r() * (4 + lv));
        const dots: { x: number; y: number }[] = [];
        let guard = 0;
        while (dots.length < n && guard++ < 500) {
          const p = { x: 0.08 + r() * 0.84, y: 0.1 + r() * 0.8 };
          if (dots.every((d) => Math.hypot(d.x - p.x, d.y - p.y) > 0.11)) dots.push(p);
        }
        return { kind, dots, answer: dots.length, options: options(dots.length, 2, r), showMs: 1500 - lv * 50, limitMs: 5000 };
      }
      case "odd": {
        const size = Math.min(7, 3 + Math.floor(lv / 3));
        return { kind, size, hue: Math.floor(r() * 360), delta: Math.max(6, 22 - lv * 1.4), index: Math.floor(r() * size * size), limitMs: 6000 - lv * 150 };
      }
      case "sequence": {
        const len = 3 + Math.floor(lv / 3);
        const all: Arrow[] = ["up", "down", "left", "right"];
        return { kind, arrows: Array.from({ length: len }, () => all[Math.floor(r() * 4)]), showMs: 600 - lv * 15 };
      }
    }
  });
  return { league: lv, seed: seed >>> 0, rounds };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Correct answers score 60 plus up to 40 for speed. Wrong or timeout = 0. */
export function scoreTimed(correct: boolean, elapsedMs: number, limitMs: number): number {
  if (!correct || elapsedMs > limitMs) return 0;
  return Math.round(60 + 40 * clamp(1 - elapsedMs / limitMs, 0, 1));
}

/** Position of the stop bar marker (0..1) at time t; it sweeps back and forth. */
export function stopPosition(round: Extract<Round, { kind: "stop" }>, tMs: number): number {
  const phase = (tMs % round.periodMs) / round.periodMs;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export function scoreStop(round: Extract<Round, { kind: "stop" }>, pos: number): number {
  const off = Math.abs(pos - round.target);
  if (off <= round.width / 4) return 100;
  return Math.round(100 * clamp(1 - (off - round.width / 4) / (round.width * 2), 0, 1));
}

export function scoreSequence(round: Extract<Round, { kind: "sequence" }>, input: Arrow[]): number {
  let ok = 0;
  for (let i = 0; i < round.arrows.length; i++) {
    if (input[i] !== round.arrows[i]) break;
    ok += 1;
  }
  return ok === round.arrows.length ? 100 : Math.round((ok / round.arrows.length) * 50);
}

/** Best possible score per round (what a perfect, instant player gets). */
export function perfectScore(round: Round): number {
  switch (round.kind) {
    case "stop":
      return scoreStop(round, round.target);
    case "sequence":
      return scoreSequence(round, round.arrows);
    default:
      return scoreTimed(true, 0, round.limitMs);
  }
}

export function totalScore(scores: readonly number[]): number {
  return scores.reduce((a, b) => a + clamp(Math.round(b), 0, 100), 0);
}

export function leagueCleared(league: number, scores: readonly number[]): boolean {
  return scores.length === ROUNDS && totalScore(scores) >= leagueTarget(league);
}

// ─── Duel links ────────────────────────────────────────────────────────────────
// ?duel=<league>.<seed36>.<scores as 10 base-36 pairs>.<check36>[.<name>]
export interface DuelChallenge { league: number; seed: number; scores: number[]; name: string }

function checksum(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1679616; // 4 base-36 digits
}

export function cleanName(name: string): string {
  return name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 12);
}

export function encodeDuel(c: DuelChallenge): string {
  const scores = c.scores.map((s) => clamp(Math.round(s), 0, 100).toString(36).padStart(2, "0")).join("");
  const body = `${c.league}.${(c.seed >>> 0).toString(36)}.${scores}`;
  const name = cleanName(c.name);
  return `${body}.${checksum(body + name).toString(36)}${name ? `.${encodeURIComponent(name)}` : ""}`;
}

export function decodeDuel(raw: string | null | undefined): DuelChallenge | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 4 || parts.length > 5) return null;
  const [lg, sd, sc, ck, nm] = parts;
  const league = Number(lg);
  if (!Number.isInteger(league) || league < 0 || league >= DUEL_LEAGUES) return null;
  if (!/^[0-9a-z]{1,7}$/.test(sd) || !/^[0-9a-z]{20}$/.test(sc)) return null;
  const seed = parseInt(sd, 36);
  const scores: number[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const v = parseInt(sc.slice(i * 2, i * 2 + 2), 36);
    if (!Number.isFinite(v) || v > 100) return null;
    scores.push(v);
  }
  let name = "";
  try {
    name = nm ? cleanName(decodeURIComponent(nm)) : "";
  } catch {
    return null;
  }
  if (checksum(`${lg}.${sd}.${sc}` + name).toString(36) !== ck) return null;
  return { league, seed, scores, name };
}

export function duelUrl(base: string, c: DuelChallenge): string {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.searchParams.set("duel", encodeDuel(c));
  return url.toString();
}

export type DuelVerdict = "win" | "lose" | "draw";
export function compareDuel(mine: readonly number[], theirs: readonly number[]): { verdict: DuelVerdict; roundsWon: number; roundsLost: number } {
  let roundsWon = 0;
  let roundsLost = 0;
  for (let i = 0; i < ROUNDS; i++) {
    if ((mine[i] ?? 0) > (theirs[i] ?? 0)) roundsWon += 1;
    else if ((mine[i] ?? 0) < (theirs[i] ?? 0)) roundsLost += 1;
  }
  const a = totalScore(mine);
  const b = totalScore(theirs);
  return { verdict: a > b ? "win" : a < b ? "lose" : "draw", roundsWon, roundsLost };
}

export function newSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
}
