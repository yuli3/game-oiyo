/**
 * Cat Expedition (고양이 원정대) — an original party roguelite (2026-11-21).
 *
 * Trend basis: roguelites/deckbuilders are the top-selling indie genre by units
 * (2021→2025), and a cat-party tactics roguelite was one of 2026's breakout hits.
 * Ours is a short, turn-based browser take: a party of three cats with one
 * skill each climbs 3 regions × 10 floors (30 stages), picks a reward after
 * every floor and may recruit a new cat on floors 3, 13 and 23.
 *
 * Everything is pure and seeded so runs are reproducible and testable.
 */

export const CAT_SLUG = "cat-expedition";
export const FLOORS = 30;
export const FLOORS_PER_REGION = 10;
export const SKILL_COOLDOWN = 3;
export const RECRUIT_FLOORS = [3, 13, 23] as const;
/** Cats that start (or join) in a later region get this much growth per region, standing in for missed rewards. */
export const REGION_HP_BONUS = 16;
export const REGION_ATK_BONUS = 3;

export type CatKind = "chonk" | "hunter" | "kneader" | "static" | "shadow" | "boxer";
export type EnemyKind =
  | "rat" | "pigeon" | "stray" | "rat-boss"
  | "vacuum" | "crow" | "fan" | "vacuum-boss"
  | "raccoon" | "owl" | "cloud" | "owl-boss";

export interface CatDef { hp: number; atk: number }
export const CAT_DEFS: Record<CatKind, CatDef> = {
  chonk: { hp: 32, atk: 3 }, // skill: taunt 2 rounds + shield 5
  hunter: { hp: 18, atk: 6 }, // skill: pounce, triple damage on one enemy
  kneader: { hp: 17, atk: 2 }, // skill: knead, heal every cat 7
  static: { hp: 15, atk: 3 }, // skill: static fur, 5 damage to every enemy
  shadow: { hp: 16, atk: 5 }, // skill: vanish, dodge the next hit and crit next attack
  boxer: { hp: 24, atk: 4 }, // skill: box fort, whole party takes half damage this round
};
export const STARTING_PARTY: CatKind[] = ["chonk", "hunter", "kneader"];
export const ALL_CATS: CatKind[] = ["chonk", "hunter", "kneader", "static", "shadow", "boxer"];

interface EnemyDef { hp: number; atk: number; aoe?: boolean; boss?: boolean }
export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  rat: { hp: 9, atk: 2 },
  pigeon: { hp: 7, atk: 3 },
  stray: { hp: 15, atk: 4 },
  "rat-boss": { hp: 60, atk: 5, boss: true },
  vacuum: { hp: 18, atk: 4 },
  crow: { hp: 12, atk: 5 },
  fan: { hp: 20, atk: 2, aoe: true },
  "vacuum-boss": { hp: 100, atk: 5, boss: true },
  raccoon: { hp: 24, atk: 6 },
  owl: { hp: 18, atk: 7 },
  cloud: { hp: 26, atk: 3, aoe: true },
  "owl-boss": { hp: 150, atk: 7, boss: true },
};
const REGION_ENEMIES: EnemyKind[][] = [
  ["rat", "pigeon", "stray"],
  ["vacuum", "crow", "fan"],
  ["raccoon", "owl", "cloud"],
];
const REGION_BOSS: EnemyKind[] = ["rat-boss", "vacuum-boss", "owl-boss"];

export interface Unit {
  uid: string;
  kind: CatKind | EnemyKind;
  hp: number;
  maxHp: number;
  atk: number;
  cd: number;
  shield: number;
  taunt: number;
  vanish: boolean;
  crit: boolean;
  aoe: boolean;
  boss: boolean;
}

export type RewardKind = "treat" | "toy" | "nap" | "bell" | "revive" | "collar";
export interface Reward { kind: RewardKind; target?: number }

export type Phase = "battle" | "reward" | "recruit" | "won" | "lost";

export interface FxEvent {
  kind: "hit" | "heal" | "shield" | "dodge" | "skill" | "down" | "summon";
  side: "cat" | "enemy";
  index: number;
  amount?: number;
}

export interface Run {
  rng: number;
  floor: number;
  startFloor: number;
  cats: Unit[];
  enemies: Unit[];
  phase: Phase;
  /** Index of the cat whose turn it is in the current round. */
  actor: number;
  round: number;
  halfDamage: boolean;
  rewards: Reward[];
  recruit: CatKind | null;
  fx: FxEvent[];
  uid: number;
}

