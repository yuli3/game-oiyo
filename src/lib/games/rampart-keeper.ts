/**
 * Rampart Keeper (성벽 지기) — an original physics defense game (2026-11-21).
 *
 * Trend basis: a physics tower-defense hit of 2026 and the web-portal love of
 * destruction sandboxes. Spread hook: funny physics clips (invaders topple like
 * skittles, a bomb cart blows your own wall apart) plus a one-line high concept:
 * "stack blocks in front of the gate, drop boulders on whoever gets through".
 *
 * Each wave has two phases:
 *   1. build — drop planks/stones/beams into 8 columns in front of the gate (budget per wave)
 *   2. siege — invaders march from the right and push; tap to drop a boulder (limited, cooldown)
 * An invader is out when it topples (tilt over ~63°) or is crushed by a fast boulder.
 * The gate loses HP while invaders press against it. 30 waves across three eras.
 *
 * Simulation is matter-js with a fixed 60 Hz step, so a run is reproducible and
 * every wave can be proven winnable by an autopilot in tests.
 */
import Matter from "matter-js";

export const RAMPART_SLUG = "rampart-keeper";
export const RAMPART_WAVES = 30;
export const WAVES_PER_ERA = 10;

export const WORLD_W = 800;
export const WORLD_H = 450;
export const GROUND_Y = 420;
export const GATE_X = 80; // right face of the castle wall
export const COLUMN_X = [130, 160, 190, 220, 250, 280, 310, 340] as const;
export const STEP_MS = 1000 / 60;
export const GATE_HP = 100;
export const BOULDER_COOLDOWN_MS = 1100;
export const BOULDER_R = 17;
export const TOPPLE_ANGLE = 1.1;

export type BlockKind = "plank" | "stone" | "beam";
export type InvaderKind = "soldier" | "shield" | "ram" | "giant" | "bomb";
export type Era = 0 | 1 | 2;

/** hp = seconds of one soldier hacking at it. */
export const BLOCKS: Record<BlockKind, { w: number; h: number; density: number; cost: number; friction: number; hp: number }> = {
  plank: { w: 26, h: 26, density: 0.0016, cost: 1, friction: 0.8, hp: 30 },
  stone: { w: 28, h: 28, density: 0.0055, cost: 2, friction: 0.95, hp: 80 },
  beam: { w: 84, h: 14, density: 0.0025, cost: 2, friction: 0.9, hp: 50 },
};
/** After the last invader arrives the siege lasts this long; holding the gate until then wins. */
export const HOLD_MS = 20_000;

export const INVADERS: Record<InvaderKind, { w: number; h: number; density: number; push: number; speed: number; dps: number; crush: number }> = {
  soldier: { w: 18, h: 38, density: 0.0018, push: 0.06, speed: 1.1, dps: 6, crush: 5 },
  shield: { w: 26, h: 40, density: 0.0026, push: 0.08, speed: 0.9, dps: 7, crush: 7 },
  ram: { w: 62, h: 28, density: 0.0034, push: 0.2, speed: 0.75, dps: 16, crush: 9 },
  giant: { w: 34, h: 64, density: 0.0034, push: 0.18, speed: 0.6, dps: 18, crush: 10 },
  bomb: { w: 30, h: 26, density: 0.002, push: 0.1, speed: 1.0, dps: 0, crush: 5 },
};

export interface WaveSpawn { kind: InvaderKind; at: number } // ms after siege start
export interface WavePlan { wave: number; era: Era; budget: number; boulders: number; spawns: WaveSpawn[] }

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wave index is 0-based. Rams from wave 4, shields from 8, giants in era 2+, bomb carts in era 3. */
export function buildWave(index: number): WavePlan {
  const wave = Math.max(0, Math.min(RAMPART_WAVES - 1, Math.floor(index)));
  const era = Math.min(2, Math.floor(wave / WAVES_PER_ERA)) as Era;
  const r = rng(9001 + wave * 131);
  const pool: InvaderKind[] = ["soldier"];
  if (wave >= 3) pool.push("ram");
  if (wave >= 7) pool.push("shield");
  if (era >= 1) pool.push("giant");
  if (era >= 2) pool.push("bomb");
  const count = 4 + Math.floor(wave * 0.45);
  const spawns: WaveSpawn[] = [];
  let at = 600;
  for (let i = 0; i < count; i++) {
    // The newest invader type of an era appears at least once, as the wave's highlight.
    const kind = i === count - 1 && pool.length > 1 ? pool[pool.length - 1] : pool[Math.floor(r() * pool.length)];
    spawns.push({ kind, at });
    at += 1500 + Math.floor(r() * 900) - Math.min(600, wave * 18);
  }
  const heavy = spawns.filter((s) => s.kind === "ram" || s.kind === "giant").length;
  return {
    wave,
    era,
    budget: 8 + Math.floor(wave / 3) + heavy,
    boulders: 2 + Math.ceil(count * 0.45) + Math.ceil(heavy / 2),
    spawns,
  };
}

