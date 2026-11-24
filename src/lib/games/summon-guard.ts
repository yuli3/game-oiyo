/**
 * Summon Guard (소환 수비대) — an OIYO original random-summon merge defense (2026-11-24).
 *
 * Monsters march round and round the track that rings your camp. Spend coins to summon a guard onto an empty post —
 * you don't choose which: an archer, a mage, a frost caster or a cannon turns up at random. Two guards of the same kind
 * and rank merge into one guard of the next rank, of a random kind again. Every summon costs a little more than the
 * last; every monster that falls drops coins. If too many monsters are on the track at once, the camp is overrun.
 * Survive every wave, the boss at the end too.
 *
 * Pure and deterministic: each stage's waves and the luck of its summons and merges are seeded, so the same moves
 * always give the same guards.
 */

export const GUARD_SLUG = "summon-guard";
export const STAGE_COUNT = 30;
export const COLS = 4;
export const ROWS = 3;
export const POSTS = COLS * ROWS;
export const OVERRUN = 25;
export const MAX_RANK = 4;
export const TRACK = 1000; // the loop's length in track units

export type Kind = 0 | 1 | 2 | 3; // archer, mage, frost, cannon
export interface KindSpec { dmg: number; every: number; targets: number; slow: number }
export const KINDS: KindSpec[] = [
  { dmg: 10, every: 0.5, targets: 1, slow: 0 }, // archer
  { dmg: 7, every: 0.8, targets: 3, slow: 0 }, // mage
  { dmg: 5, every: 0.6, targets: 1, slow: 1.5 }, // frost (halves the target's speed)
  { dmg: 36, every: 1.6, targets: 1, slow: 0 }, // cannon
];
export const rankScale = (rank: number) => Math.pow(3, rank - 1);

export interface Guard { kind: Kind; rank: number; cool: number }
export interface Monster { hp: number; max: number; pos: number; speed: number; slowed: number; boss: boolean; reward: number }

export interface GuardStage {
  stage: number;
  waves: number;
  perWave: number;
  hp: number; // first wave's monster hp
  growth: number; // hp × growth each wave
  speed: number;
  bossHp: number;
  coins: number;
  seed: number;
  peakPar: number; // the most monsters on the track at once a quick player allows
}

export interface Camp {
  stage: GuardStage;
  t: number;
  coins: number;
  summons: number;
  posts: (Guard | null)[];
  monsters: Monster[];
  wave: number; // waves begun
  spawned: number; // monsters spawned in this wave
  nextSpawn: number;
  peak: number;
  kills: number;
  rngState: number;
  over: boolean;
  won: boolean;
}

export const SPAWN_GAP = 0.8;
export const WAVE_GAP = 4;
export const summonCost = (summons: number) => 10 + summons * 2;

