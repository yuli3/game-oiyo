/**
 * Rink Resurface (빙판 정빙) — drive the resurfacer over the whole rink between skating sessions.
 *
 * Every couple of hours the outdoor rink closes for a few minutes while a resurfacing machine shaves the
 * scratched ice and lays a thin film of water that freezes glass-smooth. You drive it. It never stops rolling:
 * drag left or right to steer (it turns only so sharply), and it smooths a strip as wide as its blade. Deep
 * gouges from hockey stops need two passes. Bump the boards and it stalls for a moment. Smooth enough of the
 * rink before the skaters come back on.
 *
 * Pure and deterministic: every rink is seeded per stage.
 */

export const RINK_SLUG = "rink-resurface";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const CX = 180;
export const CY = 300;
export const RX = 150; // half width of the rink (a rounded rectangle)
export const RY = 230; // half height
export const CORNER = 70; // corner radius
export const CELL = 10; // px of ice per cell
export const STALL = 1.2; // s lost bumping the boards

export interface RinkStage {
  stage: number;
  speed: number; // px/s
  turn: number; // rad/s at full steer
  blade: number; // px wide
  gouges: number[]; // cells that need two passes
  time: number; // s until the skaters come back
  need: number; // share of the ice to smooth (0..1)
  par: number;
}

/** Whether a point is on the ice (inside the rounded rectangle, with the boards' thickness). */
export function onIce(x: number, y: number, margin = 0): boolean {
  const dx = Math.abs(x - CX) - (RX - CORNER);
  const dy = Math.abs(y - CY) - (RY - CORNER);
  const r = CORNER - margin;
  if (dx <= 0 && Math.abs(x - CX) <= RX - margin && Math.abs(y - CY) <= RY - margin) return Math.abs(y - CY) <= RY - margin;
  if (dy <= 0 && Math.abs(x - CX) <= RX - margin) return true;
  return dx > 0 && dy > 0 && dx * dx + dy * dy <= r * r;
}

export const COLS = Math.ceil((RX * 2) / CELL);
export const ROWS = Math.ceil((RY * 2) / CELL);
export const cellCentre = (i: number) => ({ x: CX - RX + ((i % COLS) + 0.5) * CELL, y: CY - RY + (Math.floor(i / COLS) + 0.5) * CELL });
/** The cells that are ice. */
export const ICE: number[] = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((i) => {
  const c = cellCentre(i);
  return onIce(c.x, c.y);
});

export interface Machine {
  stage: RinkStage;
  t: number;
  x: number;
  y: number;
  heading: number; // radians, 0 = right, −π/2 = up the rink
  stalled: number; // s left stalled
  passes: Uint8Array; // per cell
  done: number; // cells smoothed (counting gouges only after two passes)
  bumps: number;
  over: boolean;
  won: boolean;
}

export const needed = (st: RinkStage, cell: number) => (st.gouges.includes(cell) ? 2 : 1);

export function newMachine(stage: RinkStage): Machine {
  return { stage, t: 0, x: CX - RX + 40, y: CY + RY - 40, heading: -Math.PI / 2, stalled: 0, passes: new Uint8Array(COLS * ROWS), done: 0, bumps: 0, over: false, won: false };
}

export const coverage = (m: Machine) => m.done / ICE.length;

const gougeSet = new WeakMap<RinkStage, Set<number>>();
function isGouge(st: RinkStage, cell: number): boolean {
  let s = gougeSet.get(st);
  if (!s) {
    s = new Set(st.gouges);
    gougeSet.set(st, s);
  }
  return s.has(cell);
}

/** Smooths the cells under the blade at the machine's position (a pass counts once per visit). */
function shave(m: Machine, visited: Set<number>): void {
  const half = m.stage.blade / 2;
  // the blade is across the direction of travel, at the back of the machine
  const bx = m.x - Math.cos(m.heading) * 14;
  const by = m.y - Math.sin(m.heading) * 14;
  const c0 = Math.floor((bx - half - (CX - RX)) / CELL);
  const c1 = Math.floor((bx + half - (CX - RX)) / CELL);
  const r0 = Math.floor((by - half - (CY - RY)) / CELL);
  const r1 = Math.floor((by + half - (CY - RY)) / CELL);
  for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++)
    for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
      const i = r * COLS + c;
      if (visited.has(i)) continue;
      const p = cellCentre(i);
      // distance across the path (perpendicular to the heading) within half a blade
      const across = Math.abs(-(p.x - bx) * Math.sin(m.heading) + (p.y - by) * Math.cos(m.heading));
      const along = Math.abs((p.x - bx) * Math.cos(m.heading) + (p.y - by) * Math.sin(m.heading));
      if (across > half || along > CELL || !onIce(p.x, p.y)) continue;
      visited.add(i);
      const need = isGouge(m.stage, i) ? 2 : 1;
      if (m.passes[i] < need) {
        m.passes[i]++;
        if (m.passes[i] === need) m.done++;
      }
    }
}

