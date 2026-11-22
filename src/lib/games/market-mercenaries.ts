/**
 * 장터 용병단 (Market Mercenaries) — an OIYO original auto-battler.
 * Buy mercenaries at the market stall, merge three copies into a stronger one,
 * place them on a 2×4 field and watch them fight 20 rounds of rival bands.
 * Four guilds (blades, guards, archers, herbalists) give bonuses for 2 or 4 members.
 */
import { mulberry32 } from "./daily";

export const MERC_SLUG = "market-mercenaries";
export const ROUND_COUNT = 20;
export const START_HEARTS = 5;
export const SHOP_SIZE = 5;
export const BENCH_SIZE = 4;
export const FIELD_SIZE = 8; // 0-3 front row, 4-7 back row
export const REROLL_COST = 1;
export const BATTLE_LIMIT = 40; // seconds; a band still standing on both sides is a loss

export type Guild = "blade" | "guard" | "archer" | "herb";
export type UnitId =
  | "stick" | "sword" | "twin"
  | "lid" | "gate" | "ox"
  | "sling" | "bow" | "xbow"
  | "granny" | "doctor" | "sage"
  | "boss";

export interface UnitDef {
  id: UnitId;
  guild: Guild | null;
  tier: 1 | 2 | 3;
  hp: number;
  atk: number;
  interval: number; // seconds between actions
  ranged: boolean;
  heal: number; // healers restore this instead of attacking when an ally is hurt
}

export const UNITS: Record<UnitId, UnitDef> = {
  stick: { id: "stick", guild: "blade", tier: 1, hp: 60, atk: 9, interval: 1.0, ranged: false, heal: 0 },
  sword: { id: "sword", guild: "blade", tier: 2, hp: 85, atk: 14, interval: 1.0, ranged: false, heal: 0 },
  twin: { id: "twin", guild: "blade", tier: 3, hp: 110, atk: 14, interval: 0.6, ranged: false, heal: 0 },
  lid: { id: "lid", guild: "guard", tier: 1, hp: 115, atk: 5, interval: 1.2, ranged: false, heal: 0 },
  gate: { id: "gate", guild: "guard", tier: 2, hp: 170, atk: 7, interval: 1.2, ranged: false, heal: 0 },
  ox: { id: "ox", guild: "guard", tier: 3, hp: 250, atk: 11, interval: 1.3, ranged: false, heal: 0 },
  sling: { id: "sling", guild: "archer", tier: 1, hp: 45, atk: 8, interval: 1.1, ranged: true, heal: 0 },
  bow: { id: "bow", guild: "archer", tier: 2, hp: 55, atk: 13, interval: 1.1, ranged: true, heal: 0 },
  xbow: { id: "xbow", guild: "archer", tier: 3, hp: 70, atk: 24, interval: 1.5, ranged: true, heal: 0 },
  granny: { id: "granny", guild: "herb", tier: 1, hp: 55, atk: 3, interval: 1.5, ranged: true, heal: 11 },
  doctor: { id: "doctor", guild: "herb", tier: 2, hp: 70, atk: 4, interval: 1.4, ranged: true, heal: 17 },
  sage: { id: "sage", guild: "herb", tier: 3, hp: 90, atk: 5, interval: 1.2, ranged: true, heal: 24 },
  boss: { id: "boss", guild: null, tier: 3, hp: 700, atk: 26, interval: 1.4, ranged: false, heal: 0 },
};

export const MARKET_IDS: readonly UnitId[] = ["stick", "sword", "twin", "lid", "gate", "ox", "sling", "bow", "xbow", "granny", "doctor", "sage"];
export const GUILDS: readonly Guild[] = ["blade", "guard", "archer", "herb"];

export interface Merc {
  uid: number;
  id: UnitId;
  star: 1 | 2 | 3;
}

