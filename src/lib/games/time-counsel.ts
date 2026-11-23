// Counsel Against Time v2 (2026-11-23). The old version was three pairs of
// card buttons and a 20-second clock. Now it is a real-time cross-check: the
// evidence board shows what really happened, witness statements slide across
// the stand as chips (weather · time · place · ride), and you tap the one chip
// that contradicts the evidence before the statement leaves. Tapping a true
// chip or letting a lie through costs credibility.
// 30 trials: more evidence, longer statements, faster witnesses.
// GAME_ID and the w/l record are kept; "score" best = highest trial cleared.

export const GAME_ID = "time-counsel";
export const STAGE_COUNT = 30;
export const HEARTS = 3;
export const GAP_S = 0.7; // pause between statements

export const CATS = ["weather", "time", "place", "ride"] as const;
export type Cat = (typeof CATS)[number];
export const VALUES: Record<Cat, readonly string[]> = {
  weather: ["sun", "rain", "snow", "fog"],
  time: ["dawn", "noon", "dusk", "night"],
  place: ["market", "bridge", "harbor", "station"],
  ride: ["walk", "bike", "taxi", "bus"],
};

export interface Chip { cat: Cat; val: string }
export interface Statement { chips: Chip[]; lie: number } // lie = index of the false chip, -1 if true

export interface Trial {
  index: number;
  evidence: Partial<Record<Cat, string>>;
  statements: Statement[];
  travelS: number; // seconds a statement stays on the stand
}

export type Outcome = "caught" | "passed" | "wrong" | "missed";

export interface RunState {
  trial: Trial;
  status: "ready" | "play" | "won" | "lost";
  at: number; // current statement
  t: number; // seconds into the current statement (negative = gap)
  hearts: number;
  outcomes: Outcome[];
  combo: number;
  score: number;
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

export function evidenceCount(i: number): number {
  return i < 5 ? 2 : i < 14 ? 3 : 4;
}
export function chipsPer(i: number): number {
  return i < 3 ? 2 : i < 12 ? 3 : 4;
}
export function statementCount(i: number): number {
  return 8 + Math.floor(i / 3); // 8 → 17
}
export function travelFor(i: number): number {
  return Math.max(2.6, 6.5 - i * 0.135); // 6.5s → 2.6s
}

const pickOne = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

export function makeTrial(index: number): Trial {
  const i = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const r = rng(0x7c0de + i * 6151);
  const cats = [...CATS].sort(() => r() - 0.5);
  const evCats = cats.slice(0, evidenceCount(i));
  const evidence: Partial<Record<Cat, string>> = {};
  for (const c of evCats) evidence[c] = pickOne(r, VALUES[c]);
  const statements: Statement[] = [];
  const n = statementCount(i);
  for (let k = 0; k < n; k++) {
    const size = Math.min(chipsPer(i), CATS.length);
    // every statement mentions at least one evidence category, in fixed CATS order
    const must = pickOne(r, evCats);
    const others = CATS.filter((c) => c !== must).sort(() => r() - 0.5).slice(0, size - 1);
    const used = CATS.filter((c) => c === must || others.includes(c));
    const chips: Chip[] = used.map((c) => ({ cat: c, val: evidence[c] ?? pickOne(r, VALUES[c]) }));
    let lie = -1;
    if (r() < 0.45) {
      const liable = chips.map((ch, j) => (evidence[ch.cat] ? j : -1)).filter((j) => j >= 0);
      lie = pickOne(r, liable);
      const ch = chips[lie]!;
      ch.val = pickOne(r, VALUES[ch.cat].filter((v) => v !== evidence[ch.cat]));
    }
    statements.push({ chips, lie });
  }
  // at least a third are lies, so objecting matters
  const need = Math.ceil(n / 3);
  for (let k = 0; statements.filter((s) => s.lie >= 0).length < need && k < n; k++) {
    const s = statements[k]!;
    if (s.lie >= 0) continue;
    const liable = s.chips.map((ch, j) => (evidence[ch.cat] ? j : -1)).filter((j) => j >= 0);
    s.lie = liable[0]!;
    const ch = s.chips[s.lie]!;
    ch.val = VALUES[ch.cat].find((v) => v !== evidence[ch.cat])!;
  }
  return { index: i, evidence, statements, travelS: travelFor(i) };
}

/** Whether a chip contradicts the evidence. Chips without evidence are never lies. */
export function isFalse(trial: Pick<Trial, "evidence">, chip: Chip): boolean {
  const e = trial.evidence[chip.cat];
  return e !== undefined && e !== chip.val;
}

export function newRun(index: number): RunState {
  return { trial: makeTrial(index), status: "ready", at: 0, t: -GAP_S, hearts: HEARTS, outcomes: [], combo: 0, score: 0 };
}

export function begin(s: RunState): RunState {
  return s.status === "ready" ? { ...s, status: "play" } : s;
}

function resolve(s: RunState, outcome: Outcome): RunState {
  const good = outcome === "caught" || outcome === "passed";
  const hearts = good ? s.hearts : s.hearts - 1;
  const combo = good ? s.combo + 1 : 0;
  const speed = Math.max(0, s.trial.travelS - Math.max(0, s.t));
  const gain = outcome === "caught" ? 100 + Math.round(speed * 20) + Math.min(combo, 10) * 10 : outcome === "passed" ? 20 : 0;
  const at = s.at + 1;
  const status: RunState["status"] = hearts <= 0 ? "lost" : at >= s.trial.statements.length ? "won" : "play";
  return { ...s, hearts, combo, score: s.score + gain, at, t: -GAP_S, outcomes: [...s.outcomes, outcome], status };
}

/** Object to chip `j` of the current statement. */
export function object(s: RunState, j: number): RunState {
  if (s.status !== "play" || s.t < 0) return s;
  const st = s.trial.statements[s.at];
  if (!st || !st.chips[j]) return s;
  return resolve(s, j === st.lie ? "caught" : "wrong");
}

export function tick(s: RunState, dt: number): RunState {
  if (s.status !== "play") return s;
  const t = s.t + dt;
  if (t < s.trial.travelS) return { ...s, t };
  const st = s.trial.statements[s.at]!;
  return resolve({ ...s, t }, st.lie >= 0 ? "missed" : "passed");
}

export function stars(s: RunState): number {
  if (s.status !== "won") return 0;
  return s.hearts === HEARTS ? 3 : s.hearts === HEARTS - 1 ? 2 : 1;
}
