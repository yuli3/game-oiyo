/**
 * Toy Box Brawl (장난감 상자 대전) — an OIYO original auto-battler (2026-11-24).
 *
 * A shop shelf offers toys at different prices. Spend your coins on up to five of them, put them in a line, and press
 * Fight: the battle then plays itself. The two front toys hit each other at the same time until one falls, and the next
 * one steps up. Some toys do things on their own — a catapult lobs a stone at the enemy's last toy when the battle
 * starts, a drummer gives every friend +1 attack, a wind-up robot hands its strength to the toy behind when it falls,
 * a knight's shield blocks the first hit, a roly-poly doll stands back up once. Pick and order the line to beat the
 * enemy's box. Stars come from how many of your toys are still standing, against the most any line can keep.
 *
 * Pure and deterministic: every shop and every enemy line is seeded per stage.
 */

export const TOY_SLUG = "toy-box-brawl";
export const STAGE_COUNT = 30;
export const MAX_LINE = 5;

export type Kind = "soldier" | "teddy" | "catapult" | "robot" | "drum" | "knight" | "rocket" | "doll";
export const KINDS: Kind[] = ["soldier", "teddy", "catapult", "robot", "drum", "knight", "rocket", "doll"];

export interface ToySpec { atk: number; hp: number; cost: number }
export const SPECS: Record<Kind, ToySpec> = {
  soldier: { atk: 3, hp: 3, cost: 2 },
  teddy: { atk: 1, hp: 7, cost: 3 },
  catapult: { atk: 1, hp: 3, cost: 3 }, // start: 3 damage to the enemy's last toy
  robot: { atk: 2, hp: 4, cost: 3 }, // falls: the toy behind gets +2/+2
  drum: { atk: 1, hp: 3, cost: 2 }, // start: every friend +1 attack
  knight: { atk: 4, hp: 2, cost: 3 }, // shield blocks the first hit
  rocket: { atk: 6, hp: 1, cost: 3 },
  doll: { atk: 2, hp: 2, cost: 2 }, // falls: stands back up once with 1 hp
};

export interface Toy { kind: Kind; atk: number; hp: number }
export interface ToyStage {
  stage: number;
  shop: Kind[]; // the offers on the shelf
  coins: number;
  enemy: Toy[]; // front first
  best: number; // the most toys any line keeps standing
}

export const toy = (kind: Kind, bonus = 0): Toy => ({ kind, atk: SPECS[kind].atk + bonus, hp: SPECS[kind].hp + bonus });

interface Fighter extends Toy { shield: boolean; revived: boolean }

const prep = (line: Toy[]): Fighter[] => line.map((t) => ({ ...t, shield: t.kind === "knight", revived: false }));

/** One step of the battle for the log the games replay. */
export interface BattleEvent { kind: "lob" | "drum" | "hit" | "fall" | "pass" | "rise"; side: 0 | 1; index: number; amount: number }
export interface BattleResult { won: boolean; left: number; enemyLeft: number; events: BattleEvent[]; rounds: number }

function damage(f: Fighter, n: number): void {
  if (n <= 0) return;
  if (f.shield) {
    f.shield = false;
    return;
  }
  f.hp -= n;
}