export interface RunState {
  round: number; // 0-based round about to be fought
  hearts: number;
  gold: number;
  shop: Array<UnitId | null>;
  bench: Array<Merc | null>;
  field: Array<Merc | null>;
  wins: number;
  seed: number;
  rolls: number; // shop rolls so far (drives the shop rng)
  nextUid: number;
  status: "shop" | "won" | "lost";
}

const STAR_MULT = [0, 1, 1.8, 3.2];

export function fieldCap(round: number): number {
  return Math.min(FIELD_SIZE, 3 + Math.floor(round / 3));
}

export function income(round: number): number {
  return 5 + Math.min(3, Math.floor(round / 4));
}

/** Shop odds by round: early tier-1, later more tier-2/3. */
export function tierOdds(round: number): [number, number, number] {
  const t3 = Math.min(0.35, Math.max(0, (round - 3) * 0.035));
  const t2 = Math.min(0.45, 0.15 + round * 0.03);
  return [1 - t2 - t3, t2, t3];
}

export function rollShop(round: number, seed: number, rolls: number): UnitId[] {
  const rng = mulberry32(seed * 977 + rolls * 131 + 7);
  const odds = tierOdds(round);
  const out: UnitId[] = [];
  for (let i = 0; i < SHOP_SIZE; i++) {
    const r = rng();
    const tier = r < odds[0] ? 1 : r < odds[0] + odds[1] ? 2 : 3;
    const pool = MARKET_IDS.filter((id) => UNITS[id].tier === tier);
    out.push(pool[Math.floor(rng() * pool.length)]);
  }
  return out;
}

export function newRun(seed = 1): RunState {
  return {
    round: 0, hearts: START_HEARTS, gold: income(0), shop: rollShop(0, seed, 0), bench: Array(BENCH_SIZE).fill(null),
    field: Array(FIELD_SIZE).fill(null), wins: 0, seed, rolls: 1, nextUid: 1, status: "shop",
  };
}

function clone(s: RunState): RunState {
  return { ...s, shop: s.shop.slice(), bench: s.bench.map((m) => (m ? { ...m } : null)), field: s.field.map((m) => (m ? { ...m } : null)) };
}

export function costOf(id: UnitId): number {
  return UNITS[id].tier;
}

export function sellValue(m: Merc): number {
  return UNITS[m.id].tier * (m.star === 1 ? 1 : m.star === 2 ? 3 : 9) - (m.star > 1 ? 1 : 0);
}

export function fieldCount(s: RunState): number {
  return s.field.filter(Boolean).length;
}

/** Merge three of the same unit and star into one of the next star, repeatedly. Field copies are kept where possible. */
function mergeAll(s: RunState): number[] {
  const merged: number[] = [];
  for (let again = true; again;) {
    again = false;
    for (const id of MARKET_IDS) {
      for (const star of [1, 2] as const) {
        const spots: Array<{ where: "field" | "bench"; i: number }> = [];
        s.field.forEach((m, i) => { if (m && m.id === id && m.star === star) spots.push({ where: "field", i }); });
        s.bench.forEach((m, i) => { if (m && m.id === id && m.star === star) spots.push({ where: "bench", i }); });
        if (spots.length < 3) continue;
        const [keep, ...rest] = spots.slice(0, 3);
        const target = keep.where === "field" ? s.field : s.bench;
        const m = target[keep.i]!;
        m.star = (star + 1) as 2 | 3;
        for (const r of rest) (r.where === "field" ? s.field : s.bench)[r.i] = null;
        merged.push(m.uid);
        again = true;
      }
    }
  }
  return merged;
}