function next(c: Camp): number {
  // mulberry32 step on the camp's own state, so every summon and merge draws in order
  c.rngState = (c.rngState + 0x6d2b79f5) >>> 0;
  let t = c.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newCamp(stage: GuardStage): Camp {
  return {
    stage, t: 0, coins: stage.coins, summons: 0, posts: new Array(POSTS).fill(null), monsters: [], wave: 0, spawned: 0, nextSpawn: 2,
    peak: 0, kills: 0, rngState: stage.seed >>> 0, over: false, won: false,
  };
}

/** Summons a random guard of rank 1 onto the first empty post; returns the post or −1. */
export function summon(c: Camp): number {
  if (c.over) return -1;
  const cost = summonCost(c.summons);
  const post = c.posts.indexOf(null);
  if (post < 0 || c.coins < cost) return -1;
  c.coins -= cost;
  c.summons++;
  c.posts[post] = { kind: Math.floor(next(c) * 4) as Kind, rank: 1, cool: 0.3 };
  return post;
}

export const canMerge = (c: Camp, a: number, b: number) => {
  const ga = c.posts[a];
  const gb = c.posts[b];
  return a !== b && !!ga && !!gb && ga.kind === gb.kind && ga.rank === gb.rank && ga.rank < MAX_RANK;
};

/** Merges post b into post a: one guard of the next rank, of a random kind. */
export function merge(c: Camp, a: number, b: number): boolean {
  if (c.over || !canMerge(c, a, b)) return false;
  const rank = c.posts[a]!.rank + 1;
  c.posts[b] = null;
  c.posts[a] = { kind: Math.floor(next(c) * 4) as Kind, rank, cool: 0.3 };
  return true;
}

/** A post that can merge with this one, or −1. */
export function partner(c: Camp, a: number): number {
  for (let b = 0; b < POSTS; b++) if (canMerge(c, a, b)) return b;
  return -1;
}

function spawn(c: Camp): void {
  const st = c.stage;
  const last = c.wave === st.waves;
  const hp = last && c.spawned === st.perWave - 1 ? st.bossHp : Math.round(st.hp * Math.pow(st.growth, c.wave - 1));
  const boss = last && c.spawned === st.perWave - 1;
  c.monsters.push({ hp, max: hp, pos: 0, speed: boss ? st.speed * 0.6 : st.speed, slowed: 0, boss, reward: boss ? 30 : 3 });
}

export interface StepEvents { hits: Array<{ post: number; monster: number }>; kills: number; spawned: boolean }

export function step(c: Camp, dt: number): StepEvents {
  const ev: StepEvents = { hits: [], kills: 0, spawned: false };
  if (c.over) return ev;
  const st = c.stage;
  c.t += dt;
  // waves: a pause, then a monster every SPAWN_GAP
  if (c.t >= c.nextSpawn && c.wave <= st.waves) {
    if (c.wave === 0 || c.spawned >= st.perWave) {
      if (c.wave < st.waves) {
        c.wave++;
        c.spawned = 0;
      }
    }
    if (c.spawned < st.perWave && c.wave >= 1) {
      spawn(c);
      c.spawned++;
      ev.spawned = true;
      c.nextSpawn = c.t + (c.spawned >= st.perWave ? WAVE_GAP : SPAWN_GAP);
    }
  }
  for (const m of c.monsters) {
    const v = m.slowed > 0 ? m.speed * 0.5 : m.speed;
    m.pos = (m.pos + v * dt) % TRACK;
    m.slowed = Math.max(0, m.slowed - dt);
  }
  // every guard shoots the monsters that have marched furthest round (the loop never ends, so those who've been
  // out longest go first): order by time on the track, kept as spawn order
  c.posts.forEach((g, p) => {
    if (!g) return;
    g.cool -= dt;
    if (g.cool > 0 || !c.monsters.length) return;
    const spec = KINDS[g.kind];
    g.cool += spec.every;
    const dmg = spec.dmg * rankScale(g.rank);
    for (let k = 0; k < Math.min(spec.targets, c.monsters.length); k++) {
      const m = c.monsters[k];
      m.hp -= dmg;
      if (spec.slow) m.slowed = spec.slow;
      ev.hits.push({ post: p, monster: k });
    }
  });
  const before = c.monsters.length;
  c.monsters = c.monsters.filter((m) => {
    if (m.hp > 0) return true;
    c.coins += m.reward;
    c.kills++;
    return false;
  });
  ev.kills = before - c.monsters.length;
  c.peak = Math.max(c.peak, c.monsters.length);
  if (c.monsters.length >= OVERRUN) c.over = true;
  else if (c.wave === st.waves && c.spawned >= st.perWave && !c.monsters.length) {
    c.over = true;
    c.won = true;
  }
  return ev;
}

export function starsFor(c: Camp): number {
  if (!c.won) return 0;
  if (c.peak <= c.stage.peakPar) return 3;
  if (c.peak <= Math.round((c.stage.peakPar + OVERRUN) / 2)) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CommanderOpts {
  /** seconds between the player's moves */
  react?: number;
  seed?: number;
  /** "think" merges whenever a pair is there and summons when it can; "summon" never merges; "random" pokes at random */
  mode?: "think" | "summon" | "random";
}

export function pilot(st: GuardStage, opts: CommanderOpts = {}): Camp {
  const { react = 0.6, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 5381 + 7);
  const c = newCamp(st);
  const dt = 1 / 20;
  let busy = 1;
  while (!c.over && c.t < 600) {
    if (c.t >= busy) {
      busy = c.t + react * (0.75 + rng() * 0.5);
      if (mode === "think") {
        // the highest pair first, then a summon
        let done = false;
        const order = c.posts.map((_, i) => i).filter((i) => c.posts[i]).sort((a, b) => c.posts[b]!.rank - c.posts[a]!.rank);
        for (const a of order) {
          const b = partner(c, a);
          if (b >= 0) {
            merge(c, a, b);
            done = true;
            break;
          }
        }
        if (!done) summon(c);
      } else if (mode === "summon") summon(c);
      else {
        const r = rng();
        if (r < 0.34) summon(c);
        else if (r < 0.67) {
          const filled = shuffle(c.posts.map((_, i) => i).filter((i) => c.posts[i]), rng);
          if (filled.length >= 2) merge(c, filled[0], filled[1]);
        }
      }
    }
    step(c, dt);
  }
  return c;
}

function shape(stage: number) {
  return {
    waves: 5 + Math.floor(stage / 5),
    perWave: 10,
    growth: 1.36 + Math.min(0.06, stage * 0.002),
    speed: 120,
  };
}

/** Human-like commanders used to check a stage: a move every two-thirds of a second, pairs merged as they show up. */
export const HUMAN_COMMANDERS: CommanderOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.7, seed }));