export type Phase = "build" | "siege" | "won" | "lost";
export interface InvaderState { id: number; kind: InvaderKind; body: Matter.Body; out: boolean; outAt: number }
export interface BlockState { id: number; kind: BlockKind; body: Matter.Body; hp: number }

export interface Siege {
  plan: WavePlan;
  engine: Matter.Engine;
  phase: Phase;
  time: number; // ms since siege start
  gateHp: number;
  budgetLeft: number;
  bouldersLeft: number;
  lastBoulderAt: number;
  nextSpawn: number;
  blocks: BlockState[];
  invaders: InvaderState[];
  boulders: Matter.Body[];
  knocked: number;
  blasts: { x: number; y: number; at: number }[];
  breaks: { x: number; y: number; at: number; kind: BlockKind }[];
  hits: [Matter.Body, Matter.Body][];
  nextId: number;
}

/** When the horn sounds: last spawn plus the hold time. */
export function siegeEndsAt(plan: WavePlan): number {
  return (plan.spawns[plan.spawns.length - 1]?.at ?? 0) + HOLD_MS;
}

const CAT_STATIC = 0x0001;

export function createSiege(index: number): Siege {
  const plan = buildWave(index);
  const engine = Matter.Engine.create({ enableSleeping: false });
  engine.gravity.y = 1;
  const ground = Matter.Bodies.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W * 2, 80, { isStatic: true, friction: 1, label: "ground", collisionFilter: { category: CAT_STATIC } });
  const wall = Matter.Bodies.rectangle(GATE_X / 2, GROUND_Y - 110, GATE_X, 220, { isStatic: true, friction: 0.6, label: "wall" });
  Matter.Composite.add(engine.world, [ground, wall]);
  const siege: Siege = {
    plan,
    engine,
    phase: "build",
    time: 0,
    gateHp: GATE_HP,
    budgetLeft: plan.budget,
    bouldersLeft: plan.boulders,
    lastBoulderAt: -BOULDER_COOLDOWN_MS,
    nextSpawn: 0,
    blocks: [],
    invaders: [],
    boulders: [],
    knocked: 0,
    blasts: [],
    breaks: [],
    hits: [],
    nextId: 1,
  };
  watchHits(siege);
  return siege;
}

function watchHits(s: Siege): void {
  Matter.Events.on(s.engine, "collisionStart", (event) => {
    for (const pair of event.pairs) s.hits.push([pair.bodyA, pair.bodyB]);
  });
}

/** Top of the stack in a column, so a new block is dropped just above it. */
function columnTop(s: Siege, x: number): number {
  let top = GROUND_Y;
  for (const b of s.blocks) {
    if (Math.abs(b.body.position.x - x) < 30) top = Math.min(top, b.body.bounds.min.y);
  }
  return top;
}

export function canPlace(s: Siege, kind: BlockKind): boolean {
  return s.phase === "build" && s.budgetLeft >= BLOCKS[kind].cost;
}

export function placeBlock(s: Siege, kind: BlockKind, column: number): boolean {
  if (!canPlace(s, kind) || column < 0 || column >= COLUMN_X.length) return false;
  const def = BLOCKS[kind];
  const x = kind === "beam" ? Math.min(COLUMN_X[column], COLUMN_X[COLUMN_X.length - 1] - 20) : COLUMN_X[column];
  const top = columnTop(s, x);
  if (top - def.h < 120) return false; // stack too tall
  const body = Matter.Bodies.rectangle(x, top - def.h / 2 - 2, def.w, def.h, {
    density: def.density,
    friction: def.friction,
    frictionStatic: 1.2,
    restitution: 0.02,
    label: `block:${kind}`,
  });
  Matter.Composite.add(s.engine.world, body);
  s.blocks.push({ id: s.nextId++, kind, body, hp: def.hp });
  s.budgetLeft -= def.cost;
  // Let it settle so the next block in this column lands on top of it.
  for (let i = 0; i < 40; i++) Matter.Engine.update(s.engine, STEP_MS);
  s.hits = [];
  return true;
}

