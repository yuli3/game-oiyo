/**
 * 손가락 에어하키 (Finger Air Hockey) — an OIYO original table game for one phone.
 * Drag your mallet in your half of the table and knock the puck into the other goal.
 * Play the computer through 12 tables (bumpers, ice, a sliding gate, two pucks, wind…)
 * or put the phone flat between two friends: bottom half is Red, top half is Blue.
 */
export const HOCKEY_SLUG = "finger-hockey";
export const TABLE_W = 300;
export const TABLE_H = 520;
export const MALLET_R = 24;
export const PUCK_R = 13;
export const GOALS_TO_WIN = 5;
/** A match lasts this long (or until someone reaches GOALS_TO_WIN); a tie then plays golden-goal overtime. */
export const MATCH_SECONDS = 90;
export const OVERTIME_SECONDS = 30;
const MAX_PUCK = 900;
const MALLET_SPEED = 1500; // px/s a finger-driven mallet can move
const CPU_SPEED_SCALE = 1.6;

export interface Circle { x: number; y: number; r: number }

export interface Table {
  id: string;
  goal: number; // goal mouth width
  friction: number; // per second velocity decay factor (fraction kept after 1s)
  bumpers: Circle[];
  gate: boolean; // a sliding block across the centre line
  pucks: number;
  wind: number; // sideways push, px/s²
  cpu: { speed: number; reaction: number; aim: number }; // computer skill
}

export const TABLES: readonly Table[] = [
  { id: "basic", goal: 120, friction: 0.75, bumpers: [], gate: false, pucks: 1, wind: 0, cpu: { speed: 380, reaction: 0.22, aim: 0.35 } },
  { id: "wide", goal: 150, friction: 0.75, bumpers: [], gate: false, pucks: 1, wind: 0, cpu: { speed: 430, reaction: 0.2, aim: 0.4 } },
  { id: "posts", goal: 120, friction: 0.75, bumpers: [{ x: 90, y: 260, r: 16 }, { x: 210, y: 260, r: 16 }], gate: false, pucks: 1, wind: 0, cpu: { speed: 470, reaction: 0.19, aim: 0.45 } },
  { id: "ice", goal: 110, friction: 0.93, bumpers: [], gate: false, pucks: 1, wind: 0, cpu: { speed: 500, reaction: 0.18, aim: 0.5 } },
  { id: "narrow", goal: 90, friction: 0.75, bumpers: [], gate: false, pucks: 1, wind: 0, cpu: { speed: 520, reaction: 0.17, aim: 0.55 } },
  { id: "gate", goal: 120, friction: 0.78, bumpers: [], gate: true, pucks: 1, wind: 0, cpu: { speed: 540, reaction: 0.16, aim: 0.55 } },
  { id: "pinball", goal: 115, friction: 0.8, bumpers: [{ x: 150, y: 170, r: 14 }, { x: 75, y: 260, r: 14 }, { x: 225, y: 260, r: 14 }, { x: 150, y: 350, r: 14 }], gate: false, pucks: 1, wind: 0, cpu: { speed: 560, reaction: 0.15, aim: 0.6 } },
  { id: "double", goal: 120, friction: 0.78, bumpers: [], gate: false, pucks: 2, wind: 0, cpu: { speed: 580, reaction: 0.15, aim: 0.6 } },
  { id: "windy", goal: 115, friction: 0.82, bumpers: [], gate: false, pucks: 1, wind: 140, cpu: { speed: 600, reaction: 0.14, aim: 0.65 } },
  { id: "icegate", goal: 105, friction: 0.92, bumpers: [], gate: true, pucks: 1, wind: 0, cpu: { speed: 620, reaction: 0.13, aim: 0.65 } },
  { id: "chaos", goal: 115, friction: 0.82, bumpers: [{ x: 70, y: 200, r: 14 }, { x: 230, y: 320, r: 14 }], gate: false, pucks: 2, wind: 0, cpu: { speed: 650, reaction: 0.12, aim: 0.7 } },
  { id: "final", goal: 95, friction: 0.88, bumpers: [{ x: 150, y: 140, r: 12 }, { x: 150, y: 380, r: 12 }], gate: true, pucks: 1, wind: 0, cpu: { speed: 700, reaction: 0.1, aim: 0.75 } },
];
export const TABLE_COUNT = TABLES.length;

export interface Body { x: number; y: number; vx: number; vy: number }

