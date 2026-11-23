// Monster Interview v2 (2026-11-23). The old daily 2-bit puzzle was three
// button presses a day; it became a hiring desk. Monsters walk in with a
// resume, the board posts today's hiring rules, and the player stamps HIRE or
// REJECT. A forged resume (one trait differs from the monster at the desk) is
// always a reject once forgery checks open. 30 days, three strikes per day.
// GAME_ID and the w/l GameRecord stay, so old records are kept.

export const GAME_ID = "monster-interview";
export const STAGE_COUNT = 30;
export const STRIKES = 3;
export const FORGERY_FROM = 7; // stage index (0-based) where forged resumes start

export const COLORS = ["red", "green", "blue", "purple"] as const;
export const ELEMENTS = ["fire", "water", "ghost", "plain"] as const;
export type Color = (typeof COLORS)[number];
export type Element = (typeof ELEMENTS)[number];

export interface Traits {
  color: Color;
  eyes: number; // 1..4
  horns: number; // 0..2
  element: Element;
}

export interface Candidate {
  monster: Traits; // who walked in
  resume: Traits; // what the paper says
  forged: boolean;
  shape: number; // body variant 0..2, cosmetic only
}

export type Rule =
  | { kind: "eyesAtLeast"; n: number }
  | { kind: "eyesAtMost"; n: number }
  | { kind: "hornsNone" }
  | { kind: "hornsSome" }
  | { kind: "colorIs"; color: Color }
  | { kind: "colorNot"; color: Color }
  | { kind: "elementIs"; element: Element }
  | { kind: "elementNot"; element: Element };

export interface Stage {
  index: number;
  rules: Rule[];
  forgery: boolean;
  candidates: Candidate[];
  timeMs: number; // per candidate
}

export type Verdict = "hire" | "reject";
export type Status = "ready" | "play" | "won" | "lost";

export interface DeskState {
  stage: Stage;
  status: Status;
  at: number; // current candidate index
  strikes: number;
  correct: number;
  combo: number;
  bestCombo: number;
  score: number;
  log: { verdict: Verdict; right: boolean; reason: Reason }[];
}

export type Reason = "fits" | "rule" | "forged" | "timeout";

// ---------- seeded random ----------
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
const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

export function randomTraits(r: () => number): Traits {
  return { color: pick(r, COLORS), eyes: 1 + Math.floor(r() * 4), horns: Math.floor(r() * 3), element: pick(r, ELEMENTS) };
}

export function ruleHolds(rule: Rule, t: Traits): boolean {
  switch (rule.kind) {
    case "eyesAtLeast": return t.eyes >= rule.n;
    case "eyesAtMost": return t.eyes <= rule.n;
    case "hornsNone": return t.horns === 0;
    case "hornsSome": return t.horns > 0;
    case "colorIs": return t.color === rule.color;
    case "colorNot": return t.color !== rule.color;
    case "elementIs": return t.element === rule.element;
    case "elementNot": return t.element !== rule.element;
  }
}

/** The right verdict and why. Forgery is checked first when the stage has it. */
export function judge(stage: Pick<Stage, "rules" | "forgery">, c: Candidate): { verdict: Verdict; reason: Reason } {
  if (stage.forgery && c.forged) return { verdict: "reject", reason: "forged" };
  for (const rule of stage.rules) if (!ruleHolds(rule, c.resume)) return { verdict: "reject", reason: "rule" };
  return { verdict: "hire", reason: "fits" };
}

function ruleKey(rule: Rule): string {
  return JSON.stringify(rule);
}

function randomRule(r: () => number): Rule {
  const k = Math.floor(r() * 8);
  switch (k) {
    case 0: return { kind: "eyesAtLeast", n: 2 + Math.floor(r() * 2) };
    case 1: return { kind: "eyesAtMost", n: 2 + Math.floor(r() * 2) };
    case 2: return { kind: "hornsNone" };
    case 3: return { kind: "hornsSome" };
    case 4: return { kind: "colorIs", color: pick(r, COLORS) };
    case 5: return { kind: "colorNot", color: pick(r, COLORS) };
    case 6: return { kind: "elementIs", element: pick(r, ELEMENTS) };
    default: return { kind: "elementNot", element: pick(r, ELEMENTS) };
  }
}

function sameTopic(a: Rule, b: Rule): boolean {
  const topic = (x: Rule) => (x.kind.startsWith("eyes") ? "eyes" : x.kind.startsWith("horns") ? "horns" : x.kind.startsWith("color") ? "color" : "element");
  return topic(a) === topic(b);
}

