/**
 * Snowman Stack (눈사람 쌓기) — an original physics stacking game for the December season (2026-11-22).
 *
 * Spread hook (studio lens): funny physics clips (lopsided snowmen wobble and topple) +
 * a one-line high concept: "drop snowballs from a swinging rail and build a snowman that stands".
 *
 * Rules
 * - A trolley swings left and right above the stack; tap to drop the snowball it carries.
 * - Snow is sticky: a piece welds to whatever piece it first touches (springy weld, so the
 *   tower wobbles). The platform itself does not stick, so the whole snowman can still tip
 *   over when its centre of mass leaves the base, or slide on ice.
 * - A stage is cleared when every piece is placed and the snowman stands still for 1.5 s.
 *   It is lost when any piece falls below the platform.
 * - 20 stages: field → tree stump (narrow) → frozen pond (slippery), with wind from stage 6.
 *
 * matter-js with a fixed 60 Hz step, so runs are reproducible and an autopilot can prove
 * every stage clearable in tests.
 */
import Matter from "matter-js";

export const SNOWMAN_SLUG = "snowman-stack";
export const SNOWMAN_STAGES = 20;

export const WORLD_W = 480;
export const WORLD_H = 720;
export const PLAT_Y = 640; // platform top
export const STEP_MS = 1000 / 60;
export const SETTLE_STEPS = 90; // 1.5 s still to clear
export const DROP_GAP = 100; // trolley rides this far above the stack top
export const RAIL_MIN_Y = 70;
export const HAT = { w: 46, h: 32 } as const;

export type Ground = "field" | "stump" | "ice";
export type PieceSpec = { kind: "ball"; r: number } | { kind: "hat" };

export interface StagePlan {
  stage: number;
  ground: Ground;
  platformW: number;
  /** trolley swing: x = centre + amp * sin(omega * t + phase) */
  amp: number;
  omega: number; // rad/s
  phase: number;
  /** wind strength (0 = calm); gusts follow a slow sine */
  wind: number;
  /** how firmly the packed snow holds the snowman upright (1 = soft first stages, lower = touchier) */
  grip: number;
  pieces: PieceSpec[];
}

const b = (r: number): PieceSpec => ({ kind: "ball", r });
const hat: PieceSpec = { kind: "hat" };

type Row = [Ground, number, number, number, number, PieceSpec[]]; // ground, platformW, amp, omega, wind, pieces
const ROWS: Row[] = [
  ["field", 300, 120, 1.5, 0, [b(52), b(40), b(30)]],
  ["field", 300, 125, 1.6, 0, [b(52), b(40), b(30), hat]],
  ["field", 280, 130, 1.7, 0, [b(50), b(42), b(34), b(26)]],
  ["field", 280, 140, 1.9, 0, [b(54), b(40), b(30), hat]],
  ["stump", 110, 130, 1.8, 0, [b(50), b(38), b(28)]],
  ["field", 280, 140, 1.9, 0.35, [b(50), b(40), b(32), hat]],
  ["field", 280, 145, 2.0, 0, [b(42), b(52), b(30), hat]],
  ["field", 260, 150, 2.0, 0.25, [b(52), b(44), b(36), b(28), hat]],
  ["ice", 300, 140, 1.9, 0.25, [b(50), b(40), b(30), hat]],
  ["stump", 100, 145, 2.1, 0, [b(48), b(38), b(30), hat]],
  ["field", 260, 150, 2.1, 0.2, [b(54), b(46), b(40), b(34), b(28), hat]],
  ["field", 260, 150, 2.2, 0.55, [b(52), b(40), b(30), hat]],
  ["field", 260, 150, 2.2, 0.3, [b(44), b(52), b(44), b(30), hat]],
  ["ice", 280, 150, 2.2, 0.45, [b(50), b(42), b(32), b(24), hat]],
  ["stump", 96, 150, 2.3, 0.2, [b(46), b(40), b(34), b(28)]],
  ["field", 250, 155, 2.4, 0.35, [b(54), b(46), b(38), b(30), b(24), hat]],
  ["field", 250, 155, 2.4, 0.3, [b(38), b(50), b(38), b(50), b(30), hat]],
  ["ice", 260, 155, 2.5, 0.55, [b(52), b(44), b(36), b(28), hat]],
  ["stump", 104, 155, 2.5, 0.2, [b(54), b(46), b(38), b(30), b(24), hat]],
  ["field", 240, 160, 2.6, 0.25, [b(58), b(50), b(44), b(38), b(32), b(26), b(20), hat]],
];

