/* ────────────────────────────────────────────────────────────────────────────
 * Hanyang Timeslip — rules with no renderer attached (2026-11-16).
 *
 * Three ways to play share one hero:
 *   - Town: tile-by-tile walking around 1426 Hanyang, talking to people.
 *   - Fields: side-view platforming and sword fights against "time stains".
 *   - The gate: checking travellers' 호패 against the day's rules.
 *
 * Determinism (L2): all randomness comes from a mulberry32 state stored in the
 * game itself, and time comes in as `dt`. No Math.random, no Date.now here.
 * The canvas only reads these states; it never decides anything.
 * ────────────────────────────────────────────────────────────────────────── */

import {
  BOAT,
  BOSS,
  BOTTLE_SIGHT,
  DAILY_SIZE,
  DRONE,
  COMBAT,
  DEFEAT_COIN_LOSS,
  FIELD_MAPS,
  HUNTER_KILLS,
  QUESTS,
  FIELD_START,
  HEART_HEAL,
  HERO_BASE,
  INN_COST,
  LEVEL_UP,
  MAX_LEVEL,
  MOBS,
  MODERN_ITEMS,
  NPCS,
  PERIOD_ITEMS,
  PHYSICS,
  PROVINCES,
  RIVER_BOATS,
  RIVER_CHARM_HP,
  RIVER_REPEAT_COINS,
  RULES_BY_SHIFT,
  SHIFT_PASS,
  SHIFT_REWARD,
  SHIFT_SIZE,
  SWORD_BONUS,
  SWORD_COST,
  TILE,
  TOWN_MAP,
  TOWN_RETURN,
  TOWN_START,
  TOWN_WALKABLE,
  TOWN_WALK_SPEED,
  TRAVELER_LOOKS,
  TRAVELER_NAMES,
  VIOLATION_CHANCE,
  expToNext,
  type AchievementId,
  type FieldId,
  type HuntKind,
  type ItemId,
  type MobKind,
  type NpcId,
  type ProvinceId,
  type QuestId,
  type RuleId,
  type SealId,
} from "./hanyang-timeslip-config";

// ─── Random ──────────────────────────────────────────────────────────────────

export interface RngHolder {
  rng: number;
}