export interface Match {
  table: number;
  mallets: [Body, Body]; // 0 = bottom (Red / you), 1 = top (Blue / computer)
  targets: [{ x: number; y: number }, { x: number; y: number }];
  pucks: Body[];
  score: [number, number];
  time: number;
  pause: number; // seconds left before play resumes after a goal
  serveTo: 0 | 1;
  idle: number[]; // seconds each puck has been slow
  cpuThink: number;
  rng: number;
}

export function gateX(t: number): number {
  return TABLE_W / 2 + Math.sin(t * 1.1) * (TABLE_W / 2 - 50);
}
export const GATE_HALF = 34;
export const GATE_THICK = 8;

function rand(m: Match): number {
  // small LCG kept in the match so runs are deterministic
  m.rng = (m.rng * 1664525 + 1013904223) >>> 0;
  return m.rng / 4294967296;
}

function servePucks(m: Match, to: 0 | 1): void {
  const t = TABLES[m.table];
  m.pucks = [];
  for (let k = 0; k < t.pucks; k++) {
    const x = t.pucks === 1 ? TABLE_W / 2 : TABLE_W / 2 + (k ? 60 : -60);
    m.pucks.push({ x, y: TABLE_H / 2 + (to === 0 ? 40 : -40), vx: 0, vy: 0 });
  }
  m.idle = m.pucks.map(() => 0);
  m.serveTo = to;
}

export function newMatch(table: number, seed = 1): Match {
  const m: Match = {
    table: Math.max(0, Math.min(TABLE_COUNT - 1, table)),
    mallets: [{ x: TABLE_W / 2, y: TABLE_H - 70, vx: 0, vy: 0 }, { x: TABLE_W / 2, y: 70, vx: 0, vy: 0 }],
    targets: [{ x: TABLE_W / 2, y: TABLE_H - 70 }, { x: TABLE_W / 2, y: 70 }],
    pucks: [],
    score: [0, 0],
    time: 0,
    pause: 0.8,
    serveTo: 0,
    idle: [],
    cpuThink: 0,
    rng: (seed * 2654435761) >>> 0,
  };
  servePucks(m, seed % 2 ? 0 : 1);
  return m;
}

/** Clamp a mallet target into its owner's half. */
export function clampTarget(side: 0 | 1, x: number, y: number): { x: number; y: number } {
  const cx = Math.max(MALLET_R, Math.min(TABLE_W - MALLET_R, x));
  const lo = side === 0 ? TABLE_H / 2 + MALLET_R : MALLET_R;
  const hi = side === 0 ? TABLE_H - MALLET_R : TABLE_H / 2 - MALLET_R;
  return { x: cx, y: Math.max(lo, Math.min(hi, y)) };
}

export function setTarget(m: Match, side: 0 | 1, x: number, y: number): void {
  m.targets[side] = clampTarget(side, x, y);
}

/** Simple computer player: defend between puck and goal, strike when the puck is in reach. */
export function cpuTarget(m: Match, side: 0 | 1, skill: Table["cpu"]): { x: number; y: number } {
  const own = side === 1 ? 0 : TABLE_H; // own goal line
  const dir = side === 1 ? 1 : -1; // direction toward the opponent
  const mal = m.mallets[side];
  // pick the most dangerous puck: closest to our goal
  let p = m.pucks[0];
  for (const q of m.pucks) if (Math.abs(q.y - own) < Math.abs(p.y - own)) p = q;
  const inHalf = side === 1 ? p.y < TABLE_H / 2 : p.y > TABLE_H / 2;
  const coming = (p.vy * dir) < 0;
  const homeY = own + dir * 60;
  if (inHalf && (!coming || Math.abs(p.vy) < 260)) {
    // strike: get behind the puck on the line to the aim point, then drive through it
    const goalW = TABLES[m.table].goal;
    const corner = (rand(m) < 0.5 ? -1 : 1) * goalW * 0.3;
    const aimX = TABLE_W / 2 + corner + (rand(m) - 0.5) * (TABLE_W - 40) * (1 - skill.aim);
    const aimY = side === 1 ? TABLE_H : 0;
    let ux = aimX - p.x;
    let uy = aimY - p.y;
    const ud = Math.hypot(ux, uy) || 1;
    ux /= ud;
    uy /= ud;
    const reach = MALLET_R + PUCK_R;
    const relX = mal.x - p.x;
    const relY = mal.y - p.y;
    const along = relX * ux + relY * uy; // negative = behind the puck
    const across = Math.abs(relX * -uy + relY * ux);
    if (along < -reach * 0.5 && across < reach * 0.8) {
      return clampTarget(side, p.x + ux * 45, p.y + uy * 45);
    }
    const bx = p.x - ux * (reach + 8);
    const by = p.y - uy * (reach + 8);
    if (along > -reach * 0.5) {
      // we are level with or in front of the puck: swing round it on the side we are on
      const sideSign = relX * -uy + relY * ux >= 0 ? 1 : -1;
      return clampTarget(side, bx + -uy * sideSign * (reach + 10), by + ux * sideSign * (reach + 10));
    }
    return clampTarget(side, bx, by);
  }
  // defend: stand on the line from the puck to the middle of our goal
  const gx = TABLE_W / 2;
  const t = Math.min(1, 60 / Math.max(1, Math.abs(p.y - own)));
  return clampTarget(side, gx + (p.x - gx) * (0.55 + t * 0.3), homeY);
}