const GRIP_FIRST = 0.8;
const GRIP_LAST = 0.4;

export function buildStage(index: number): StagePlan {
  const stage = Math.max(0, Math.min(SNOWMAN_STAGES - 1, Math.floor(index)));
  const [ground, platformW, amp, omega, wind, pieces] = ROWS[stage];
  return { stage, ground, platformW, amp, omega, phase: (stage * 1.3) % (Math.PI * 2), wind, pieces, grip: GRIP_FIRST - (GRIP_FIRST - GRIP_LAST) * (stage / (SNOWMAN_STAGES - 1)) };
}

export type Phase = "play" | "won" | "lost";

export interface Piece {
  spec: PieceSpec;
  body: Matter.Body;
  /** horizontal distance from the piece below when it stuck (precision) */
  offset: number | null;
  stuckTo: Matter.Body | null;
  /** part angle relative to its compound when it joined (compound parts do not track their own angle) */
  angle0: number;
}

export interface Game {
  plan: StagePlan;
  engine: Matter.Engine;
  platform: Matter.Body;
  phase: Phase;
  steps: number;
  next: number; // index of the piece on the trolley
  pieces: Piece[];
  stillSteps: number;
  /** steps since the last drop; a new piece is ready after a short reload */
  sinceDrop: number;
  pending: [Piece, Piece][];
  /** the snowman stands on a packed-snow pivot at the base: pin constraint + spring */
  pivot: { x: number; y: number } | null;
  pin: Matter.Constraint | null;
  /** tilt carried over from earlier compounds (a new compound starts at angle 0) */
  tiltBase: number;
  /** number of sticks so far (audio cue) */
  made: number;
  lostAt: { x: number; y: number } | null;
  lostWhy: "tipped" | "missed" | null;
}

export const RELOAD_STEPS = 24;
/** Tilt (rad) past which packed snow gives way and the snowman falls. */
export const TIP_ANGLE = 0.42;
const CAT_PLATFORM = 0x0002;

/** Per-ground packed-snow spring (angular velocity per step per rad) and damping. */
export const GROUND_SPRING: Record<Ground, { k: number; damp: number; tip: number }> = {
  field: { k: 0.0042, damp: 0.93, tip: TIP_ANGLE },
  stump: { k: 0.0034, damp: 0.93, tip: TIP_ANGLE * 0.85 },
  ice: { k: 0.003, damp: 0.95, tip: TIP_ANGLE },
};

function pieceBody(spec: PieceSpec, x: number, y: number): Matter.Body {
  const common = { friction: 0.9, frictionStatic: 1, restitution: 0, density: 0.0016, frictionAir: 0.01 };
  if (spec.kind === "hat") return Matter.Bodies.rectangle(x, y, HAT.w, HAT.h, { ...common, density: 0.0012, label: "hat" });
  // Octagon resting on a face (matter-js polygons start half a side off the axis).
  return Matter.Bodies.polygon(x, y, 8, spec.r, { ...common, label: "ball" });
}

export function pieceHalfHeight(spec: PieceSpec): number {
  return spec.kind === "hat" ? HAT.h / 2 : spec.r * Math.cos(Math.PI / 8);
}