/** mulberry32: advances holder.rng and returns [0, 1). */
export function nextRandom(holder: RngHolder): number {
  holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randInt(holder: RngHolder, lo: number, hi: number): number {
  return lo + Math.floor(nextRandom(holder) * (hi - lo + 1));
}

function pick<T>(holder: RngHolder, list: readonly T[]): T {
  return list[Math.floor(nextRandom(holder) * list.length)];
}

// ─── Hero & progress ─────────────────────────────────────────────────────────

export interface Hero {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  sword: number;
  coins: number;
  kills: number;
  faints: number;
}

export interface Progress {
  forest: boolean;
  /** Han river cleared once (물결 부적 owned). Optional field: not a shard. */
  river: boolean;
  gate: boolean;
  rift: boolean;
  shifts: number;
  bestShift: number;
  /** Total correct calls at the gate, for the ending screen. */
  gateCorrect: number;
  gateTotal: number;
  /** Kills per ordinary monster kind (errands count from these). */
  hunts: Record<HuntKind, number>;
  /** Gate shifts finished with every call right. */
  perfects: number;
  /** Errand state: 0 not taken, 1 taken (counting from base), 2 handed in. */
  quests: Record<QuestId, { s: 0 | 1 | 2; base: number }>;
}

function freshQuests(): Progress["quests"] {
  return { phones: { s: 0, base: 0 }, drones: { s: 0, base: 0 }, perfect: { s: 0, base: 0 } };
}

export interface Game extends RngHolder {
  hero: Hero;
  progress: Progress;
  /** Milliseconds of play, for the ending screen. */
  playMs: number;
}

export function createGame(seed: number): Game {
  return {
    rng: seed >>> 0,
    hero: { level: 1, exp: 0, hp: HERO_BASE.maxHp, maxHp: HERO_BASE.maxHp, sword: 0, coins: 0, kills: 0, faints: 0 },
    progress: {
      forest: false,
      river: false,
      gate: false,
      rift: false,
      shifts: 0,
      bestShift: 0,
      gateCorrect: 0,
      gateTotal: 0,
      hunts: { phone: 0, bottle: 0, drone: 0 },
      perfects: 0,
      quests: freshQuests(),
    },
    playMs: 0,
  };
}

export function heroAttack(hero: Hero): number {
  return HERO_BASE.atk + (hero.level - 1) * LEVEL_UP.atk + SWORD_BONUS[Math.min(hero.sword, SWORD_BONUS.length - 1)];
}

export function shardCount(progress: Progress): number {
  return Number(progress.forest) + Number(progress.gate) + Number(progress.rift);
}

/** The ferry runs once the forest is cleared, so the river is the second step. */
export function dockOpen(progress: Progress): boolean {
  return progress.forest;
}

/** The rift opens once the forest and the gate have each given up a shard. */
export function riftOpen(progress: Progress): boolean {
  return progress.forest && progress.gate;
}

/** Adds experience and returns the levels gained (each one fully heals). */
export function gainExp(hero: Hero, amount: number): number[] {
  const gained: number[] = [];
  hero.exp += amount;
  while (hero.level < MAX_LEVEL && hero.exp >= expToNext(hero.level)) {
    hero.exp -= expToNext(hero.level);
    hero.level += 1;
    hero.maxHp += LEVEL_UP.hp;
    hero.hp = hero.maxHp;
    gained.push(hero.level);
  }
  if (hero.level >= MAX_LEVEL) hero.exp = 0;
  return gained;
}

export type ShopResult = "ok" | "poor" | "maxed" | "full";

export function restAtInn(hero: Hero): ShopResult {
  if (hero.hp >= hero.maxHp) return "full";
  // Nobody is turned away hungry: a broke traveller still gets a bowl and a mat.
  const cost = Math.min(INN_COST, hero.coins);
  hero.coins -= cost;
  hero.hp = hero.maxHp;
  return "ok";
}

export function swordPrice(hero: Hero): number | null {
  return hero.sword < SWORD_COST.length ? SWORD_COST[hero.sword] : null;
}

export function upgradeSword(hero: Hero): ShopResult {
  const price = swordPrice(hero);
  if (price === null) return "maxed";
  if (hero.coins < price) return "poor";
  hero.coins -= price;
  hero.sword += 1;
  return "ok";
}

/** Fainting in a field: lose a fifth of the purse, wake at the inn fully healed. */
export function faint(hero: Hero): number {
  const lost = Math.floor(hero.coins * DEFEAT_COIN_LOSS);
  hero.coins -= lost;
  hero.hp = hero.maxHp;
  hero.faints += 1;
  return lost;
}

// ─── Town ────────────────────────────────────────────────────────────────────

export type Dir = "up" | "down" | "left" | "right";
const DELTA: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export interface TownState {
  tx: number;
  ty: number;
  dir: Dir;
  /** Walking progress toward (tx, ty) from (fromX, fromY), 0..1; null when standing. */
  move: { fromX: number; fromY: number; t: number } | null;
  steps: number;
}

export function createTown(at: { tx: number; ty: number } = TOWN_START, dir: Dir = "up"): TownState {
  return { tx: at.tx, ty: at.ty, dir, move: null, steps: 0 };
}

export function townTile(tx: number, ty: number): string {
  return TOWN_MAP[ty]?.[tx] ?? "#";
}

export function npcAt(tx: number, ty: number): NpcId | null {
  return NPCS.find((n) => n.tx === tx && n.ty === ty)?.id ?? null;
}

export function canWalk(tx: number, ty: number, progress: Progress): boolean {
  const tile = townTile(tx, ty);
  if (!TOWN_WALKABLE.has(tile)) return false;
  if (tile === "X" && !riftOpen(progress)) return false;
  if (tile === "N" && !dockOpen(progress)) return false;
  return npcAt(tx, ty) === null;
}

/** Pixel position of the hero's top-left corner, interpolated while walking. */
export function townPixel(town: TownState): { x: number; y: number } {
  if (!town.move) return { x: town.tx * TILE, y: town.ty * TILE };
  const t = town.move.t;
  return {
    x: (town.move.fromX + (town.tx - town.move.fromX) * t) * TILE,
    y: (town.move.fromY + (town.ty - town.move.fromY) * t) * TILE,
  };
}

export type TownEvent = { type: "enter"; field: FieldId } | { type: "step" } | { type: "bump" };

/** Advances walking. `held` is the direction currently pressed, if any. */
export function stepTown(town: TownState, held: Dir | null, dt: number, progress: Progress): TownEvent[] {
  const events: TownEvent[] = [];
  if (town.move) {
    town.move.t += dt * TOWN_WALK_SPEED;
    if (town.move.t < 1) return events;
    town.move = null;
    town.steps += 1;
    events.push({ type: "step" });
    const tile = townTile(town.tx, town.ty);
    if (tile === "S") events.push({ type: "enter", field: "forest" });
    if (tile === "X" && riftOpen(progress)) events.push({ type: "enter", field: "rift" });
    if (tile === "N" && dockOpen(progress)) events.push({ type: "enter", field: "river" });
    if (events.length > 1) return events;
  }
  if (!held) return events;
  const turned = town.dir !== held;
  town.dir = held;
  const nx = town.tx + DELTA[held].x;
  const ny = town.ty + DELTA[held].y;
  if (canWalk(nx, ny, progress)) {
    town.move = { fromX: town.tx, fromY: town.ty, t: 0 };
    town.tx = nx;
    town.ty = ny;
  } else if (!turned) {
    events.push({ type: "bump" });
  }
  return events;
}

export type Interaction = { kind: "npc"; id: NpcId } | { kind: "rift-closed" } | { kind: "dock-closed" } | { kind: "jangseung" } | { kind: "water" } | { kind: "gate" } | null;

/** What the hero would talk to or examine by pressing A. */
export function interact(town: TownState): Interaction {
  if (town.move) return null;
  const fx = town.tx + DELTA[town.dir].x;
  const fy = town.ty + DELTA[town.dir].y;
  const npc = npcAt(fx, fy);
  if (npc) return { kind: "npc", id: npc };
  const tile = townTile(fx, fy);
  if (tile === "X") return { kind: "rift-closed" };
  if (tile === "N") return { kind: "dock-closed" };
  if (tile === "J") return { kind: "jangseung" };
  if (tile === "~") return { kind: "water" };
  if (tile === "G") return { kind: "gate" };
  return null;
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
}

export interface FieldHero extends Body {
  face: 1 | -1;
  /** Seconds since the current swing started; -1 when not swinging. */
  attackT: number;
  invulnT: number;
  coyoteT: number;
  bufferT: number;
  hitIds: number[];
  safeX: number;
  safeY: number;
  runT: number;
  /** Index of the ferry the hero stands on, or -1. */
  boat: number;
}

export interface Mob extends Body {
  id: number;
  kind: MobKind;
  hp: number;
  maxHp: number;
  dir: 1 | -1;
  flashT: number;
  t: number;
  homeY: number;
  homeX: number;
  /** Drone state: 0 patrol, 1 dive, 2 climb. */
  mode: number;
  jumpT: number;
  throwT: number;
  dead: boolean;
}

export interface Pickup {
  id: number;
  kind: "coin" | "heart";
  x: number;
  y: number;
  taken: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  alive: boolean;
}

export interface Boat {
  x: number;
  y: number;
  w: number;
  minX: number;
  maxX: number;
  vx: number;
  pauseT: number;
}

export interface FieldState {
  id: FieldId;
  cols: number;
  rows: number;
  /** Collision letters only: '#', 'r', '=' or '.'. */
  grid: string[];
  goal: { x: number; y: number } | null;
  hero: FieldHero;
  mobs: Mob[];
  pickups: Pickup[];
  projectiles: Projectile[];
  boats: Boat[];
  time: number;
  nextId: number;
  summoned: boolean;
  done: boolean;
}

export interface FieldInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
}