export function startSiege(s: Siege): void {
  if (s.phase !== "build") return;
  s.phase = "siege";
  s.time = 0;
}

export function canDrop(s: Siege): boolean {
  return s.phase === "siege" && s.bouldersLeft > 0 && s.time - s.lastBoulderAt >= BOULDER_COOLDOWN_MS;
}

export function dropBoulder(s: Siege, x: number): boolean {
  if (!canDrop(s)) return false;
  const cx = Math.max(GATE_X + BOULDER_R + 4, Math.min(WORLD_W - BOULDER_R, x));
  const body = Matter.Bodies.circle(cx, 20, BOULDER_R, { density: 0.012, friction: 0.4, restitution: 0.15, label: "boulder" });
  Matter.Body.setVelocity(body, { x: 0, y: 6 });
  Matter.Composite.add(s.engine.world, body);
  s.boulders.push(body);
  s.bouldersLeft -= 1;
  s.lastBoulderAt = s.time;
  return true;
}

function spawnInvader(s: Siege, kind: InvaderKind): void {
  const def = INVADERS[kind];
  const body = Matter.Bodies.rectangle(WORLD_W + 20, GROUND_Y - def.h / 2 - 1, def.w, def.h, {
    density: def.density,
    // Walking is driven by velocity easing, so feet do not grip the ground.
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0.01,
    restitution: 0.05,
    label: `invader:${kind}`,
  });
  Matter.Composite.add(s.engine.world, body);
  s.invaders.push({ id: s.nextId++, kind, body, out: false, outAt: 0 });
}

function knockOut(s: Siege, inv: InvaderState): void {
  if (inv.out) return;
  inv.out = true;
  inv.outAt = s.time;
  s.knocked += 1;
}

function explode(s: Siege, inv: InvaderState): void {
  const { x, y } = inv.body.position;
  s.blasts.push({ x, y, at: s.time });
  for (const b of [...s.blocks.map((b) => b.body), ...s.invaders.filter((i) => i !== inv && !i.out).map((i) => i.body)]) {
    const dx = b.position.x - x;
    const dy = b.position.y - y;
    const d = Math.hypot(dx, dy);
    if (d > 90 || d === 0) continue;
    const f = (0.05 * b.mass * (1 - d / 90)) / d;
    Matter.Body.applyForce(b, b.position, { x: dx * f, y: dy * f - 0.02 * b.mass });
  }
  knockOut(s, inv);
  Matter.Composite.remove(s.engine.world, inv.body);
}