export function createGame(index: number): Game {
  const plan = buildStage(index);
  const engine = Matter.Engine.create({ enableSleeping: false });
  engine.gravity.y = 1;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 6;
  const platform = Matter.Bodies.rectangle(WORLD_W / 2, PLAT_Y + 30, plan.platformW, 60, {
    isStatic: true,
    friction: plan.ground === "ice" ? 0.05 : 1,
    label: "platform",
    collisionFilter: { category: CAT_PLATFORM },
  });
  Matter.Composite.add(engine.world, platform);
  const g: Game = {
    plan, engine, platform, phase: "play", steps: 0, next: 0, pieces: [], stillSteps: 0, sinceDrop: RELOAD_STEPS,
    pending: [], pivot: null, pin: null, tiltBase: 0, made: 0, lostAt: null, lostWhy: null,
  };
  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) onTouch(g, pair.bodyA, pair.bodyB);
  });
  return g;
}

const pieceOf = (g: Game, body: Matter.Body) => g.pieces.find((p) => p.body === body || p.body.parent === body);

function onTouch(g: Game, a: Matter.Body, b2: Matter.Body): void {
  if (g.phase !== "play") return;
  const pa = pieceOf(g, a);
  const pb = pieceOf(g, b2);
  const hitPlatform = a === g.platform || b2 === g.platform;
  if (hitPlatform && (pa || pb)) {
    const piece = (pa ?? pb)!;
    if (g.pieces.indexOf(piece) === 0 && !g.pivot) g.pending.push([piece, piece]);
    else if (!piece.stuckTo && g.pieces.indexOf(piece) !== 0) {
      g.phase = "lost";
      g.lostWhy = "missed";
      g.lostAt = { x: piece.body.position.x, y: PLAT_Y };
    }
    return;
  }
  if (!pa || !pb || pa === pb) return;
  const [top, below] = g.pieces.indexOf(pa) > g.pieces.indexOf(pb) ? [pa, pb] : [pb, pa];
  if (top.stuckTo || top.body.parent === below.body.parent && top.body.parent !== top.body) return;
  // only stick onto the snowman (base and what is already stuck to it)
  if (!(below.stuckTo || g.pieces.indexOf(below) === 0)) return;
  g.pending.push([top, below]);
}

/** Current world angle of a piece's part. */
export function pieceAngle(p: Piece): number {
  return p.body.parent === p.body ? p.body.angle : p.angle0 + p.body.parent.angle;
}

/** The snowman's root body (compound once two pieces have stuck), or null before the base lands. */
export function snowmanRoot(g: Game): Matter.Body | null {
  return g.pieces[0] && g.pivot ? g.pieces[0].body.parent : null;
}

export function tilt(g: Game): number {
  const root = snowmanRoot(g);
  return root ? g.tiltBase + root.angle : 0;
}

function setPin(g: Game, root: Matter.Body): void {
  if (!g.pivot) return;
  if (g.pin) Matter.Composite.remove(g.engine.world, g.pin);
  g.pin = Matter.Constraint.create({ bodyA: root, pointA: Matter.Vector.sub(g.pivot, root.position), pointB: { ...g.pivot }, length: 0, stiffness: 1 });
  Matter.Composite.add(g.engine.world, g.pin);
  // A pinned snowman rocks on its packed-snow pivot instead of on the platform edge.
  for (const part of root.parts) part.collisionFilter.mask = ~CAT_PLATFORM;
}