export type FieldEvent =
  | { type: "swing" }
  | { type: "jump" }
  | { type: "land" }
  | { type: "hit"; x: number; y: number; dmg: number; crit: boolean; kind: MobKind }
  | { type: "kill"; x: number; y: number; kind: MobKind; exp: number; coins: number }
  | { type: "levelup"; level: number }
  | { type: "hurt"; dmg: number }
  | { type: "pickup"; kind: "coin" | "heart"; x: number; y: number }
  | { type: "fell" }
  | { type: "throw"; x: number; y: number }
  | { type: "summon" }
  | { type: "goal"; field: FieldId; first: boolean }
  | { type: "boss-dead"; x: number; y: number }
  | { type: "defeat" };

function newMob(field: FieldState, kind: MobKind, x: number, y: number): Mob {
  const stats = MOBS[kind];
  return {
    id: field.nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    w: stats.w,
    h: stats.h,
    onGround: false,
    hp: stats.hp,
    maxHp: stats.hp,
    dir: -1,
    flashT: 0,
    t: (x * 0.37) % 6.28,
    homeY: y,
    homeX: x,
    mode: 0,
    jumpT: kind === "drone" ? 0 : BOSS.jumpEvery,
    throwT: BOSS.throwEvery,
    dead: false,
  };
}

export function createField(id: FieldId): FieldState {
  const map = FIELD_MAPS[id];
  const rows = map.length;
  const cols = map[0].length;
  const start = FIELD_START[id];
  const field: FieldState = {
    id,
    cols,
    rows,
    grid: [],
    goal: null,
    hero: {
      x: start.x,
      y: start.y + TILE - PHYSICS.heroH,
      vx: 0,
      vy: 0,
      w: PHYSICS.heroW,
      h: PHYSICS.heroH,
      onGround: false,
      face: 1,
      attackT: -1,
      invulnT: 0,
      coyoteT: 0,
      bufferT: 0,
      hitIds: [],
      safeX: start.x,
      safeY: start.y + TILE - PHYSICS.heroH,
      runT: 0,
      boat: -1,
    },
    mobs: [],
    pickups: [],
    projectiles: [],
    boats: [],
    time: 0,
    nextId: 1,
    summoned: false,
    done: false,
  };
  map.forEach((row, ty) => {
    let line = "";
    for (let tx = 0; tx < row.length; tx++) {
      const ch = row[tx];
      const px = tx * TILE;
      const py = ty * TILE;
      if (ch === "p") field.mobs.push(newMob(field, "phone", px + 3, py + TILE - MOBS.phone.h));
      else if (ch === "b") field.mobs.push(newMob(field, "bottle", px + 3, py + 1));
      else if (ch === "d") field.mobs.push(newMob(field, "drone", px + 2, py + 3));
      else if (ch === "K") field.mobs.push(newMob(field, "boss", px - 6, py + TILE - MOBS.boss.h));
      else if (ch === "c") field.pickups.push({ id: field.nextId++, kind: "coin", x: px + 4, y: py + 4, taken: false });
      else if (ch === "h") field.pickups.push({ id: field.nextId++, kind: "heart", x: px + 4, y: py + 4, taken: false });
      else if (ch === "J") field.goal = { x: px, y: py };
      line += ch === "#" || ch === "r" || ch === "=" || ch === "w" ? ch : ".";
    }
    field.grid.push(line);
  });
  if (id === "river") {
    for (const b of RIVER_BOATS) {
      const minX = b.from * TILE;
      const maxX = b.to * TILE - BOAT.w;
      field.boats.push({ x: minX, y: (rows - 2) * TILE, w: BOAT.w, minX, maxX, vx: BOAT.speed, pauseT: BOAT.pause });
    }
  }
  return field;
}