/** Buy shop slot i: onto the field while it has room, else the bench (merging copies straight away). Returns the same state if not possible. */
export function buy(s: RunState, i: number): RunState {
  const id = s.shop[i];
  if (s.status !== "shop" || !id || s.gold < costOf(id)) return s;
  const n = clone(s);
  n.gold -= costOf(id);
  n.shop[i] = null;
  const m: Merc = { uid: n.nextUid++, id, star: 1 };
  // straight onto the field while there is room: melee in front, ranged behind
  if (fieldCount(n) < fieldCap(n.round) && !n.field.some((x) => x && x.id === id && x.star === 1) && !n.bench.some((x) => x && x.id === id && x.star === 1)) {
    const order = UNITS[id].ranged ? [5, 6, 4, 7, 1, 2, 0, 3] : [1, 2, 0, 3, 5, 6, 4, 7];
    const spot = order.find((k) => !n.field[k]);
    if (spot !== undefined) { n.field[spot] = m; return n; }
  }
  const free = n.bench.indexOf(null);
  if (free >= 0) {
    n.bench[free] = m;
    mergeAll(n);
    return n;
  }
  // bench full: only allowed if it completes a merge
  const same = [...n.field, ...n.bench].filter((x) => x && x.id === id && x.star === 1).length;
  if (same < 2) return s;
  n.bench.push(m);
  mergeAll(n);
  n.bench = n.bench.filter((x, k) => k < BENCH_SIZE || x);
  while (n.bench.length > BENCH_SIZE) {
    const gap = n.bench.indexOf(null);
    if (gap < 0) return s;
    n.bench[gap] = n.bench.pop()!;
  }
  return n;
}

export function reroll(s: RunState): RunState {
  if (s.status !== "shop" || s.gold < REROLL_COST) return s;
  const n = clone(s);
  n.gold -= REROLL_COST;
  n.shop = rollShop(n.round, n.seed, n.rolls);
  n.rolls += 1;
  return n;
}

export type Slot = { where: "field" | "bench"; i: number };

/** Move or swap a mercenary between two slots, respecting the field cap. */
export function place(s: RunState, from: Slot, to: Slot): RunState {
  if (s.status !== "shop") return s;
  if (from.where === to.where && from.i === to.i) return s;
  const n = clone(s);
  const a = from.where === "field" ? n.field : n.bench;
  const b = to.where === "field" ? n.field : n.bench;
  const ma = a[from.i];
  if (!ma) return s;
  const mb = b[to.i];
  if (from.where === "bench" && to.where === "field" && !mb && fieldCount(s) >= fieldCap(s.round)) return s;
  a[from.i] = mb;
  b[to.i] = ma;
  return n;
}

export function sell(s: RunState, slot: Slot): RunState {
  const arr = slot.where === "field" ? s.field : s.bench;
  const m = arr[slot.i];
  if (s.status !== "shop" || !m) return s;
  const n = clone(s);
  (slot.where === "field" ? n.field : n.bench)[slot.i] = null;
  n.gold += sellValue(m);
  return n;
}

/* ---------------------------- guild bonuses ---------------------------- */

export function guildCounts(units: ReadonlyArray<Merc | null>): Record<Guild, number> {
  const seen = new Set<string>();
  const c: Record<Guild, number> = { blade: 0, guard: 0, archer: 0, herb: 0 };
  for (const m of units) {
    if (!m || seen.has(m.id)) continue; // distinct unit kinds count, like most auto-battlers
    seen.add(m.id);
    const g = UNITS[m.id].guild;
    if (g) c[g] += 1;
  }
  return c;
}

/** Bonus level 0/1/2 for each guild (2 and 3 distinct kinds; herbalists 2 and 3). */
export function guildLevel(count: number): 0 | 1 | 2 {
  return count >= 3 ? 2 : count >= 2 ? 1 : 0;
}

/* ------------------------------- battle -------------------------------- */

export interface Fighter {
  side: 0 | 1;
  slot: number;
  id: UnitId;
  star: number;
  hp: number;
  maxHp: number;
  atk: number;
  armor: number;
  interval: number;
  heal: number;
  ranged: boolean;
  cd: number;
  regen: number;
  flash: number; // seconds left of the hit flash, for drawing
  acted: number; // seconds since the last action, for drawing
  target: number; // index of the last target
}

export interface Battle {
  fighters: Fighter[];
  time: number;
  winner: 0 | 1 | null; // 0 = player
}