export interface MachineEvents { bump: boolean; end: boolean }

/**
 * Advances by dt with the steer (−1 full left … +1 full right). Passing over a cell counts once per
 * continuous visit, so wiggling on the spot does not count twice.
 */
export function stepMachine(m: Machine, steer: number, dt: number, visited: Set<number>): MachineEvents {
  const ev: MachineEvents = { bump: false, end: false };
  if (m.over) return ev;
  m.t += dt;
  if (m.stalled > 0) {
    m.stalled = Math.max(0, m.stalled - dt);
  } else {
    m.heading += Math.max(-1, Math.min(1, steer)) * m.stage.turn * dt;
    const nx = m.x + Math.cos(m.heading) * m.stage.speed * dt;
    const ny = m.y + Math.sin(m.heading) * m.stage.speed * dt;
    if (!onIce(nx, ny, 16)) {
      // bump: stall, back off a touch and swing round toward the middle
      m.bumps++;
      m.stalled = STALL;
      m.heading = Math.atan2(CY - m.y, CX - m.x);
      ev.bump = true;
    } else {
      m.x = nx;
      m.y = ny;
      // a cell only counts again once the blade has left it
      const before = new Set(visited);
      visited.clear();
      shave(m, visited);
      for (const i of before) if (!visited.has(i)) visited.delete(i);
    }
  }
  if (coverage(m) >= m.stage.need) {
    m.over = true;
    m.won = true;
    ev.end = true;
  } else if (m.t >= m.stage.time) {
    m.over = true;
    ev.end = true;
  }
  return ev;
}

export function starsFor(m: Machine): number {
  if (!m.won) return 0;
  if (m.bumps === 0 && m.t <= m.stage.par * 1.2) return 3;
  if (m.bumps <= 1) return 2;
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

export interface DriverOpts {
  /** s the hands lag the eye */
  lag?: number;
  /** ± share of steering slop */
  slop?: number;
  /** px between lanes, as a share of the blade (1 = edge to edge) */
  overlap?: number;
  seed?: number;
  /** "laps" rounds the rink lap after lap, working inward; "circle" goes round one loop; "straight" never steers */
  mode?: "laps" | "circle" | "straight";
}

/** Laps round the rink, each a blade's width (less the overlap) further in, the way the machines go. */
function laps(st: RinkStage, overlap: number, start = 30): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const step = st.blade * overlap;
  for (let d = start; RX - d > 16 && RY - d > 16; d += step) {
    const hx = RX - d;
    const hy = RY - d;
    const r = Math.max(8, Math.min(hx, hy, CORNER - d + 30));
    // round the lap anticlockwise (up the left side first), in steps of about 24 px
    const per: Array<{ x: number; y: number }> = [];
    const corner = (cx: number, cy: number, a0: number) => {
      for (let k = 0; k <= 4; k++) {
        const a = a0 + (k / 4) * (Math.PI / 2);
        per.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    };
    const side = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 24));
      for (let k = 1; k < n; k++) per.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n });
    };
    side(CX - hx, CY + hy - r, CX - hx, CY - hy + r);
    corner(CX - hx + r, CY - hy + r, Math.PI);
    side(CX - hx + r, CY - hy, CX + hx - r, CY - hy);
    corner(CX + hx - r, CY - hy + r, -Math.PI / 2);
    side(CX + hx, CY - hy + r, CX + hx, CY + hy - r);
    corner(CX + hx - r, CY + hy - r, 0);
    side(CX + hx - r, CY + hy, CX - hx + r, CY + hy);
    corner(CX - hx + r, CY + hy - r, Math.PI / 2);
    pts.push(...per);
  }
  return pts;
}

