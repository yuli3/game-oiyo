/**
 * Sofa Carry (둘이서 소파 옮기기) — an OIYO original two-player carrying game for one phone (2026-11-24).
 *
 * Moving day. Two friends carry a long sofa down the hall of an old building to the van, each holding one end:
 * each player drags their own end (or one player uses both thumbs). The sofa is rigid, so the ends pull on each
 * other, and the hall is narrower than the sofa is long — it only fits lengthwise, and it can only be turned on
 * the landings at the corners. Scrape a wall and the sofa stops dead. Get it to the van before the van leaves.
 *
 * Pure and deterministic: every building is seeded per stage.
 */

export const SOFA_SLUG = "sofa-carry";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const HAND_SPEED = 120; // px/s an end can be carried at
export const SCRAPE_COOLDOWN = 0.5; // s before another scrape counts

export interface Pt { x: number; y: number }
export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface SofaStage {
  stage: number;
  path: Pt[]; // centre line of the hall, start to van
  hall: number; // hall width
  landing: number; // landing size at every corner
  length: number; // sofa length (end to end)
  thick: number; // sofa thickness
  time: number;
  par: number;
}

/** The floor: hall segments and corner landings, as boxes. */
export function floor(st: SofaStage): Box[] {
  const out: Box[] = [];
  const h = st.hall / 2;
  for (let i = 0; i + 1 < st.path.length; i++) {
    const a = st.path[i];
    const b = st.path[i + 1];
    out.push({ x0: Math.min(a.x, b.x) - h, y0: Math.min(a.y, b.y) - h, x1: Math.max(a.x, b.x) + h, y1: Math.max(a.y, b.y) + h });
  }
  const l = st.landing / 2;
  for (const p of st.path.slice(1, -1)) out.push({ x0: p.x - l, y0: p.y - l, x1: p.x + l, y1: p.y + l });
  // the van's doorway at the end and the flat's doorway at the start are a little roomier
  const end = st.path[st.path.length - 1];
  const start = st.path[0];
  out.push({ x0: end.x - l, y0: end.y - l, x1: end.x + l, y1: end.y + l });
  out.push({ x0: start.x - l, y0: start.y - l, x1: start.x + l, y1: start.y + l });
  return out;
}

const insideAny = (boxes: Box[], p: Pt, m: number) => boxes.some((b) => p.x >= b.x0 + m && p.x <= b.x1 - m && p.y >= b.y0 + m && p.y <= b.y1 - m);

/** Whether the sofa between these ends clears the walls (sampled along it, with its thickness). */
export function clear(st: SofaStage, boxes: Box[], a: Pt, b: Pt): boolean {
  const m = st.thick / 2;
  for (let k = 0; k <= 12; k++) {
    const p = { x: a.x + ((b.x - a.x) * k) / 12, y: a.y + ((b.y - a.y) * k) / 12 };
    if (!insideAny(boxes, p, m)) return false;
  }
  return true;
}

export interface Carry {
  stage: SofaStage;
  boxes: Box[];
  a: Pt;
  b: Pt;
  t: number;
  scrapes: number;
  cool: number;
  over: boolean;
  won: boolean;
}

export function newCarry(stage: SofaStage): Carry {
  const p0 = stage.path[0];
  const p1 = stage.path[1];
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const d = { x: (p1.x - p0.x) / len, y: (p1.y - p0.y) / len };
  const half = stage.length / 2;
  // the sofa starts in the doorway, lined up with the first hall
  const c = { x: p0.x, y: p0.y };
  return { stage, boxes: floor(stage), a: { x: c.x - d.x * half, y: c.y - d.y * half }, b: { x: c.x + d.x * half, y: c.y + d.y * half }, t: 0, scrapes: 0, cool: 0, over: false, won: false };
}

export const middle = (c: Carry): Pt => ({ x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 });
export const atVan = (c: Carry) => {
  const end = c.stage.path[c.stage.path.length - 1];
  const m = middle(c);
  return Math.hypot(m.x - end.x, m.y - end.y) < 14;
};

function toward(p: Pt, q: Pt | null, step: number): Pt {
  if (!q) return { ...p };
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= step) return { ...q };
  return { x: p.x + (dx / d) * step, y: p.y + (dy / d) * step };
}

export interface CarryEvents { scrape: boolean; end: boolean }

/**
 * Moves each end toward its hand (null = that end is not being pulled) by at most HAND_SPEED × dt, keeps the
 * sofa its length about its middle, and stops it dead if that would scrape a wall.
 */
export function stepCarry(c: Carry, handA: Pt | null, handB: Pt | null, dt: number): CarryEvents {
  const ev: CarryEvents = { scrape: false, end: false };
  if (c.over) return ev;
  c.t += dt;
  c.cool = Math.max(0, c.cool - dt);
  const na = toward(c.a, handA, HAND_SPEED * dt);
  const nb = toward(c.b, handB, HAND_SPEED * dt);
  const mx = (na.x + nb.x) / 2;
  const my = (na.y + nb.y) / 2;
  let dx = nb.x - na.x;
  let dy = nb.y - na.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const half = c.stage.length / 2;
  const a = { x: mx - dx * half, y: my - dy * half };
  const b = { x: mx + dx * half, y: my + dy * half };
  if (clear(c.stage, c.boxes, a, b)) {
    c.a = a;
    c.b = b;
  } else if (c.cool <= 0 && (handA || handB)) {
    c.scrapes++;
    c.cool = SCRAPE_COOLDOWN;
    ev.scrape = true;
  }
  if (atVan(c)) {
    c.over = true;
    c.won = true;
    ev.end = true;
  } else if (c.t >= c.stage.time) {
    c.over = true;
    ev.end = true;
  }
  return ev;
}