/** Advances one fixed step. Returns the phase after the step. */
export function stepSiege(s: Siege): Phase {
  if (s.phase !== "siege") return s.phase;
  s.time += STEP_MS;
  const { plan } = s;
  while (s.nextSpawn < plan.spawns.length && plan.spawns[s.nextSpawn].at <= s.time) {
    spawnInvader(s, plan.spawns[s.nextSpawn].kind);
    s.nextSpawn += 1;
  }
  for (const inv of s.invaders) {
    if (inv.out) continue;
    const def = INVADERS[inv.kind];
    const body = inv.body;
    if (Math.abs(body.angle) > TOPPLE_ANGLE || body.position.y > WORLD_H + 60) {
      knockOut(s, inv);
      continue;
    }
    const onFeet = Math.abs(body.angle) < 0.5;
    if (onFeet) {
      // Marching invaders keep their balance; only blasts, boulders and falling blocks topple them.
      Matter.Body.setAngularVelocity(body, body.angularVelocity * 0.6 - body.angle * 0.08);
      // Walk: ease the speed toward the march pace; `push` is how hard they lean into what blocks them.
      const vx = body.velocity.x + (-def.speed - body.velocity.x) * def.push;
      Matter.Body.setVelocity(body, { x: vx, y: body.velocity.y });
    }
    // Bomb carts blow up on the first block they touch.
    if (inv.kind === "bomb") {
      const touching = s.blocks.some((b) => Matter.Bounds.overlaps(b.body.bounds, body.bounds));
      if (touching || body.bounds.min.x <= GATE_X + 2) {
        explode(s, inv);
        if (body.bounds.min.x <= GATE_X + 2) s.gateHp = Math.max(0, s.gateHp - 12);
        continue;
      }
    }
    if (body.bounds.min.x <= GATE_X + 3) {
      s.gateHp = Math.max(0, s.gateHp - (def.dps * STEP_MS) / 1000);
      continue;
    }
    // Invaders hack at the block in front of them; broken blocks vanish.
    const front = s.blocks.find((b) => b.body.bounds.max.x >= body.bounds.min.x - 3 && b.body.bounds.min.x < body.position.x && b.body.bounds.max.y > body.bounds.min.y + 4 && b.body.bounds.min.y < body.bounds.max.y - 4);
    if (front) front.hp -= (def.dps * STEP_MS) / 1000 * 6;
  }
  for (const b of s.blocks) {
    if (b.hp > 0) continue;
    s.breaks.push({ x: b.body.position.x, y: b.body.position.y, at: s.time, kind: b.kind });
    Matter.Composite.remove(s.engine.world, b.body);
  }
  s.blocks = s.blocks.filter((b) => b.hp > 0);
  s.hits = [];
  const preSpeed = new Map(s.boulders.map((b) => [b.id, Math.hypot(b.velocity.x, b.velocity.y)]));
  Matter.Engine.update(s.engine, STEP_MS);
  // Fast boulders crush invaders they hit.
  for (const [a, b] of s.hits) {
    const boulder = a.label === "boulder" ? a : b.label === "boulder" ? b : null;
    if (!boulder) continue;
    const other = boulder === a ? b : a;
    const inv = s.invaders.find((i) => i.body === other && !i.out);
    if (!inv) continue;
    if ((preSpeed.get(boulder.id) ?? 0) >= INVADERS[inv.kind].crush) {
      Matter.Body.setAngularVelocity(inv.body, 0.35);
      Matter.Body.applyForce(inv.body, inv.body.position, { x: 0.02 * inv.body.mass, y: -0.03 * inv.body.mass });
      knockOut(s, inv);
    }
  }
  // Remove knocked-out bodies after a short tumble, and stray boulders.
  for (const inv of s.invaders) {
    if (inv.out && s.time - inv.outAt > 900 && s.engine.world.bodies.includes(inv.body)) Matter.Composite.remove(s.engine.world, inv.body);
  }
  s.boulders = s.boulders.filter((b) => {
    const gone = b.position.y > WORLD_H + 80 || b.position.x < -50 || b.position.x > WORLD_W + 80;
    if (gone) Matter.Composite.remove(s.engine.world, b);
    return !gone;
  });
  s.blasts = s.blasts.filter((b) => s.time - b.at < 600);
  s.breaks = s.breaks.filter((b) => s.time - b.at < 500);
  if (s.gateHp <= 0) s.phase = "lost";
  else if (s.nextSpawn >= plan.spawns.length && (s.invaders.every((i) => i.out) || s.time >= siegeEndsAt(plan))) s.phase = "won";
  return s.phase;
}

export function waveStars(s: Siege): number {
  if (s.phase !== "won") return 0;
  if (s.gateHp >= 90) return 3;
  if (s.gateHp >= 50) return 2;
  return 1;
}

/** Score for shared records: knocked invaders, gate HP left and unused boulders. */
export function waveScore(s: Siege): number {
  if (s.phase !== "won") return s.knocked * 10;
  return s.knocked * 10 + Math.round(s.gateHp) * 2 + s.bouldersLeft * 5 + (s.plan.wave + 1) * 20;
}

export function liveInvaders(s: Siege): InvaderState[] {
  return s.invaders.filter((i) => !i.out);
}

/** The invader closest to the gate, for aim hints and the test autopilot. */
export function leadInvader(s: Siege): InvaderState | null {
  let best: InvaderState | null = null;
  for (const inv of s.invaders) {
    if (inv.out || inv.body.position.x > WORLD_W - 10) continue;
    if (!best || inv.body.position.x < best.body.position.x) best = inv;
  }
  return best;
}

const ERA_BEST_KEY = "oiyo:rampart-keeper:best:v1";
export function loadWaveBests(): Record<number, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(ERA_BEST_KEY) || "{}");
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(raw)) if (Number.isInteger(Number(k)) && typeof v === "number" && v >= 0) out[Number(k)] = v;
    return out;
  } catch {
    return {};
  }
}
export function saveWaveBest(wave: number, score: number): Record<number, number> {
  const all = loadWaveBests();
  if (score > (all[wave] ?? 0)) all[wave] = score;
  try {
    localStorage.setItem(ERA_BEST_KEY, JSON.stringify(all));
  } catch {
    /* best-effort */
  }
  return all;
}
export function totalBest(bests: Record<number, number>): number {
  return Object.values(bests).reduce((a, b) => a + b, 0);
}