function collideCircle(p: Body, c: { x: number; y: number; r: number; vx?: number; vy?: number }, bounce: number): boolean {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = PUCK_R + c.r;
  if (d >= min || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  p.x = c.x + nx * min;
  p.y = c.y + ny * min;
  const rvx = p.vx - (c.vx ?? 0);
  const rvy = p.vy - (c.vy ?? 0);
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    p.vx -= (1 + bounce) * vn * nx;
    p.vy -= (1 + bounce) * vn * ny;
  }
  return true;
}

export interface StepEvents { hit: boolean; wall: boolean; goal: 0 | 1 | null }

/**
 * Advance the match. `cpuSides` lists sides the computer drives.
 * Returns what happened, for sound and haptics.
 */
export function stepMatch(m: Match, dt: number, cpuSides: ReadonlyArray<0 | 1> = [1]): StepEvents {
  const ev: StepEvents = { hit: false, wall: false, goal: null };
  if (matchWinner(m) !== null) return ev;
  const t = TABLES[m.table];
  m.time += dt;
  m.cpuThink -= dt;
  if (m.cpuThink <= 0) {
    m.cpuThink = t.cpu.reaction;
    for (const s of cpuSides) m.targets[s] = cpuTarget(m, s, t.cpu);
  }
  // mallets chase their targets
  m.mallets.forEach((mal, s) => {
    const tgt = m.targets[s];
    const maxSpeed = cpuSides.includes(s as 0 | 1) ? t.cpu.speed * CPU_SPEED_SCALE : MALLET_SPEED;
    const dx = tgt.x - mal.x;
    const dy = tgt.y - mal.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, maxSpeed * dt);
    const nx = d ? (dx / d) * step : 0;
    const ny = d ? (dy / d) * step : 0;
    mal.vx = nx / dt;
    mal.vy = ny / dt;
    mal.x += nx;
    mal.y += ny;
  });
  if (m.pause > 0) {
    m.pause -= dt;
    return ev;
  }
  const keep = Math.pow(t.friction, dt);
  const gx = gateX(m.time);
  m.pucks.forEach((p, k) => {
    p.vx += t.wind * Math.sin(m.time * 0.5) * dt;
    p.vx *= keep;
    p.vy *= keep;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAX_PUCK) { p.vx *= MAX_PUCK / sp; p.vy *= MAX_PUCK / sp; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // side walls
    if (p.x < PUCK_R) { p.x = PUCK_R; p.vx = Math.abs(p.vx) * 0.9; ev.wall = true; }
    if (p.x > TABLE_W - PUCK_R) { p.x = TABLE_W - PUCK_R; p.vx = -Math.abs(p.vx) * 0.9; ev.wall = true; }
    // end walls and goals
    const inMouth = Math.abs(p.x - TABLE_W / 2) < t.goal / 2 - PUCK_R * 0.3;
    if (p.y < PUCK_R) {
      if (inMouth && p.y < -PUCK_R) { ev.goal = 0; return; }
      if (!inMouth) { p.y = PUCK_R; p.vy = Math.abs(p.vy) * 0.9; ev.wall = true; }
    }
    if (p.y > TABLE_H - PUCK_R) {
      if (inMouth && p.y > TABLE_H + PUCK_R) { ev.goal = 1; return; }
      if (!inMouth) { p.y = TABLE_H - PUCK_R; p.vy = -Math.abs(p.vy) * 0.9; ev.wall = true; }
    }
    for (const b of t.bumpers) if (collideCircle(p, b, 0.95)) ev.wall = true;
    if (t.gate) {
      // the gate is a short bar on the centre line; treat it as two round ends plus a flat middle
      const top = TABLE_H / 2 - GATE_THICK / 2 - PUCK_R;
      const bottom = TABLE_H / 2 + GATE_THICK / 2 + PUCK_R;
      if (Math.abs(p.x - gx) < GATE_HALF && p.y > top && p.y < bottom) {
        if (p.vy > 0) { p.y = top; p.vy = -Math.abs(p.vy) * 0.9; } else { p.y = bottom; p.vy = Math.abs(p.vy) * 0.9; }
        ev.wall = true;
      }
    }
    m.mallets.forEach((mal) => {
      if (collideCircle(p, { x: mal.x, y: mal.y, r: MALLET_R, vx: mal.vx, vy: mal.vy }, 0.85)) {
        ev.hit = true;
        // a mallet always sends the puck at least a little
        const s = Math.hypot(p.vx, p.vy);
        const ms = Math.hypot(mal.vx, mal.vy);
        if (ms > 150 && s < ms * 1.6) {
          const k2 = (ms * 1.6) / (s || 1);
          p.vx *= k2;
          p.vy *= k2;
        } else if (s < 140) {
          const dx = p.x - mal.x;
          const dy = p.y - mal.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx = (dx / d) * 140;
          p.vy = (dy / d) * 140;
        }
      }
    });
    // pucks bump each other
    for (let j = k + 1; j < m.pucks.length; j++) {
      const q = m.pucks[j];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < PUCK_R * 2) {
        const nx = dx / d;
        const ny = dy / d;
        const push = (PUCK_R * 2 - d) / 2;
        p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
        const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (rv < 0) { p.vx += rv * nx; p.vy += rv * ny; q.vx -= rv * nx; q.vy -= rv * ny; }
      }
    }
    // a puck parked out of reach gets nudged back to the middle
    m.idle[k] = Math.hypot(p.vx, p.vy) < 25 ? m.idle[k] + dt : 0;
    if (m.idle[k] > 4) {
      p.x = TABLE_W / 2;
      p.y = TABLE_H / 2 + (p.y > TABLE_H / 2 ? -40 : 40); // hand it to the other side
      p.vx = 0;
      p.vy = 0;
      m.idle[k] = 0;
    }
  });
  if (ev.goal !== null) {
    m.score[ev.goal] += 1;
    m.pause = 1.1;
    servePucks(m, ev.goal === 0 ? 1 : 0); // the side that conceded serves
  }
  return ev;
}