export function fieldTile(field: FieldState, tx: number, ty: number): string {
  if (tx < 0 || tx >= field.cols) return "r";
  if (ty < 0 || ty >= field.rows) return ".";
  return field.grid[ty][tx];
}

/** Something you can stand on: ground, rock or a one-way platform (not water). */
function standable(t: string): boolean {
  return t === "#" || t === "r" || t === "=";
}

function isSolid(field: FieldState, tx: number, ty: number): boolean {
  const t = fieldTile(field, tx, ty);
  return t === "#" || t === "r";
}

/** Moves a body through the tile grid: x first, then y. Returns true if it hit a wall. */
export function moveBody(field: FieldState, body: Body, dt: number): boolean {
  let hitWall = false;
  body.x += body.vx * dt;
  const top = Math.floor(body.y / TILE);
  const bottom = Math.floor((body.y + body.h - 0.01) / TILE);
  if (body.vx > 0) {
    const tx = Math.floor((body.x + body.w) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (isSolid(field, tx, ty)) {
        body.x = tx * TILE - body.w - 0.001;
        body.vx = 0;
        hitWall = true;
        break;
      }
    }
  } else if (body.vx < 0) {
    const tx = Math.floor(body.x / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (isSolid(field, tx, ty)) {
        body.x = (tx + 1) * TILE + 0.001;
        body.vx = 0;
        hitWall = true;
        break;
      }
    }
  }
  const prevBottom = body.y + body.h;
  body.y += body.vy * dt;
  body.onGround = false;
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.w - 0.01) / TILE);
  if (body.vy >= 0) {
    const ty = Math.floor((body.y + body.h) / TILE);
    for (let tx = left; tx <= right; tx++) {
      const t = fieldTile(field, tx, ty);
      const platform = t === "=" && prevBottom <= ty * TILE + 0.5;
      if (t === "#" || t === "r" || platform) {
        body.y = ty * TILE - body.h;
        body.vy = 0;
        body.onGround = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(body.y / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (isSolid(field, tx, ty)) {
        body.y = (ty + 1) * TILE;
        body.vy = 0;
        break;
      }
    }
  }
  return hitWall;
}

export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** The sword's reach while a swing is active, or null. */
export function swordBox(hero: FieldHero): { x: number; y: number; w: number; h: number } | null {
  if (hero.attackT < COMBAT.activeFrom || hero.attackT > COMBAT.activeTo) return null;
  const x = hero.face > 0 ? hero.x + hero.w - 2 : hero.x - COMBAT.reachX + 2;
  return { x, y: hero.y - 1, w: COMBAT.reachX, h: COMBAT.reachH };
}

function hurtHero(game: Game, field: FieldState, dmg: number, fromX: number, events: FieldEvent[]): void {
  const hero = field.hero;
  if (hero.invulnT > 0 || field.done) return;
  game.hero.hp = Math.max(0, game.hero.hp - dmg);
  hero.invulnT = COMBAT.invuln;
  const away = hero.x + hero.w / 2 < fromX ? -1 : 1;
  hero.vx = away * COMBAT.knockX;
  hero.vy = -COMBAT.knockY;
  hero.attackT = -1;
  events.push({ type: "hurt", dmg });
  if (game.hero.hp <= 0) {
    field.done = true;
    events.push({ type: "defeat" });
  }
}

function damageMob(game: Game, field: FieldState, mob: Mob, events: FieldEvent[]): void {
  const base = heroAttack(game.hero);
  const spread = COMBAT.spreadLow + nextRandom(game) * (COMBAT.spreadHigh - COMBAT.spreadLow);
  const crit = nextRandom(game) < COMBAT.critChance;
  const dmg = Math.max(1, Math.round(base * spread * (crit ? COMBAT.critMultiplier : 1)));
  mob.hp -= dmg;
  mob.flashT = 0.15;
  const cx = mob.x + mob.w / 2;
  events.push({ type: "hit", x: cx, y: mob.y, dmg, crit, kind: mob.kind });
  if (mob.kind !== "boss") {
    mob.vx = field.hero.face * COMBAT.mobKnock;
    if (mob.kind === "phone") mob.vy = -90;
  }
  if (mob.hp > 0) return;
  mob.dead = true;
  const stats = MOBS[mob.kind];
  const coins = randInt(game, stats.coins[0], stats.coins[1]);
  game.hero.coins += coins;
  game.hero.kills += 1;
  if (mob.kind !== "boss") game.progress.hunts[mob.kind] += 1;
  events.push({ type: "kill", x: cx, y: mob.y, kind: mob.kind, exp: stats.exp, coins });
  for (const level of gainExp(game.hero, stats.exp)) events.push({ type: "levelup", level });
  if (mob.kind === "boss") {
    field.done = true;
    game.progress.rift = true;
    for (const other of field.mobs) other.dead = true;
    events.push({ type: "boss-dead", x: cx, y: mob.y });
  }
}

function stepMob(game: Game, field: FieldState, mob: Mob, dt: number, events: FieldEvent[]): void {
  const hero = field.hero;
  const stats = MOBS[mob.kind];
  mob.t += dt;
  mob.flashT = Math.max(0, mob.flashT - dt);
  const heroCx = hero.x + hero.w / 2;
  const heroCy = hero.y + hero.h / 2;
  const cx = mob.x + mob.w / 2;
  if (mob.kind === "phone") {
    // Knockback decays into the patrol walk.
    const walk = mob.dir * stats.speed;
    mob.vx += (walk - mob.vx) * Math.min(1, dt * 6);
    mob.vy = Math.min(PHYSICS.maxFall, mob.vy + PHYSICS.gravity * dt);
    const wall = moveBody(field, mob, dt);
    if (mob.onGround) {
      const aheadX = mob.dir > 0 ? mob.x + mob.w + 1 : mob.x - 1;
      const below = fieldTile(field, Math.floor(aheadX / TILE), Math.floor((mob.y + mob.h + 2) / TILE));
      if (wall || !standable(below)) mob.dir = mob.dir > 0 ? -1 : 1;
    }
    if (mob.y > field.rows * TILE) mob.dead = true;
  } else if (mob.kind === "bottle") {
    const dx = heroCx - cx;
    const dy = heroCy - (mob.homeY + mob.h / 2);
    const near = Math.abs(dx) < BOTTLE_SIGHT && Math.abs(dy) < BOTTLE_SIGHT;
    const target = near ? Math.sign(dx) * stats.speed : Math.sin(mob.t * 0.8) * stats.speed * 0.5;
    mob.vx += (target - mob.vx) * Math.min(1, dt * 3);
    if (near) mob.homeY += Math.sign(dy) * Math.min(Math.abs(dy), stats.speed * 0.5 * dt);
    mob.dir = mob.vx >= 0 ? 1 : -1;
    mob.x += mob.vx * dt;
    mob.y = mob.homeY + Math.sin(mob.t * 2.4) * 5;
  } else if (mob.kind === "drone") {
    mob.jumpT = Math.max(0, mob.jumpT - dt);
    if (mob.mode === 0) {
      if (Math.abs(mob.x - mob.homeX) > 40) mob.dir = mob.x > mob.homeX ? -1 : 1;
      mob.vx += (mob.dir * DRONE.patrol - mob.vx) * Math.min(1, dt * 4);
      mob.x += mob.vx * dt;
      mob.y = mob.homeY + Math.sin(mob.t * 3) * 2;
      if (mob.jumpT <= 0 && Math.abs(heroCx - cx) < DRONE.sight && heroCy > mob.y + mob.h) {
        mob.mode = 1;
        mob.vx = 0;
        mob.vy = DRONE.diveSpeed;
      }
    } else if (mob.mode === 1) {
      // Dives straight through one-way platforms; only real ground stops it.
      mob.vx = 0;
      mob.y += DRONE.diveSpeed * dt;
      const below = fieldTile(field, Math.floor(cx / TILE), Math.floor((mob.y + mob.h) / TILE));
      if (below === "#" || below === "r" || mob.y > mob.homeY + DRONE.dive) mob.mode = 2;
    } else {
      mob.vx *= Math.max(0, 1 - dt * 6);
      mob.x += mob.vx * dt;
      mob.y -= DRONE.climbSpeed * dt;
      if (mob.y <= mob.homeY) {
        mob.y = mob.homeY;
        mob.mode = 0;
        mob.jumpT = DRONE.rest;
      }
    }
  } else {
    const enraged = mob.hp <= mob.maxHp * BOSS.enrageAt;
    const speed = stats.speed * (enraged ? BOSS.enrageSpeed : 1);
    mob.dir = heroCx < cx ? -1 : 1;
    const target = Math.abs(heroCx - cx) > 10 ? mob.dir * speed : 0;
    mob.vx += (target - mob.vx) * Math.min(1, dt * 4);
    mob.vy = Math.min(PHYSICS.maxFall, mob.vy + PHYSICS.gravity * dt);
    moveBody(field, mob, dt);
    mob.jumpT -= dt;
    mob.throwT -= dt;
    if (mob.jumpT <= 0 && mob.onGround) {
      mob.vy = -BOSS.jumpVelocity;
      mob.jumpT = BOSS.jumpEvery * (enraged ? 0.75 : 1);
    }
    if (mob.throwT <= 0) {
      mob.throwT = BOSS.throwEvery * (enraged ? 0.7 : 1);
      field.projectiles.push({ x: cx - 6, y: mob.y + 10, vx: mob.dir * BOSS.gearSpeed, alive: true });
      events.push({ type: "throw", x: cx, y: mob.y + 10 });
    }
    if (enraged && !field.summoned) {
      field.summoned = true;
      for (let i = 0; i < BOSS.summonCount; i++) {
        const sx = TILE * (3 + i * (field.cols - 7));
        field.mobs.push(newMob(field, "phone", sx, TILE * 2));
      }
      events.push({ type: "summon" });
    }
  }
  if (!mob.dead && overlaps(hero, mob)) hurtHero(game, field, stats.atk, cx, events);
}

/** One fixed step of a field. Mutates `field` and `game.hero`. */
export function stepField(game: Game, field: FieldState, input: FieldInput, dt: number): FieldEvent[] {
  const events: FieldEvent[] = [];
  if (field.done) return events;
  field.time += dt;
  const hero = field.hero;
  hero.invulnT = Math.max(0, hero.invulnT - dt);

  // Horizontal intent; knockback wins while invulnerable and airborne.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0 && hero.attackT < 0) hero.face = dir > 0 ? 1 : -1;
  const slowed = hero.attackT >= 0 && hero.onGround ? 0.35 : 1;
  const want = dir * PHYSICS.runSpeed * slowed;
  const control = hero.invulnT > COMBAT.invuln - 0.25 ? 0.05 : 1;
  hero.vx += (want - hero.vx) * Math.min(1, dt * 14 * control);
  hero.runT = dir !== 0 && hero.onGround ? hero.runT + dt : 0;

  // Jump with coyote time and an input buffer (input generosity).
  hero.coyoteT = hero.onGround ? PHYSICS.coyote : Math.max(0, hero.coyoteT - dt);
  hero.bufferT = input.jumpPressed ? PHYSICS.jumpBuffer : Math.max(0, hero.bufferT - dt);
  if (hero.bufferT > 0 && hero.coyoteT > 0) {
    hero.vy = -PHYSICS.jumpVelocity;
    hero.bufferT = 0;
    hero.coyoteT = 0;
    events.push({ type: "jump" });
  }
  if (!input.jumpHeld && hero.vy < -110) hero.vy = -110;
  hero.vy = Math.min(PHYSICS.maxFall, hero.vy + PHYSICS.gravity * dt);
  const wasGround = hero.onGround;
  // Ferries move first and carry whoever stands on them.
  field.boats.forEach((b, i) => {
    let dx = 0;
    if (b.pauseT > 0) b.pauseT = Math.max(0, b.pauseT - dt);
    else {
      const nx = Math.max(b.minX, Math.min(b.maxX, b.x + b.vx * dt));
      dx = nx - b.x;
      b.x = nx;
      if (b.x <= b.minX || b.x >= b.maxX) {
        b.vx = -b.vx;
        b.pauseT = BOAT.pause;
      }
    }
    if (hero.boat === i) hero.x += dx;
  });
  const prevBottom = hero.y + hero.h;
  moveBody(field, hero, dt);
  hero.boat = -1;
  if (hero.vy >= 0) {
    field.boats.forEach((b, i) => {
      const bottom = hero.y + hero.h;
      if (prevBottom <= b.y + 0.5 && bottom >= b.y && hero.x + hero.w > b.x + 2 && hero.x < b.x + b.w - 2) {
        hero.y = b.y - hero.h;
        hero.vy = 0;
        hero.onGround = true;
        hero.boat = i;
      }
    });
  }
  if (hero.onGround && !wasGround) events.push({ type: "land" });
  if (hero.onGround && hero.boat < 0) {
    // Remember solid footing to come back to after a fall.
    const under = fieldTile(field, Math.floor((hero.x + hero.w / 2) / TILE), Math.floor((hero.y + hero.h + 1) / TILE));
    // Platforms are skipped: respawning on a ledge above water would drop you straight back in.
    if (under === "#" || under === "r") {
      hero.safeX = hero.x;
      hero.safeY = hero.y;
    }
  }
  if (hero.y > field.rows * TILE + 8) {
    events.push({ type: "fell" });
    hero.x = hero.safeX;
    hero.y = hero.safeY;
    hero.vx = 0;
    hero.vy = 0;
    hero.invulnT = 0;
    hero.boat = -1;
    hurtHero(game, field, COMBAT.fallDamage, hero.x, events);
    hero.vx = 0;
    hero.vy = 0;
    if (field.done) return events;
  }

  // Sword.
  if (input.attackPressed && hero.attackT < 0) {
    hero.attackT = 0;
    hero.hitIds = [];
    events.push({ type: "swing" });
  } else if (hero.attackT >= 0) {
    hero.attackT += dt;
    if (hero.attackT > COMBAT.attackTime) hero.attackT = -1;
  }
  const box = swordBox(hero);
  if (box) {
    for (const mob of field.mobs) {
      if (mob.dead || hero.hitIds.includes(mob.id)) continue;
      if (!overlaps(box, mob)) continue;
      hero.hitIds.push(mob.id);
      damageMob(game, field, mob, events);
      if (field.done) return events;
    }
  }

  for (const mob of field.mobs) if (!mob.dead) stepMob(game, field, mob, dt, events);
  if (field.done) return events;
  field.mobs = field.mobs.filter((m) => !m.dead);

  for (const p of field.projectiles) {
    if (!p.alive) continue;
    p.x += p.vx * dt;
    const gear = { x: p.x + 3, y: p.y + 3, w: 10, h: 10 };
    if (isSolid(field, Math.floor((p.x + 8) / TILE), Math.floor((p.y + 8) / TILE))) p.alive = false;
    else if (overlaps(hero, gear)) {
      p.alive = false;
      hurtHero(game, field, BOSS.gearDamage, p.x + 8, events);
    }
  }
  field.projectiles = field.projectiles.filter((p) => p.alive);
  if (field.done) return events;

  for (const item of field.pickups) {
    if (item.taken || !overlaps(hero, { x: item.x, y: item.y, w: 8, h: 8 })) continue;
    item.taken = true;
    if (item.kind === "coin") game.hero.coins += 3;
    else game.hero.hp = Math.min(game.hero.maxHp, game.hero.hp + HEART_HEAL);
    events.push({ type: "pickup", kind: item.kind, x: item.x + 4, y: item.y + 4 });
  }

  if (field.goal && overlaps(hero, { x: field.goal.x + 2, y: field.goal.y, w: 12, h: TILE })) {
    field.done = true;
    let first = false;
    if (field.id === "river") {
      first = !game.progress.river;
      if (first) {
        game.progress.river = true;
        game.hero.maxHp += RIVER_CHARM_HP;
        game.hero.hp = game.hero.maxHp;
      } else game.hero.coins += RIVER_REPEAT_COINS;
    } else {
      first = !game.progress.forest;
      game.progress.forest = true;
    }
    events.push({ type: "goal", field: field.id, first });
  }
  return events;
}

// ─── Gate inspection ─────────────────────────────────────────────────────────

export interface Traveler {
  name: number;
  origin: ProvinceId;
  seal: SealId;
  /** How the person at the window looks (sprite variant). */
  look: number;
  /** The face drawn on their 호패. */
  portrait: number;
  items: ItemId[];
  /** The rule this traveller breaks, or null if they may pass. */
  violation: RuleId | null;
}

export interface Shift {
  index: number;
  rules: readonly RuleId[];
  banned: ProvinceId | null;
  travelers: Traveler[];
}

export function rulesFor(shiftIndex: number): readonly RuleId[] {
  return RULES_BY_SHIFT[Math.min(shiftIndex, RULES_BY_SHIFT.length - 1)];
}

/** FNV-1a over a day key such as "2026-11-16": everyone gets the same daily line. */
export function dailySeed(dayKey: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Today's gate: every rule switched on, a longer line, same for every player. */
export function generateDailyShift(dayKey: string): Shift {
  return generateShift(dailySeed(dayKey), RULES_BY_SHIFT.length - 1, DAILY_SIZE);
}

export function generateShift(seed: number, shiftIndex: number, size: number = SHIFT_SIZE): Shift {
  const rng: RngHolder = { rng: (seed ^ Math.imul(shiftIndex + 1, 0x9e3779b1)) >>> 0 };
  const rules = rulesFor(shiftIndex);
  const banned = rules.includes("origin") ? pick(rng, PROVINCES) : null;
  const travelers: Traveler[] = [];
  const names = TRAVELER_NAMES.map((_, i) => i);
  for (let i = 0; i < size; i++) {
    if (names.length === 0) names.push(...TRAVELER_NAMES.map((_, n) => n));
    const nameIdx = names.splice(Math.floor(nextRandom(rng) * names.length), 1)[0];
    const look = randInt(rng, 0, TRAVELER_LOOKS - 1);
    const allowed = PROVINCES.filter((p) => p !== banned);
    const t: Traveler = {
      name: nameIdx,
      origin: pick(rng, allowed),
      seal: "sejong",
      look,
      portrait: look,
      items: [pick(rng, PERIOD_ITEMS), pick(rng, PERIOD_ITEMS)],
      violation: null,
    };
    // The first traveller of the first shift is always honest: a gentle start.
    const breaks = !(shiftIndex === 0 && i === 0) && nextRandom(rng) < VIOLATION_CHANCE;
    if (breaks) {
      const rule = pick(rng, rules);
      t.violation = rule;
      if (rule === "seal") t.seal = nextRandom(rng) < 0.5 ? "future" : "goryeo";
      else if (rule === "items") t.items[randInt(rng, 0, 1)] = pick(rng, MODERN_ITEMS);
      else if (rule === "face") t.portrait = (look + randInt(rng, 1, TRAVELER_LOOKS - 1)) % TRAVELER_LOOKS;
      else if (rule === "origin" && banned) t.origin = banned;
    }
    travelers.push(t);
  }
  return { index: shiftIndex, rules, banned, travelers };
}

/** Recomputes the verdict from what is visible, so the data can never disagree with the rules. */
export function violationOf(t: Traveler, shift: Shift): RuleId | null {
  if (shift.rules.includes("seal") && t.seal !== "sejong") return "seal";
  if (shift.rules.includes("items") && t.items.some((i) => MODERN_ITEMS.includes(i))) return "items";
  if (shift.rules.includes("face") && t.portrait !== t.look) return "face";
  if (shift.rules.includes("origin") && shift.banned && t.origin === shift.banned) return "origin";
  return null;
}

export function isCorrectCall(t: Traveler, shift: Shift, approve: boolean): boolean {
  return approve === (violationOf(t, shift) === null);
}

export interface ShiftResult {
  correct: number;
  coins: number;
  earnedShard: boolean;
  perfect: boolean;
}

/** Applies a finished shift to the game: pay, shard, counters. */
export function settleShift(game: Game, correctCalls: number): ShiftResult {
  const perfect = correctCalls === SHIFT_SIZE;
  const coins = correctCalls * SHIFT_REWARD.correct + (perfect ? SHIFT_REWARD.perfect : 0);
  game.hero.coins += coins;
  game.progress.shifts += 1;
  game.progress.bestShift = Math.max(game.progress.bestShift, correctCalls);
  game.progress.gateCorrect += correctCalls;
  game.progress.gateTotal += SHIFT_SIZE;
  if (perfect) game.progress.perfects += 1;
  const earnedShard = !game.progress.gate && correctCalls >= SHIFT_PASS;
  if (earnedShard) game.progress.gate = true;
  return { correct: correctCalls, coins, earnedShard, perfect };
}

// ─── Errands ─────────────────────────────────────────────────────────────────

export function questDef(id: QuestId) {
  const def = QUESTS.find((q) => q.id === id);
  if (!def) throw new Error(`unknown quest ${id}`);
  return def;
}

function questMetric(game: Game, id: QuestId): number {
  const m = questDef(id).metric;
  return m === "perfect" ? game.progress.perfects : game.progress.hunts[m];
}

/** The errand a townsperson can offer right now, if any (the smith waits for the river). */
export function questFor(game: Game, giver: NpcId): QuestId | null {
  const def = QUESTS.find((q) => q.giver === giver);
  if (!def) return null;
  if (def.id === "drones" && !dockOpen(game.progress)) return null;
  return game.progress.quests[def.id].s === 2 ? null : def.id;
}

export function questCount(game: Game, id: QuestId): number {
  const q = game.progress.quests[id];
  if (q.s === 2) return questDef(id).need;
  if (q.s === 0) return 0;
  return Math.min(questDef(id).need, Math.max(0, questMetric(game, id) - q.base));
}

export function questReady(game: Game, id: QuestId): boolean {
  return game.progress.quests[id].s === 1 && questCount(game, id) >= questDef(id).need;
}

export function acceptQuest(game: Game, id: QuestId): boolean {
  const q = game.progress.quests[id];
  if (q.s !== 0) return false;
  game.progress.quests[id] = { s: 1, base: questMetric(game, id) };
  return true;
}

/** Hands an errand in: pays coins and experience, returns levels gained or null if not ready. */
export function turnInQuest(game: Game, id: QuestId): number[] | null {
  if (!questReady(game, id)) return null;
  const { reward } = questDef(id);
  game.progress.quests[id] = { s: 2, base: game.progress.quests[id].base };
  game.hero.coins += reward.coins;
  return gainExp(game.hero, reward.exp);
}

// ─── Achievements ────────────────────────────────────────────────────────────

/** Every achievement the game state already earns (the daily one is granted by the UI). */
export function earnedAchievements(game: Game): AchievementId[] {
  const p = game.progress;
  const h = game.hero;
  const out: AchievementId[] = [];
  if (h.kills >= 1) out.push("firstHunt");
  if (h.kills >= HUNTER_KILLS) out.push("hunter");
  if (h.level >= 10) out.push("level10");
  if (h.sword >= SWORD_COST.length) out.push("masterSword");
  if (p.river) out.push("riverCharm");
  if (p.perfects >= 1) out.push("sharpEye");
  if (QUESTS.every((q) => p.quests[q.id].s === 2)) out.push("errands");
  if (p.rift) out.push("home");
  if (p.rift && h.faints === 0) out.push("untouched");
  return out;
}

// ─── Save ────────────────────────────────────────────────────────────────────

export interface SaveData {
  v: 1;
  rng: number;
  hero: Hero;
  progress: Progress;
  playMs: number;
}

export function toSave(game: Game): SaveData {
  const p = game.progress;
  return { v: 1, rng: game.rng, hero: { ...game.hero }, progress: { ...p, hunts: { ...p.hunts }, quests: JSON.parse(JSON.stringify(p.quests)) }, playMs: game.playMs };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

function readQuests(raw: unknown): Progress["quests"] {
  const out = freshQuests();
  if (!raw || typeof raw !== "object") return out;
  for (const id of Object.keys(out) as QuestId[]) {
    const q = (raw as Record<string, { s?: unknown; base?: unknown }>)[id];
    if (q && (q.s === 0 || q.s === 1 || q.s === 2) && isNum(q.base)) out[id] = { s: q.s, base: q.base };
  }
  return out;
}

/** Returns a game from saved JSON, or null if the data is missing or malformed. */
export function fromSave(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.v !== 1 || !isNum(data.rng) || !isNum(data.playMs) || !data.hero || !data.progress) return null;
    const h = data.hero;
    const p = data.progress;
    const heroKeys: (keyof Hero)[] = ["level", "exp", "hp", "maxHp", "sword", "coins", "kills", "faints"];
    const progKeys: (keyof Progress)[] = ["shifts", "bestShift", "gateCorrect", "gateTotal"];
    if (!heroKeys.every((k) => isNum(h[k]))) return null;
    if (!progKeys.every((k) => isNum(p[k]))) return null;
    if (h.level < 1 || h.level > MAX_LEVEL || h.sword > SWORD_COST.length) return null;
    return {
      rng: data.rng >>> 0,
      hero: { ...h, hp: Math.max(1, Math.min(h.hp, h.maxHp)) },
      progress: {
        ...p,
        forest: p.forest === true,
        river: p.river === true,
        gate: p.gate === true,
        rift: p.rift === true,
        hunts: {
          phone: isNum(p.hunts?.phone) ? p.hunts.phone : 0,
          bottle: isNum(p.hunts?.bottle) ? p.hunts.bottle : 0,
          drone: isNum(p.hunts?.drone) ? p.hunts.drone : 0,
        },
        perfects: isNum(p.perfects) ? p.perfects : 0,
        quests: readQuests(p.quests),
      },
      playMs: data.playMs,
    };
  } catch {
    return null;
  }
}

export { TOWN_RETURN };