function makeFighter(m: Merc, side: 0 | 1, slot: number, counts: Record<Guild, number>): Fighter {
  const d = UNITS[m.id];
  const mult = STAR_MULT[m.star];
  let atk = d.atk * mult;
  let interval = d.interval;
  let heal = d.heal * mult;
  let armor = 0;
  let regen = 0;
  const lv = (g: Guild) => guildLevel(counts[g]);
  if (d.guild === "blade") atk *= [1, 1.25, 1.55][lv("blade")];
  if (d.guild === "guard") armor = [0, 3, 7][lv("guard")] * (m.star === 3 ? 1.5 : 1);
  if (d.guild === "archer") interval /= [1, 1.3, 1.65][lv("archer")];
  if (d.guild === "herb") heal *= [1, 1.4, 1.8][lv("herb")];
  if (lv("herb") >= 2) regen = 1.5;
  if (lv("guard") >= 1 && d.guild !== "guard") armor += 1;
  const hp = d.hp * mult;
  return { side, slot, id: m.id, star: m.star, hp, maxHp: hp, atk, armor, interval, heal, ranged: d.ranged, cd: interval * (0.45 + (slot % 4) * 0.06 + (slot >= 4 ? 0.1 : 0)), regen, flash: 0, acted: 9, target: -1 };
}

export function startBattle(player: ReadonlyArray<Merc | null>, enemy: ReadonlyArray<Merc | null>): Battle {
  const fighters: Fighter[] = [];
  const pc = guildCounts(player);
  const ec = guildCounts(enemy);
  player.forEach((m, i) => { if (m) fighters.push(makeFighter(m, 0, i, pc)); });
  enemy.forEach((m, i) => { if (m) fighters.push(makeFighter(m, 1, i, ec)); });
  const b: Battle = { fighters, time: 0, winner: null };
  b.winner = decide(b);
  return b;
}

function alive(f: Fighter): boolean {
  return f.hp > 0;
}

function decide(b: Battle): 0 | 1 | null {
  const p = b.fighters.some((f) => f.side === 0 && alive(f));
  const e = b.fighters.some((f) => f.side === 1 && alive(f));
  if (!e && p) return 0;
  if (!p) return 1;
  if (b.time >= BATTLE_LIMIT) return 1;
  return null;
}

function pickTarget(b: Battle, me: Fighter): number {
  let best = -1;
  let bestV = Infinity;
  b.fighters.forEach((f, i) => {
    if (f.side === me.side || !alive(f)) return;
    // melee hits the front row first, nearest column; ranged picks the weakest
    const v = me.ranged ? f.hp : (f.slot >= 4 ? 100 : 0) + Math.abs((f.slot % 4) - (me.slot % 4)) * 10 + f.slot * 0.01;
    if (v < bestV) { bestV = v; best = i; }
  });
  return best;
}

function pickPatient(b: Battle, me: Fighter): number {
  let best = -1;
  let bestV = 0.9; // only heal allies below 90%
  b.fighters.forEach((f, i) => {
    if (f.side !== me.side || !alive(f)) return;
    const v = f.hp / f.maxHp;
    if (v < bestV) { bestV = v; best = i; }
  });
  return best;
}

export interface BattleEvent { kind: "hit" | "heal" | "down"; from: number; to: number; amount: number }

/** Advance the fight by dt seconds (call with small steps, e.g. 1/30). */
export function stepBattle(b: Battle, dt: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (b.winner !== null) return events;
  b.time += dt;
  b.fighters.forEach((me, idx) => {
    me.flash = Math.max(0, me.flash - dt);
    me.acted += dt;
    if (!alive(me)) return;
    if (me.regen) me.hp = Math.min(me.maxHp, me.hp + me.regen * dt);
    me.cd -= dt;
    if (me.cd > 0) return;
    me.cd += me.interval;
    if (me.heal > 0) {
      const p = pickPatient(b, me);
      if (p >= 0) {
        const f = b.fighters[p];
        const amount = Math.min(f.maxHp - f.hp, me.heal);
        f.hp += amount;
        me.acted = 0;
        me.target = p;
        events.push({ kind: "heal", from: idx, to: p, amount });
        return;
      }
    }
    const t = pickTarget(b, me);
    if (t < 0) return;
    const f = b.fighters[t];
    const amount = Math.max(1, me.atk - f.armor);
    f.hp -= amount;
    f.flash = 0.18;
    me.acted = 0;
    me.target = t;
    events.push({ kind: "hit", from: idx, to: t, amount });
    if (f.hp <= 0) { f.hp = 0; events.push({ kind: "down", from: idx, to: t, amount: 0 }); }
  });
  b.winner = decide(b);
  return events;
}