/** 0 or 1 when someone has won, 2 for a draw after overtime, null while playing. */
export function matchWinner(m: Match): 0 | 1 | 2 | null {
  if (m.score[0] >= GOALS_TO_WIN) return 0;
  if (m.score[1] >= GOALS_TO_WIN) return 1;
  if (m.time >= MATCH_SECONDS) {
    if (m.score[0] !== m.score[1]) return m.score[0] > m.score[1] ? 0 : 1;
    if (m.time >= MATCH_SECONDS + OVERTIME_SECONDS) return 2;
  }
  return null;
}

export function timeLeft(m: Match): number {
  return m.time < MATCH_SECONDS ? MATCH_SECONDS - m.time : Math.max(0, MATCH_SECONDS + OVERTIME_SECONDS - m.time);
}

export function inOvertime(m: Match): boolean {
  return m.time >= MATCH_SECONDS;
}

/** Plays a whole match with the given drivers (tests). */
export function simulate(table: number, seed: number, bottom: "cpu" | "idle" | { speed: number; reaction: number; aim: number }, maxSeconds = 300): Match {
  const m = newMatch(table, seed);
  const dt = 1 / 60;
  let think = 0;
  for (let f = 0; f < maxSeconds * 60 && matchWinner(m) === null; f++) {
    if (bottom === "idle") stepMatch(m, dt, [1]);
    else if (bottom === "cpu") stepMatch(m, dt, [0, 1]);
    else {
      think -= dt;
      if (think <= 0) { think = bottom.reaction; m.targets[0] = cpuTarget(m, 0, bottom); }
      stepMatch(m, dt, [1]);
    }
  }
  return m;
}