function layout(stage: number, attempt: number, hp: number): GuardStage {
  const sh = shape(stage);
  const seed = 301000 + stage * 197 + attempt * 7919;
  const lastHp = hp * Math.pow(sh.growth, sh.waves - 1);
  return { stage, waves: sh.waves, perWave: sh.perWave, hp, growth: sh.growth, speed: sh.speed, bossHp: Math.round(lastHp * 6), coins: 40, seed, peakPar: 0 };
}

/** The first-wave hp to try, toughest first: the toughest one human-like commanders still hold is kept. */
const HP_STEPS = Array.from({ length: 34 }, (_, k) => Math.round(320 * Math.pow(0.93, k)));

/** Finds the toughest monsters that human-like commanders hold, a never-merging summoner can't, and random pokes can't. */
export function buildStage(stage: number): GuardStage {
  const fair = (st: GuardStage) => {
    if (HUMAN_COMMANDERS.map((o) => pilot(st, o)).filter((r) => r.won).length < 5) return "hard";
    if (stage >= 4 && pilot(st, { mode: "summon", react: 0.5 }).won) return "easy";
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", react: 0.7, seed }).won)) return "easy";
    return pilot(st, { react: 0.35, seed: 1 }).won ? "ok" : "hard";
  };
  for (let attempt = 0; attempt < 30; attempt++) {
    for (let k = 0; k < HP_STEPS.length; k++) {
      const verdict = fair(layout(stage, attempt, HP_STEPS[k]));
      if (verdict === "hard") continue;
      if (verdict === "easy") break;
      // the toughest fair hp found: ease off up to two steps while random play still can't hold
      let pick = k;
      for (const j of [k + 2, k + 1]) if (j < HP_STEPS.length && fair(layout(stage, attempt, HP_STEPS[j])) === "ok") { pick = j; break; }
      const st = layout(stage, attempt, HP_STEPS[pick]);
      st.peakPar = Math.max(3, pilot(st, { react: 0.35, seed: 1 }).peak + 1);
      return st;
    }
  }
  throw new Error(`summon-guard stage ${stage + 1}: no fair defense`);
}

export const GUARD_STAGES: GuardStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