/** Runs a fight to the end; returns the winner (0 = player). */
export function simulate(player: ReadonlyArray<Merc | null>, enemy: ReadonlyArray<Merc | null>): { winner: 0 | 1; battle: Battle } {
  const b = startBattle(player, enemy);
  while (b.winner === null) stepBattle(b, 1 / 20);
  return { winner: b.winner, battle: b };
}

/* ------------------------------ rival bands ----------------------------- */

/** Rival budget per round, tuned so the test autopilot clears all 20 rounds about a third of the time. */
const BAND_BASE = 4;
const BAND_SLOPE = 2.8;
const BAND_LATE = 2;

export function isBossRound(round: number): boolean {
  return round === 9 || round === 19;
}

/** The rival band for a round: a point budget spent on mercenaries, tanks in front, shooters behind. */
export function enemyBand(round: number): Array<Merc | null> {
  const r = Math.max(0, Math.min(ROUND_COUNT - 1, round));
  const rng = mulberry32(r * 7907 + 3);
  const field: Array<Merc | null> = Array(FIELD_SIZE).fill(null);
  let uid = 1000;
  if (isBossRound(r)) {
    field[1] = { uid: uid++, id: "boss", star: r >= 19 ? 2 : 1 };
  }
  const slots = Math.min(FIELD_SIZE - (isBossRound(r) ? 1 : 0), 2 + Math.floor(r / 2.5));
  let budget = BAND_BASE + r * BAND_SLOPE + (r >= 10 ? (r - 9) * BAND_LATE : 0) - (isBossRound(r) ? 5 + r * 0.6 : 0) - (r < 2 ? 2 - r : 0); // the first two rounds stay gentle
  const picks: Merc[] = [];
  for (let k = 0; k < slots && budget >= 1; k++) {
    const share = budget / (slots - k);
    // a unit's value is tier × star weight (3 copies per star)
    let star: 1 | 2 | 3 = 1;
    let tier = Math.max(1, Math.min(3, Math.round(share * (0.6 + rng() * 0.5))));
    if (share >= 7 && r >= 8) { star = 2; tier = Math.max(1, Math.min(3, Math.round(share / 3))); }
    if (share >= 16 && r >= 16) { star = 3; tier = Math.max(1, Math.min(3, Math.round(share / 9))); }
    const pool = MARKET_IDS.filter((id) => UNITS[id].tier === tier);
    const id = pool[Math.floor(rng() * pool.length)];
    budget -= tier * (star === 1 ? 1 : star === 2 ? 3 : 9);
    picks.push({ uid: uid++, id, star });
  }
  const front = picks.filter((m) => !UNITS[m.id].ranged).concat(picks.filter((m) => UNITS[m.id].ranged));
  for (const m of front) {
    const melee = !UNITS[m.id].ranged;
    const order = melee ? [1, 2, 0, 3, 5, 6, 4, 7] : [5, 6, 4, 7, 1, 2, 0, 3];
    const spot = order.find((i) => !field[i]);
    if (spot !== undefined) field[spot] = m;
  }
  return field;
}

/** Fight this round's band, then pay income and restock the shop. */
export function fight(s: RunState): { state: RunState; won: boolean; battle: Battle } {
  const { winner, battle } = simulate(s.field, enemyBand(s.round));
  return { state: afterFight(s, winner === 0), won: winner === 0, battle };
}