/** A rule set some monster can pass. One rule per trait topic, so rules never contradict. */
function makeRules(r: () => number, count: number): Rule[] {
  const rules: Rule[] = [];
  let guard = 0;
  while (rules.length < count && guard++ < 200) {
    const next = randomRule(r);
    if (rules.some((x) => sameTopic(x, next) || ruleKey(x) === ruleKey(next))) continue;
    rules.push(next);
  }
  return rules;
}

export function rulesFor(index: number): number {
  if (index < 5) return 1;
  if (index < 16) return 2;
  return 3;
}

export function candidatesFor(index: number): number {
  return Math.min(14, 6 + Math.floor(index / 3));
}

export function timeFor(index: number): number {
  return Math.max(3500, 8000 - index * 160);
}

function forge(r: () => number, t: Traits): Traits {
  const out = { ...t };
  const k = Math.floor(r() * 4);
  if (k === 0) out.color = pick(r, COLORS.filter((c) => c !== t.color));
  else if (k === 1) out.eyes = pick(r, [1, 2, 3, 4].filter((n) => n !== t.eyes));
  else if (k === 2) out.horns = pick(r, [0, 1, 2].filter((n) => n !== t.horns));
  else out.element = pick(r, ELEMENTS.filter((e) => e !== t.element));
  return out;
}

/** Deterministic stage. Roughly half of each day should be hires. */
export function makeStage(index: number): Stage {
  const i = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const r = rng(0x5eed + i * 7919);
  const rules = makeRules(r, rulesFor(i));
  const forgery = i >= FORGERY_FROM;
  const n = candidatesFor(i);
  const candidates: Candidate[] = [];
  for (let k = 0; k < n; k++) {
    // target outcome: alternate-ish so a day is never all hires or all rejects
    const wantHire = r() < 0.5;
    const wantForged = forgery && !wantHire && r() < 0.45;
    let c: Candidate | null = null;
    for (let tries = 0; tries < 400 && !c; tries++) {
      const monster = randomTraits(r);
      const forged = wantForged;
      // a forged resume claims traits that pass the rules, so only the forgery check catches it
      const resume = forged ? forge(r, monster) : monster;
      const cand: Candidate = { monster, resume, forged, shape: Math.floor(r() * 3) };
      const { verdict } = judge({ rules, forgery }, cand);
      if (forged) {
        if (rules.every((rule) => ruleHolds(rule, resume))) c = cand;
      } else if ((verdict === "hire") === wantHire) c = cand;
    }
    candidates.push(c ?? { monster: randomTraits(r), resume: randomTraits(r), forged: false, shape: 0 });
    // keep monster === resume when not forged (the fallback above could break it)
    const last = candidates[candidates.length - 1]!;
    if (!last.forged) last.resume = last.monster;
  }
  return { index: i, rules, forgery, candidates, timeMs: timeFor(i) };
}

export function newDesk(index: number): DeskState {
  return { stage: makeStage(index), status: "ready", at: 0, strikes: 0, correct: 0, combo: 0, bestCombo: 0, score: 0, log: [] };
}

export function begin(s: DeskState): DeskState {
  return s.status === "ready" ? { ...s, status: "play" } : s;
}

/** Apply a stamp. `leftMs` is the time left on this candidate (speed bonus). */
export function stamp(s: DeskState, verdict: Verdict | "timeout", leftMs = 0): DeskState {
  if (s.status !== "play") return s;
  const c = s.stage.candidates[s.at];
  if (!c) return s;
  const want = judge(s.stage, c);
  const right = verdict === want.verdict;
  const reason: Reason = verdict === "timeout" ? "timeout" : want.reason;
  const combo = right ? s.combo + 1 : 0;
  const bonus = right ? Math.round(Math.max(0, leftMs) / 100) : 0;
  const score = s.score + (right ? 100 + bonus + Math.min(combo, 10) * 10 : 0);
  const strikes = s.strikes + (right ? 0 : 1);
  const at = s.at + 1;
  const log = [...s.log, { verdict: verdict === "timeout" ? "reject" as Verdict : verdict, right, reason }];
  let status: Status = "play";
  if (strikes >= STRIKES) status = "lost";
  else if (at >= s.stage.candidates.length) status = "won";
  return { ...s, at, strikes, combo, bestCombo: Math.max(s.bestCombo, combo), correct: s.correct + (right ? 1 : 0), score, status, log };
}

export function stars(s: DeskState): number {
  if (s.status !== "won") return 0;
  return s.strikes === 0 ? 3 : s.strikes === 1 ? 2 : 1;
}