export function starsFor(c: Carry): number {
  if (!c.won) return 0;
  if (c.scrapes === 0 && c.t <= c.stage.par * 1.1) return 3;
  if (c.scrapes <= 2) return 2;
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

/** The way movers do it: carry it lengthwise down each hall, and turn it only standing on a landing. */
export function plan(st: SofaStage): Array<{ c: Pt; angle: number }> {
  const poses: Array<{ c: Pt; angle: number }> = [];
  const ang = (i: number) => Math.atan2(st.path[i + 1].y - st.path[i].y, st.path[i + 1].x - st.path[i].x);
  for (let i = 0; i + 1 < st.path.length; i++) {
    const a = st.path[i];
    const b = st.path[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 20));
    for (let k = 0; k <= steps; k++) poses.push({ c: { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps }, angle: ang(i) });
    if (i + 2 < st.path.length) {
      // pivot on the landing, a few degrees at a time
      let from = ang(i);
      const to = ang(i + 1);
      let diff = to - from;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      for (let k = 1; k <= 6; k++) poses.push({ c: { ...b }, angle: from + (diff * k) / 6 });
      from = to;
    }
  }
  return poses;
}

export interface MoverOpts {
  /** s the hands lag the plan */
  lag?: number;
  /** px of wobble in each hand */
  wobble?: number;
  seed?: number;
  /** "plan" follows the movers' way; "straight" pulls both ends at the van; "one" pulls just the front end along the plan */
  mode?: "plan" | "straight" | "one";
}

export function pilot(stage: SofaStage, opts: MoverOpts = {}): Carry {
  const { lag = 0, wobble = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 3373 + 1);
  const c = newCarry(stage);
  const poses = plan(stage);
  const half = stage.length / 2;
  const dt = 1 / 60;
  let k = 0;
  let wa = { x: 0, y: 0 };
  let wb = { x: 0, y: 0 };
  let nextWobble = 0;
  const lagSteps = Math.round(lag / dt);
  const history: Array<[Pt, Pt]> = [];
  const end = stage.path[stage.path.length - 1];
  while (!c.over) {
    // move on to the next pose once both ends are close to this one
    const p = poses[Math.min(k, poses.length - 1)];
    const ta = { x: p.c.x - Math.cos(p.angle) * half, y: p.c.y - Math.sin(p.angle) * half };
    const tb = { x: p.c.x + Math.cos(p.angle) * half, y: p.c.y + Math.sin(p.angle) * half };
    if (Math.hypot(c.a.x - ta.x, c.a.y - ta.y) < 4 && Math.hypot(c.b.x - tb.x, c.b.y - tb.y) < 4) k = Math.min(poses.length - 1, k + 1);
    if (c.t >= nextWobble) {
      wa = { x: (rng() * 2 - 1) * wobble, y: (rng() * 2 - 1) * wobble };
      wb = { x: (rng() * 2 - 1) * wobble, y: (rng() * 2 - 1) * wobble };
      nextWobble = c.t + 0.4;
    }
    let ha: Pt | null = { x: ta.x + wa.x, y: ta.y + wa.y };
    let hb: Pt | null = { x: tb.x + wb.x, y: tb.y + wb.y };
    if (mode === "straight") {
      ha = { ...end };
      hb = { ...end };
    } else if (mode === "one") ha = null;
    history.push([ha ?? c.a, hb ?? c.b]);
    const [la, lb] = history.length > lagSteps ? history[history.length - 1 - lagSteps] : [c.a, c.b];
    stepCarry(c, mode === "one" ? null : la, lb, dt);
  }
  return c;
}

function shape(stage: number) {
  return {
    zigs: Math.min(3, 1 + Math.floor(stage / 8)), // pairs of corners
    length: Math.min(96, 64 + stage * 1.2),
    thick: 22,
    spare: Math.max(6, 16 - stage * 0.35), // hall width beyond the sofa's thickness
  };
}

/** Human-like movers used to set the clock: a beat behind the plan, hands a little unsteady. */
export const HUMAN_MOVERS: MoverOpts[] = [1, 2, 3, 4, 5].map((seed) => ({ lag: 0.12, wobble: 2, seed }));

export function buildStage(stage: number): SofaStage {
  const sh = shape(stage);
  const rng = mulberry(211000 + stage * 149);
  const landing = Math.ceil(sh.length + sh.thick + 6);
  // a zig-zag up the building from the flat door at the bottom to the van at the top
  const top = 70;
  const bottom = 520;
  const rows = sh.zigs * 2;
  const left = 30 + landing / 2;
  const right = FIELD_W - 30 - landing / 2;
  // which side each landing sits on, and how far in and up, vary from building to building
  const sides = shuffle([0, 1], rng);
  const path: Pt[] = [];
  const at = (side: number) => Math.round(side === 0 ? left + rng() * 16 : right - rng() * 16);
  let side = sides[0];
  let x = at(side);
  path.push({ x, y: bottom });
  for (let r = 1; r <= rows; r++) {
    const y = Math.round(bottom - ((bottom - top) * r) / (rows + 1) + (rng() - 0.5) * 16);
    path.push({ x, y });
    side = 1 - side;
    x = at(side);
    path.push({ x, y });
  }
  path.push({ x, y: top });
  const st: SofaStage = { stage, path, hall: Math.round(sh.thick + sh.spare), landing, length: sh.length, thick: sh.thick, time: 999, par: 0 };
  const times = HUMAN_MOVERS.map((o) => pilot(st, o)).map((c) => (c.won ? c.t : 999)).sort((a, b) => a - b);
  st.time = Math.ceil(times[2] * 1.3 + 3);
  // par: the quickest of the human-like movers
  st.par = Math.ceil(Math.min(times[0], pilot(st).t));
  return st;
}

export const SOFA_STAGES: SofaStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