export function afterFight(s: RunState, won: boolean): RunState {
  if (s.status !== "shop") return s;
  const n = clone(s);
  if (won) n.wins += 1;
  else n.hearts -= isBossRound(n.round) ? 2 : 1;
  if (n.hearts <= 0) { n.hearts = 0; n.status = "lost"; return n; }
  if (n.round >= ROUND_COUNT - 1) { n.status = "won"; return n; }
  n.round += 1;
  n.gold += income(n.round) + (won ? 1 : 0);
  n.shop = rollShop(n.round, n.seed, n.rolls);
  n.rolls += 1;
  return n;
}

export function runScore(s: RunState): number {
  return s.wins * 100 + (s.status === "won" ? s.hearts * 80 + 500 : 0);
}

/* -------------------------------- autopilot ------------------------------- */

/** A simple sensible player: buys copies and strong units, keeps tanks in front. Used in tests. */
export function autoShop(start: RunState): RunState {
  let s = start;
  for (let guard = 0; guard < 40; guard++) {
    const owned = [...s.field, ...s.bench].filter(Boolean) as Merc[];
    let best = -1;
    let bestV = 0;
    s.shop.forEach((id, i) => {
      if (!id || costOf(id) > s.gold) return;
      const copies = owned.filter((m) => m.id === id && m.star === 1).length;
      const v = UNITS[id].tier * 2 + copies * 3 + (owned.some((m) => UNITS[m.id].guild === UNITS[id].guild) ? 1 : 0);
      if (v > bestV) { bestV = v; best = i; }
    });
    if (best >= 0) {
      const n = buy(s, best);
      if (n !== s) { s = n; continue; }
      // bench full: sell the weakest bench unit and try again
      let weak = -1;
      let wv = Infinity;
      s.bench.forEach((m, i) => { if (m && UNITS[m.id].tier * m.star < wv) { wv = UNITS[m.id].tier * m.star; weak = i; } });
      if (weak >= 0 && wv < UNITS[s.shop[best]!].tier * 2) { s = sell(s, { where: "bench", i: weak }); continue; }
    }
    if (s.gold >= 3 && s.round >= 2) { s = reroll(s); continue; }
    break;
  }
  return arrange(s);
}

/** Put the strongest units on the field: melee in front, ranged behind. */
export function arrange(start: RunState): RunState {
  const n = clone(start);
  const all = [...n.field, ...n.bench].filter(Boolean) as Merc[];
  const power = (m: Merc) => UNITS[m.id].tier * STAR_MULT[m.star];
  all.sort((a, b) => power(b) - power(a));
  const cap = fieldCap(n.round);
  const onField = all.slice(0, cap);
  const rest = all.slice(cap);
  n.field = Array(FIELD_SIZE).fill(null);
  const melee = onField.filter((m) => !UNITS[m.id].ranged).sort((a, b) => UNITS[b.id].hp * STAR_MULT[b.star] - UNITS[a.id].hp * STAR_MULT[a.star]);
  const ranged = onField.filter((m) => UNITS[m.id].ranged);
  const frontOrder = [1, 2, 0, 3];
  const backOrder = [5, 6, 4, 7];
  for (const m of melee) {
    const spot = frontOrder.find((i) => !n.field[i]) ?? backOrder.find((i) => !n.field[i]);
    if (spot !== undefined) n.field[spot] = m;
  }
  for (const m of ranged) {
    const spot = backOrder.find((i) => !n.field[i]) ?? frontOrder.find((i) => !n.field[i]);
    if (spot !== undefined) n.field[spot] = m;
  }
  n.bench = Array(BENCH_SIZE).fill(null);
  rest.slice(0, BENCH_SIZE).forEach((m, i) => { n.bench[i] = m; });
  return n;
}

export function autoRun(seed: number): RunState {
  let s = newRun(seed);
  while (s.status === "shop") s = fight(autoShop(s)).state;
  return s;
}