/** Applies pending sticks after the engine step (compound bodies must not change mid-collision). */
function mergePending(g: Game): void {
  for (const [top, below] of g.pending) {
    if (top === below) {
      // base landed: pack it into the snow and pin it
      if (g.pivot) continue;
      top.offset = Math.abs(top.body.position.x - WORLD_W / 2);
      g.pivot = { x: top.body.position.x, y: PLAT_Y - 2 };
      Matter.Body.setVelocity(top.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(top.body, 0);
      g.tiltBase = 0;
      Matter.Body.setAngle(top.body, 0);
      setPin(g, top.body);
      g.made += 1;
      continue;
    }
    if (top.stuckTo) continue;
    top.stuckTo = below.body;
    top.offset = Math.abs(top.body.position.x - below.body.position.x);
    const oldRoot = below.body.parent;
    const roots = new Set<Matter.Body>([top.body.parent, oldRoot]);
    let mass = 0;
    const momentum = { x: 0, y: 0 };
    for (const root of roots) {
      mass += root.mass;
      momentum.x += root.velocity.x * root.mass;
      momentum.y += root.velocity.y * root.mass;
    }
    const spin = oldRoot.angularVelocity;
    const tiltNow = tilt(g);
    const members = g.pieces.filter((p) => roots.has(p.body.parent));
    const poses = members.map((p) => ({ p, x: p.body.position.x, y: p.body.position.y, a: p === top ? top.body.angle : g.tiltBase + p.angle0 + oldRoot.angle }));
    for (const root of roots) Matter.Composite.remove(g.engine.world, root);
    // matter-js cannot reuse bodies that were already in the world as parts, so each member gets a fresh part.
    const parts: Matter.Body[] = [];
    for (const { p, x, y, a } of poses) {
      const fresh = pieceBody(p.spec, x, y);
      Matter.Body.setAngle(fresh, a - tiltNow);
      for (const other of g.pieces) if (other.stuckTo === p.body) other.stuckTo = fresh;
      p.body = fresh;
      p.angle0 = a - tiltNow;
      parts.push(fresh);
    }
    const snowman = Matter.Body.create({ parts, friction: 0.9, frictionStatic: 1, restitution: 0, frictionAir: 0.01, label: "snowman" });
    // matter-js sums part inertia without the parallel-axis term; a tall snowman needs it or the pin explodes.
    let inertia = 0;
    for (const part of parts) inertia += part.inertia + part.mass * Matter.Vector.magnitudeSquared(Matter.Vector.sub(part.position, snowman.position)) * 4;
    Matter.Body.setInertia(snowman, inertia);
    // Snow soaks up most of the impact, but a lopsided stick still sets it rocking.
    Matter.Body.setVelocity(snowman, { x: (momentum.x / mass) * 0.2, y: 0 });
    Matter.Body.setAngularVelocity(snowman, spin + ((top.body.position.x - g.pivot!.x) / 4000) * Math.min(6, Math.abs(momentum.y / mass)));
    g.tiltBase = tiltNow;
    Matter.Composite.add(g.engine.world, snowman);
    setPin(g, snowman);
    g.made += 1;
  }
  g.pending = [];
}

export function trolleyX(g: Game, steps = g.steps): number {
  const t = (steps * STEP_MS) / 1000;
  return WORLD_W / 2 + g.plan.amp * Math.sin(g.plan.omega * t + g.plan.phase);
}

/** Highest point of the stack (smallest y), or the platform top. */
export function stackTop(g: Game): number {
  let top = PLAT_Y;
  for (const p of g.pieces) if (p.stuckTo || g.pieces.indexOf(p) === 0) top = Math.min(top, p.body.bounds.min.y);
  return top;
}

export function trolleyY(g: Game): number {
  const spec = g.plan.pieces[g.next];
  const half = spec ? pieceHalfHeight(spec) : 20;
  return Math.max(RAIL_MIN_Y + half, stackTop(g) - DROP_GAP + half);
}

export function canDrop(g: Game): boolean {
  if (g.phase !== "play" || g.next >= g.plan.pieces.length || g.sinceDrop < RELOAD_STEPS) return false;
  // the previous piece must have landed (stuck) first
  const last = g.pieces[g.pieces.length - 1];
  return !last || !!last.stuckTo || (g.pieces.length === 1 && !!g.pivot);
}

export function drop(g: Game): boolean {
  if (!canDrop(g)) return false;
  const spec = g.plan.pieces[g.next];
  const body = pieceBody(spec, trolleyX(g), trolleyY(g));
  Matter.Composite.add(g.engine.world, body);
  g.pieces.push({ spec, body, offset: null, stuckTo: null, angle0: 0 });
  g.next += 1;
  g.sinceDrop = 0;
  g.stillSteps = 0;
  return true;
}

/** Wind factor at this step (signed). */
export function windAt(g: Game, steps = g.steps): number {
  if (!g.plan.wind) return 0;
  const t = (steps * STEP_MS) / 1000;
  return g.plan.wind * (0.55 + 0.45 * Math.sin(t * 0.9 + g.plan.stage)) * (Math.sin(t * 0.23 + g.plan.stage * 2) >= -0.2 ? 1 : -1);
}

function tipOver(g: Game, root: Matter.Body): void {
  g.phase = "lost";
  g.lostWhy = "tipped";
  if (g.pin) Matter.Composite.remove(g.engine.world, g.pin);
  g.pin = null;
  for (const part of root.parts) part.collisionFilter.mask = 0xffffffff;
  const head = g.pieces[g.pieces.length - 1];
  g.lostAt = { x: head.body.position.x, y: head.body.position.y };
}

export function step(g: Game): void {
  if (g.phase !== "play") return;
  const w = windAt(g);
  const root = snowmanRoot(g);
  for (const p of g.pieces) {
    if (p.body.parent !== p.body || p === g.pieces[0] && g.pivot) continue;
    if (w) Matter.Body.applyForce(p.body, p.body.position, { x: w * p.body.mass * 0.00004, y: 0 }); // falling pieces drift
  }
  Matter.Engine.update(g.engine, STEP_MS);
  mergePending(g);
  g.steps += 1;
  g.sinceDrop += 1;
  const r = snowmanRoot(g) ?? root;
  if (r && g.pivot && g.phase === "play") {
    const spring = GROUND_SPRING[g.plan.ground];
    const a = tilt(g);
    const height = PLAT_Y - stackTop(g);
    const windTorque = w * 0.00009 * (height / 100);
    Matter.Body.setAngularVelocity(r, r.angularVelocity * spring.damp - spring.k * g.plan.grip * a + windTorque);
    if (Math.abs(a) > spring.tip) {
      tipOver(g, r);
      return;
    }
  }
  for (const p of g.pieces) {
    if (p.body.position.y > WORLD_H + 40 || p.body.position.x < -80 || p.body.position.x > WORLD_W + 80) {
      g.phase = "lost";
      g.lostWhy = "missed";
      g.lostAt = { x: Math.max(10, Math.min(WORLD_W - 10, p.body.position.x)), y: WORLD_H - 10 };
      return;
    }
  }
  if (g.next >= g.plan.pieces.length && g.pieces.every((p, i) => (i === 0 ? !!g.pivot : !!p.stuckTo))) {
    const still = !!r && Math.abs(r.angularVelocity) < 0.0015;
    g.stillSteps = still ? g.stillSteps + 1 : 0;
    if (g.stillSteps >= SETTLE_STEPS) g.phase = "won";
  }
}

/** Keeps the physics running after a loss so the fall plays out on screen. */
export function stepAfter(g: Game): void {
  if (g.phase !== "lost") return;
  Matter.Engine.update(g.engine, STEP_MS);
}

/** 0..3 stars from average stick offset (precision). */
export function stageStars(g: Game): number {
  if (g.phase !== "won") return 0;
  const offs = g.pieces.map((p) => p.offset).filter((o): o is number => o !== null);
  const avg = offs.length ? offs.reduce((a, b2) => a + b2, 0) / offs.length : 0;
  return avg <= 7 ? 3 : avg <= 16 ? 2 : 1;
}

export function stageScore(g: Game): number {
  if (g.phase !== "won") return 0;
  const precision = g.pieces.reduce((sum, p) => sum + Math.max(0, 40 - (p.offset ?? 0) * 2), 0);
  const height = Math.round(PLAT_Y - stackTop(g));
  return 100 + precision + height + stageStars(g) * 50;
}

/** Snowman height in centimetres for the result card (1 px = 0.5 cm). */
export function heightCm(g: Game): number {
  return Math.round((PLAT_Y - stackTop(g)) / 2);
}

const BEST_KEY = "oiyo:snowman-stack:bests";

export function loadBests(): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < SNOWMAN_STAGES && typeof v === "number" && Number.isFinite(v)) out[i] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveBest(stage: number, score: number): Record<number, number> {
  const bests = loadBests();
  if (score > (bests[stage] ?? 0)) bests[stage] = score;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  } catch {
    // storage blocked
  }
  return bests;
}

export function totalBest(bests: Record<number, number>): number {
  return Object.values(bests).reduce((a, v) => a + v, 0);
}