// ─── RNG (stored in the run so it stays pure) ────────────────────────────
function next(run: Run): number {
  run.rng = (run.rng + 0x6d2b79f5) >>> 0;
  let t = run.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(run: Run, list: readonly T[]): T => list[Math.floor(next(run) * list.length)];

export const regionOf = (floor: number) => Math.min(2, Math.floor((floor - 1) / FLOORS_PER_REGION));
export const isBossFloor = (floor: number) => floor % FLOORS_PER_REGION === 0;

function makeCat(run: Run, kind: CatKind, bonus: number): Unit {
  const d = CAT_DEFS[kind];
  const hp = d.hp + bonus * REGION_HP_BONUS;
  return { uid: `c${run.uid++}`, kind, hp, maxHp: hp, atk: d.atk + bonus * REGION_ATK_BONUS, cd: 0, shield: 0, taunt: 0, vanish: false, crit: false, aoe: false, boss: false };
}

function makeEnemy(run: Run, kind: EnemyKind, floor: number): Unit {
  const d = ENEMY_DEFS[kind];
  const step = (floor - 1) % FLOORS_PER_REGION;
  const scale = 1 + step * 0.12;
  const hp = Math.round(d.hp * scale);
  return { uid: `e${run.uid++}`, kind, hp, maxHp: hp, atk: Math.round(d.atk * (1 + step * 0.08)), cd: 0, shield: 0, taunt: 0, vanish: false, crit: false, aoe: !!d.aoe, boss: !!d.boss };
}

export function enemiesForFloor(run: Run, floor: number): Unit[] {
  const r = regionOf(floor);
  if (isBossFloor(floor)) {
    const list = [makeEnemy(run, REGION_BOSS[r], floor)];
    if (r > 0) list.push(makeEnemy(run, REGION_ENEMIES[r][0], floor));
    return list;
  }
  const step = (floor - 1) % FLOORS_PER_REGION;
  const count = step < 2 ? 1 : step < 6 ? 2 : 3;
  return Array.from({ length: count }, () => makeEnemy(run, pick(run, REGION_ENEMIES[r]), floor));
}

/** Highest floor a new run may start from: the start of any region whose previous boss was beaten. */
export function startFloors(cleared: readonly number[]): number[] {
  const starts = [1];
  if (cleared.includes(9)) starts.push(11); // floor 10 is index 9
  if (cleared.includes(19)) starts.push(21);
  return starts;
}

export function newRun(seed: number, startFloor = 1): Run {
  const run: Run = {
    rng: seed >>> 0, floor: startFloor, startFloor, cats: [], enemies: [], phase: "battle", actor: 0, round: 1,
    halfDamage: false, rewards: [], recruit: null, fx: [], uid: 0,
  };
  const bonus = regionOf(startFloor);
  run.cats = STARTING_PARTY.map((k) => makeCat(run, k, bonus));
  run.enemies = enemiesForFloor(run, startFloor);
  return run;
}

export const alive = (u: Unit) => u.hp > 0;

function firstLivingCat(run: Run, from: number): number {
  for (let i = from; i < run.cats.length; i++) if (alive(run.cats[i])) return i;
  return -1;
}

function damageEnemy(run: Run, i: number, amount: number) {
  const e = run.enemies[i];
  if (!e || !alive(e)) return;
  e.hp = Math.max(0, e.hp - amount);
  run.fx.push({ kind: "hit", side: "enemy", index: i, amount });
  if (!alive(e)) run.fx.push({ kind: "down", side: "enemy", index: i });
}

function damageCat(run: Run, i: number, raw: number) {
  const c = run.cats[i];
  if (!alive(c)) return;
  if (c.vanish) {
    c.vanish = false;
    run.fx.push({ kind: "dodge", side: "cat", index: i });
    return;
  }
  let amount = run.halfDamage ? Math.ceil(raw / 2) : raw;
  const absorbed = Math.min(c.shield, amount);
  c.shield -= absorbed;
  amount -= absorbed;
  c.hp = Math.max(0, c.hp - amount);
  run.fx.push({ kind: "hit", side: "cat", index: i, amount });
  if (!alive(c)) run.fx.push({ kind: "down", side: "cat", index: i });
}

export type Action = { kind: "attack"; target: number } | { kind: "skill"; target?: number };

export function canUseSkill(run: Run): boolean {
  const c = run.cats[run.actor];
  return run.phase === "battle" && !!c && alive(c) && c.cd === 0;
}

/** The current cat acts. When every living cat has acted, the enemies take their turn. */
export function act(run: Run, action: Action): Run {
  if (run.phase !== "battle") return run;
  const cat = run.cats[run.actor];
  if (!cat || !alive(cat)) return run;
  run.fx = [];
  const livingEnemy = (t: number | undefined) => (t !== undefined && run.enemies[t] && alive(run.enemies[t]) ? t : run.enemies.findIndex(alive));
  if (action.kind === "attack") {
    const t = livingEnemy(action.target);
    let dmg = cat.atk;
    if (cat.crit) {
      dmg *= 2;
      cat.crit = false;
    }
    damageEnemy(run, t, dmg);
  } else {
    if (cat.cd > 0) return run;
    cat.cd = SKILL_COOLDOWN;
    const kind = cat.kind as CatKind;
    run.fx.push({ kind: "skill", side: "cat", index: run.actor });
    if (kind === "chonk") {
      cat.taunt = 2;
      cat.shield += 5;
      run.fx.push({ kind: "shield", side: "cat", index: run.actor, amount: 5 });
    } else if (kind === "hunter") {
      damageEnemy(run, livingEnemy(action.target), cat.atk * 3);
    } else if (kind === "kneader") {
      run.cats.forEach((c, i) => {
        if (!alive(c)) return;
        const h = Math.min(7, c.maxHp - c.hp);
        c.hp += h;
        run.fx.push({ kind: "heal", side: "cat", index: i, amount: h });
      });
    } else if (kind === "static") {
      run.enemies.forEach((e, i) => { if (alive(e)) damageEnemy(run, i, 5 + Math.floor(cat.atk / 2)); });
    } else if (kind === "shadow") {
      cat.vanish = true;
      cat.crit = true;
    } else if (kind === "boxer") {
      run.halfDamage = true;
    }
  }
  if (!run.enemies.some(alive)) return winFloor(run);
  const nextActor = firstLivingCat(run, run.actor + 1);
  if (nextActor >= 0) {
    run.actor = nextActor;
    return run;
  }
  return enemyTurn(run);
}

function enemyTurn(run: Run): Run {
  run.enemies.forEach((e, ei) => {
    if (!alive(e) || !run.cats.some(alive)) return;
    // Bosses summon a helper every third round when they stand alone.
    if (e.boss && run.round % 3 === 0 && run.enemies.filter(alive).length < 3) {
      const r = regionOf(run.floor);
      run.enemies.push(makeEnemy(run, REGION_ENEMIES[r][0], run.floor));
      run.fx.push({ kind: "summon", side: "enemy", index: run.enemies.length - 1 });
    }
    if (e.aoe || (e.boss && run.round % 2 === 0)) {
      run.cats.forEach((c, i) => { if (alive(c)) damageCat(run, i, Math.max(1, Math.round(e.atk * 0.6))); });
    } else {
      const taunter = run.cats.findIndex((c) => alive(c) && c.taunt > 0);
      const living = run.cats.map((c, i) => (alive(c) ? i : -1)).filter((i) => i >= 0);
      const t = taunter >= 0 ? taunter : pick(run, living);
      damageCat(run, t, e.atk);
    }
    void ei;
  });
  run.halfDamage = false;
  run.cats.forEach((c) => {
    if (c.cd > 0) c.cd--;
    if (c.taunt > 0) c.taunt--;
  });
  run.round++;
  if (!run.cats.some(alive)) {
    run.phase = "lost";
    return run;
  }
  run.actor = firstLivingCat(run, 0);
  return run;
}

const REWARD_POOL: RewardKind[] = ["treat", "toy", "nap", "bell", "revive", "collar"];

function winFloor(run: Run): Run {
  if (run.floor >= FLOORS) {
    run.phase = "won";
    return run;
  }
  if (isBossFloor(run.floor)) {
    // A boss win restores the whole party.
    run.cats.forEach((c) => { c.hp = c.maxHp; c.cd = 0; });
  }
  const pool = REWARD_POOL.filter((k) => k !== "revive" || run.cats.some((c) => !alive(c)));
  const offered: Reward[] = [];
  while (offered.length < 3 && pool.length) {
    const kind = pool.splice(Math.floor(next(run) * pool.length), 1)[0];
    const target = kind === "toy" || kind === "collar" ? pick(run, run.cats.map((c, i) => (alive(c) ? i : -1)).filter((i) => i >= 0)) : undefined;
    offered.push({ kind, target });
  }
  run.rewards = offered;
  run.phase = "reward";
  return run;
}

/** Applies a reward, then goes to the recruit offer or the next floor. */
export function takeReward(run: Run, index: number): Run {
  if (run.phase !== "reward") return run;
  const r = run.rewards[index];
  if (r) {
    if (r.kind === "treat") run.cats.forEach((c) => { if (alive(c)) c.hp = Math.min(c.maxHp, c.hp + Math.ceil(c.maxHp * 0.4)); });
    else if (r.kind === "nap") run.cats.forEach((c) => { if (alive(c)) c.hp = c.maxHp; });
    else if (r.kind === "bell") run.cats.forEach((c) => { c.maxHp += 4; if (alive(c)) c.hp += 4; });
    else if (r.kind === "revive") run.cats.forEach((c) => { if (!alive(c)) c.hp = Math.ceil(c.maxHp / 2); });
    else if (r.kind === "toy" && r.target !== undefined) run.cats[r.target].atk += 2;
    else if (r.kind === "collar" && r.target !== undefined) {
      const c = run.cats[r.target];
      c.maxHp += 10;
      c.hp += 10;
    }
  }
  run.rewards = [];
  if ((RECRUIT_FLOORS as readonly number[]).includes(run.floor)) {
    const options = ALL_CATS.filter((k) => !run.cats.some((c) => c.kind === k));
    if (options.length) {
      run.recruit = pick(run, options);
      run.phase = "recruit";
      return run;
    }
  }
  return nextFloor(run);
}

/** Recruits the offered cat into `slot` (replacing that cat), or skips when slot is null. */
export function answerRecruit(run: Run, slot: number | null): Run {
  if (run.phase !== "recruit") return run;
  if (slot !== null && run.recruit && run.cats[slot]) {
    const old = run.cats[slot];
    const fresh = makeCat(run, run.recruit, regionOf(run.floor));
    // Keep the replaced cat's earned growth so a swap never feels like a loss.
    fresh.maxHp += Math.max(0, old.maxHp - CAT_DEFS[old.kind as CatKind].hp - regionOf(run.startFloor) * REGION_HP_BONUS);
    fresh.hp = fresh.maxHp;
    run.cats[slot] = fresh;
  }
  run.recruit = null;
  return nextFloor(run);
}

function nextFloor(run: Run): Run {
  run.floor++;
  run.enemies = enemiesForFloor(run, run.floor);
  run.round = 1;
  run.halfDamage = false;
  run.cats.forEach((c) => { c.taunt = 0; c.vanish = false; c.cd = Math.max(0, c.cd - 1); });
  run.actor = firstLivingCat(run, 0);
  if (run.actor < 0) {
    run.phase = "lost";
    return run;
  }
  run.phase = "battle";
  return run;
}

/** Floors fully cleared in this run (for stage progress), as 0-based stage indexes. */
export function clearedFloorIndexes(run: Run): number[] {
  const last = run.phase === "won" ? run.floor : run.phase === "battle" || run.phase === "lost" ? run.floor - 1 : run.floor;
  const out: number[] = [];
  for (let f = run.startFloor; f <= last; f++) out.push(f - 1);
  return out;
}

export function runScore(run: Run): number {
  return clearedFloorIndexes(run).length ? Math.max(...clearedFloorIndexes(run)) + 1 : 0;
}

/** A simple autopilot used by tests and as a balance check. */
export function autoAction(run: Run): Action {
  const cat = run.cats[run.actor];
  const weakest = run.enemies.reduce((b, e, i) => (alive(e) && (b < 0 || e.hp < run.enemies[b].hp) ? i : b), -1);
  const hurt = run.cats.filter((c) => alive(c) && c.hp < c.maxHp * 0.6).length;
  if (cat.cd === 0) {
    const k = cat.kind as CatKind;
    if (k === "kneader" && hurt >= 1) return { kind: "skill" };
    if (k === "chonk" || k === "boxer" || k === "shadow") return { kind: "skill" };
    if (k === "static" && run.enemies.filter(alive).length >= 2) return { kind: "skill" };
    if (k === "hunter") return { kind: "skill", target: weakest };
  }
  return { kind: "attack", target: weakest };
}

export function autoReward(run: Run): number {
  const low = run.cats.some((c) => alive(c) && c.hp < c.maxHp * 0.5);
  const order: RewardKind[] = run.cats.some((c) => !alive(c)) ? ["revive", "nap", "treat"] : low ? ["nap", "treat", "collar", "bell"] : ["toy", "collar", "bell", "nap", "treat"];
  for (const k of order) {
    const i = run.rewards.findIndex((r) => r.kind === k);
    if (i >= 0) return i;
  }
  return 0;
}