/** Plays the battle out. The player's line is side 0, the enemy's side 1; both are front first. */
export function battle(mine: Toy[], theirs: Toy[]): BattleResult {
  const sides: [Fighter[], Fighter[]] = [prep(mine), prep(theirs)];
  const events: BattleEvent[] = [];
  // battle-start abilities: drums first (they buff), then catapults
  for (const s of [0, 1] as const)
    sides[s].forEach((f, i) => {
      if (f.kind !== "drum") return;
      for (const g of sides[s]) g.atk += 1;
      events.push({ kind: "drum", side: s, index: i, amount: 1 });
    });
  for (const s of [0, 1] as const)
    sides[s].forEach((f, i) => {
      if (f.kind !== "catapult") return;
      const other = sides[1 - s];
      if (!other.length) return;
      const target = other[other.length - 1];
      damage(target, 3);
      events.push({ kind: "lob", side: s, index: i, amount: 3 });
    });
  const sweep = () => {
    for (const s of [0, 1] as const) {
      const line = sides[s];
      for (let i = 0; i < line.length; i++) {
        const f = line[i];
        if (f.hp > 0) continue;
        if (f.kind === "doll" && !f.revived) {
          f.revived = true;
          f.hp = 1;
          events.push({ kind: "rise", side: s, index: i, amount: 1 });
          continue;
        }
        events.push({ kind: "fall", side: s, index: i, amount: 0 });
        if (f.kind === "robot" && i + 1 < line.length) {
          line[i + 1].atk += 2;
          line[i + 1].hp += 2;
          events.push({ kind: "pass", side: s, index: i + 1, amount: 2 });
        }
        line.splice(i, 1);
        i--;
      }
    }
  };
  sweep();
  let rounds = 0;
  while (sides[0].length && sides[1].length && rounds < 200) {
    rounds++;
    const a = sides[0][0];
    const b = sides[1][0];
    const da = a.atk;
    const db = b.atk;
    damage(b, da);
    damage(a, db);
    events.push({ kind: "hit", side: 0, index: 0, amount: da }, { kind: "hit", side: 1, index: 0, amount: db });
    sweep();
  }
  const won = sides[0].length > 0 && sides[1].length === 0;
  return { won, left: sides[0].length, enemyLeft: sides[1].length, events, rounds };
}

export const costOf = (line: Kind[]) => line.reduce((s, k) => s + SPECS[k].cost, 0);

/** Every affordable line: a set of shop offers (each offer bought at most once) in every order. */
export function lines(st: Pick<ToyStage, "shop" | "coins">, maxCount = MAX_LINE): Kind[][] {
  const out: Kind[][] = [];
  const n = st.shop.length;
  const picks: number[] = [];
  const perms = (xs: Kind[]): Kind[][] => {
    if (xs.length <= 1) return [xs];
    const res: Kind[][] = [];
    const seen = new Set<string>();
    xs.forEach((x, i) => {
      for (const rest of perms([...xs.slice(0, i), ...xs.slice(i + 1)])) {
        const p = [x, ...rest];
        const key = p.join(",");
        if (!seen.has(key)) {
          seen.add(key);
          res.push(p);
        }
      }
    });
    return res;
  };
  const go = (from: number, spent: number) => {
    if (picks.length) for (const p of perms(picks.map((i) => st.shop[i]))) out.push(p);
    if (picks.length >= maxCount) return;
    for (let i = from; i < n; i++) {
      const c = SPECS[st.shop[i]].cost;
      if (spent + c > st.coins) continue;
      picks.push(i);
      go(i + 1, spent + c);
      picks.pop();
    }
  };
  go(0, 0);
  // the same kinds in the same order from different offers are one line
  const uniq = new Map<string, Kind[]>();
  for (const l of out) uniq.set(l.join(","), l);
  return [...uniq.values()];
}

export function bestKept(st: Pick<ToyStage, "shop" | "coins" | "enemy">): number {
  let best = 0;
  for (const l of lines(st)) {
    const r = battle(l.map((k) => toy(k)), st.enemy);
    if (r.won) best = Math.max(best, r.left);
  }
  return best;
}