export function pilot(stage: RinkStage, opts: DriverOpts = {}): Machine {
  const { lag = 0, slop = 0, overlap = 0.85, seed = 1, mode = "laps" } = opts;
  const rng = mulberry(seed * 7907);
  const m = newMachine(stage);
  const dt = 1 / 60;
  const visited = new Set<number>();
  const path = mode === "circle"
    ? Array.from({ length: 40 }, (_, k) => {
        const ring = 1;
        const a = -Math.PI / 2 + (k % 8) * (Math.PI / 4);
        return { x: CX + Math.cos(a) * (RX - 40) * ring, y: CY + Math.sin(a) * (RY - 40) * ring };
      })
    : [...laps(stage, overlap), ...laps(stage, overlap, 30 + (stage.blade * overlap) / 2)];
  let wp = 0;
  const history: number[] = [];
  const lagN = Math.round(lag / dt);
  let wobble = 0;
  while (!m.over) {
    let steer = 0;
    if (mode !== "straight" && wp < path.length) {
      const target = path[wp];
      // move on once it is reached, or once it has slipped behind (rather than circling back for it)
      const ahead = (target.x - m.x) * Math.cos(m.heading) + (target.y - m.y) * Math.sin(m.heading);
      if (Math.hypot(target.x - m.x, target.y - m.y) < 18 || (ahead < 0 && Math.hypot(target.x - m.x, target.y - m.y) < 60)) wp++;
      const want = Math.atan2(target.y - m.y, target.x - m.x);
      let diff = want - m.heading;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      // a driver who reacts late steers more gently, or they would weave
      steer = Math.max(-1, Math.min(1, (diff * 3) / (1 + lag * 10)));
    }
    if (Math.floor(m.t * 2) !== Math.floor((m.t - dt) * 2)) wobble = (rng() * 2 - 1) * slop;
    history.push(steer + wobble);
    const applied = history.length > lagN ? history[history.length - 1 - lagN] : 0;
    stepMachine(m, applied, dt, visited);
    if (mode !== "straight" && wp >= path.length) wp = 0;
  }
  return m;
}

function shape(stage: number) {
  return {
    speed: 70 + stage * 1.5,
    turn: (70 + stage * 1.5) / (26 + stage * 0.25),
    blade: Math.max(28, 44 - stage * 0.5),
    gouges: Math.floor(stage * 0.8),
    need: Math.min(0.82, 0.68 + stage * 0.005),
  };
}

/** Human-like drivers used to set the clock: a beat late on the steering and a little loose. */
export const HUMAN_DRIVERS: DriverOpts[] = [1, 2, 3, 4, 5].map((seed) => ({ lag: 0.12, slop: 0.2, overlap: 0.8, seed }));

export function buildStage(stage: number): RinkStage {
  const sh = shape(stage);
  const rng = mulberry(141100 + stage * 101);
  const gouges: number[] = [];
  while (gouges.length < sh.gouges) {
    const c = ICE[Math.floor(rng() * ICE.length)];
    if (!gouges.includes(c)) gouges.push(c);
  }
  const st: RinkStage = { stage, speed: sh.speed, turn: sh.turn, blade: sh.blade, gouges, time: 999, need: sh.need, par: 0 };
  // the mark: a little under what one careful round of laps smooths
  const probe: RinkStage = { ...st, need: 1, time: 0 };
  const visited = new Set<number>();
  const m = newMachine(probe);
  const route = laps(probe, 0.85);
  let wp = 0;
  while (wp < route.length && m.t < 400) {
    const target = route[wp];
    if (Math.hypot(target.x - m.x, target.y - m.y) < 18) wp++;
    let diff = Math.atan2(target.y - m.y, target.x - m.x) - m.heading;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    m.stage.time = m.t + 1;
    stepMachine(m, Math.max(-1, Math.min(1, diff * 3)), 1 / 60, visited);
  }
  st.need = Math.min(sh.need, Math.floor(coverage(m) * 0.93 * 100) / 100);
  st.par = Math.ceil(pilot(st).t);
  const human = HUMAN_DRIVERS.map((o) => pilot(st, o).t).sort((a, b) => a - b);
  st.time = Math.ceil(human[Math.floor(human.length / 2)] * 1.2 + 3);
  return st;
}

export const RINK_STAGES: RinkStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