export function starsFor(st: ToyStage, r: BattleResult): number {
  if (!r.won) return 0;
  if (r.left >= st.best) return 3;
  if (r.left >= st.best - 1) return 2;
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

export interface CoachOpts {
  /** how many lines the player tries before giving up (they can rearrange and fight again) */
  tries?: number;
  /** how much the player's sense of a toy's worth wobbles */
  noise?: number;
  seed?: number;
  /** "think" buys good value and orders tanks in front, tricks behind; "random" buys and orders at random */
  mode?: "think" | "random";
}

/** What a human might feel a toy is worth on this shelf. */
function worth(k: Kind): number {
  const s = SPECS[k];
  const base = s.atk + s.hp;
  const extra: Record<Kind, number> = { soldier: 0, teddy: 0, catapult: 3, robot: 3, drum: 3, knight: 3, rocket: 0, doll: 2 };
  return (base + extra[k]) / s.cost;
}

/** Where a human would put a toy: walls in front, tricks at the back. Lower goes nearer the front. */
const PLACE: Record<Kind, number> = { teddy: 0, knight: 1, doll: 2, soldier: 3, robot: 3, rocket: 4, catapult: 6, drum: 6 };

export interface CoachResult { won: boolean; tries: number; line: Kind[]; result: BattleResult | null }

export function pilot(st: ToyStage, opts: CoachOpts = {}): CoachResult {
  const { tries = 3, noise = 0.2, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 7451 + 3);
  let last: CoachResult = { won: false, tries: 0, line: [], result: null };
  for (let t = 1; t <= tries; t++) {
    let line: Kind[];
    if (mode === "random") {
      const order = shuffle(st.shop.map((_, i) => i), rng);
      line = [];
      let spent = 0;
      for (const i of order) {
        const c = SPECS[st.shop[i]].cost;
        if (line.length < MAX_LINE && spent + c <= st.coins && rng() < 0.7) {
          line.push(st.shop[i]);
          spent += c;
        }
      }
      line = shuffle(line, rng);
    } else {
      // buy by felt value per coin, then order walls first; later tries wobble more
      const felt = st.shop.map((k, i) => ({ k, i, v: worth(k) * (1 + (rng() - 0.5) * 2 * noise * t) }));
      felt.sort((a, b) => b.v - a.v);
      line = [];
      let spent = 0;
      for (const f of felt) {
        const c = SPECS[f.k].cost;
        if (line.length < MAX_LINE && spent + c <= st.coins) {
          line.push(f.k);
          spent += c;
        }
      }
      line = line
        .map((k) => ({ k, p: PLACE[k] + (rng() - 0.5) * 2 * noise * (t + 1) * 2 }))
        .sort((a, b) => a.p - b.p)
        .map((x) => x.k);
    }
    const result = battle(line.map((k) => toy(k)), st.enemy);
    last = { won: result.won, tries: t, line, result };
    if (result.won) return last;
  }
  return last;
}

function shape(stage: number) {
  return {
    enemies: Math.min(5, 2 + Math.floor(stage / 6)),
    bonus: Math.floor(stage / 9),
    coins: 8 + Math.floor(stage / 3),
    shop: 6 + Math.min(2, Math.floor(stage / 10)),
  };
}

/** Human-like coaches used to check a stage: they buy what looks good, put walls in front, and retry up to three lines. */
export const HUMAN_COACHES: CoachOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ tries: 3, noise: 0.2, seed }));

function layout(stage: number, attempt: number): ToyStage {
  const sh = shape(stage);
  const rng = mulberry(291000 + stage * 191 + attempt * 7919);
  const shop = Array.from({ length: sh.shop }, () => KINDS[Math.floor(rng() * KINDS.length)]);
  const enemy = Array.from({ length: sh.enemies }, () => toy(KINDS[Math.floor(rng() * KINDS.length)], sh.bonus + (rng() < (stage % 9) / 12 ? 1 : 0)));
  return { stage, shop, coins: sh.coins, enemy, best: 0 };
}

/** Lays shelves and enemy boxes out until the enemy can be beaten, human-like coaches beat it, and random lines don't. */
export function buildStage(stage: number): ToyStage {
  for (let attempt = 0; attempt < 3000; attempt++) {
    const st = layout(stage, attempt);
    // cheap checks first: human-like coaches win, random lines lose
    if (HUMAN_COACHES.filter((o) => pilot(st, o).won).length < 5) continue;
    if ([1, 2, 3].filter((seed) => pilot(st, { mode: "random", tries: 1, seed }).won).length > 0) continue;
    const all = lines(st);
    let wins = 0;
    let best = 0;
    for (const l of all) {
      const r = battle(l.map((k) => toy(k)), st.enemy);
      if (r.won) {
        wins++;
        best = Math.max(best, r.left);
      }
    }
    // only a small share of the possible lines win, so the order and the buys matter
    if (wins / all.length > 0.3 - Math.min(0.2, stage * 0.008)) continue;
    st.best = best;
    return st;
  }
  throw new Error(`toy-box-brawl stage ${stage + 1}: no fair box`);
}

export const TOY_STAGES: ToyStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
