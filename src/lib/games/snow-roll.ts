/**
 * 눈덩이 굴리기 (Snowball Roll) — an OIYO original snowman-building race in a snowy yard.
 * Hold and drag to push a little snowball: it picks up the fresh snow it rolls over (leaving a
 * bare trail) and grows, heavier and slower as it goes. Mud makes it lose snow, rocks and fences
 * stop it. Grow the body big enough and park it on the snowman spot; from stage 11 roll a second
 * ball for the head and lift it onto the body — but a head that grows too big cannot be lifted.
 * Every stage is generated and kept only if an autopilot builds the snowman in time.
 */

import { mulberry } from "./pixel-kit";

export const ROLL_SLUG = "snow-roll";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const CELL = 12;
export const COLS = FIELD_W / CELL; // 30
export const ROWS = Math.ceil(FIELD_H / CELL); // 47
export const R0 = 7; // radius of a fresh ball
export const GAIN = 0.3; // volume per cell-length of full snow
export const SPOT_R = 22;

export interface Rock { x: number; y: number; r: number }
export interface Fence { x: number; y: number; w: number; h: number }
export interface Mud { x: number; y: number; r: number }

export interface RollLevel {
  stage: number;
  snow: number[]; // depth per cell, row-major
  rocks: Rock[];
  fences: Fence[];
  mud: Mud[];
  start: { x: number; y: number };
  spot: { x: number; y: number };
  body: number; // radius the body must reach
  head: null | { start: { x: number; y: number }; min: number; max: number };
  timeLimit: number;
  par: number;
}

export interface Ball { x: number; y: number; vx: number; vy: number; vol: number }

export interface Roll {
  level: RollLevel;
  snow: Float32Array;
  time: number;
  ball: Ball;
  phase: "body" | "head" | "done";
  bodyR: number; // radius of the parked body
  finger: null | { x: number; y: number };
  over: boolean;
  won: boolean;
  cause: "" | "time" | "big";
}

export const radiusOf = (vol: number): number => R0 * Math.cbrt(vol);

export function maxSpeed(r: number): number {
  return 170 * Math.pow(R0 / r, 0.35);
}

function newBall(x: number, y: number): Ball {
  return { x, y, vx: 0, vy: 0, vol: 1 };
}

export function newRoll(level: RollLevel): Roll {
  return { level, snow: Float32Array.from(level.snow), time: 0, ball: newBall(level.start.x, level.start.y), phase: "body", bodyR: 0, finger: null, over: false, won: false, cause: "" };
}

/** Where the finger is (null when lifted). The ball rolls toward it. */
export function steer(s: Roll, x: number | null, y = 0): void {
  s.finger = x === null ? null : { x: Math.max(0, Math.min(FIELD_W, x)), y: Math.max(0, Math.min(FIELD_H, y)) };
}

export function ballR(s: Roll): number {
  return radiusOf(s.ball.vol);
}

export function snowAt(s: Pick<Roll, "snow">, x: number, y: number): number {
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 0;
  return s.snow[r * COLS + c];
}

export interface RollEvents { grew: number; bump: boolean; mud: boolean; parked: boolean; placed: boolean; big: boolean; time: boolean }

function collide(level: RollLevel, b: Ball, r: number): boolean {
  let hit = false;
  // yard edges
  if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.3; hit = true; }
  if (b.x > FIELD_W - r) { b.x = FIELD_W - r; b.vx = -Math.abs(b.vx) * 0.3; hit = true; }
  if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * 0.3; hit = true; }
  if (b.y > FIELD_H - r) { b.y = FIELD_H - r; b.vy = -Math.abs(b.vy) * 0.3; hit = true; }
  for (const k of level.rocks) {
    const dx = b.x - k.x;
    const dy = b.y - k.y;
    const d = Math.hypot(dx, dy);
    if (d < k.r + r && d > 0) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = k.x + nx * (k.r + r);
      b.y = k.y + ny * (k.r + r);
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= 1.3 * dot * nx; b.vy -= 1.3 * dot * ny; }
      hit = true;
    }
  }
  for (const f of level.fences) {
    const cx = Math.max(f.x, Math.min(f.x + f.w, b.x));
    const cy = Math.max(f.y, Math.min(f.y + f.h, b.y));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < r) {
      const nx = d > 0 ? dx / d : 0;
      const ny = d > 0 ? dy / d : -1;
      b.x = cx + nx * r;
      b.y = cy + ny * r;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= 1.3 * dot * nx; b.vy -= 1.3 * dot * ny; }
      hit = true;
    }
  }
  return hit;
}

export function stepRoll(s: Roll, dt: number): RollEvents {
  const ev: RollEvents = { grew: 0, bump: false, mud: false, parked: false, placed: false, big: false, time: false };
  if (s.over) return ev;
  const l = s.level;
  s.time += dt;
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  // the finger is read once per frame; the ball chases it over the substeps
  const f = s.finger;
  for (let k = 0; k < n; k++) {
    const b = s.ball;
    const r = radiusOf(b.vol);
    const vmax = maxSpeed(r);
    if (f) {
      let wx = (f.x - b.x) * 4;
      let wy = (f.y - b.y) * 4;
      const wl = Math.hypot(wx, wy);
      if (wl > vmax) { wx *= vmax / wl; wy *= vmax / wl; }
      const a = Math.min(1, h * 6);
      b.vx += (wx - b.vx) * a;
      b.vy += (wy - b.vy) * a;
    } else {
      const damp = Math.exp(-2.5 * h);
      b.vx *= damp;
      b.vy *= damp;
    }
    const ox = b.x;
    const oy = b.y;
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (collide(l, b, r)) ev.bump = true;
    const m = Math.hypot(b.x - ox, b.y - oy);
    if (m <= 0) continue;
    // pick up the snow under the contact patch
    const c = Math.max(5, r * 0.55);
    const c0 = Math.max(0, Math.floor((b.x - c) / CELL));
    const c1 = Math.min(COLS - 1, Math.floor((b.x + c) / CELL));
    const r0 = Math.max(0, Math.floor((b.y - c) / CELL));
    const r1 = Math.min(ROWS - 1, Math.floor((b.y + c) / CELL));
    let got = 0;
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const px = cc * CELL + CELL / 2;
      const py = rr * CELL + CELL / 2;
      if (Math.hypot(px - b.x, py - b.y) > c + CELL * 0.35) continue;
      const i = rr * COLS + cc;
      const take = Math.min(s.snow[i], (m / CELL) * 0.6);
      if (take <= 0) continue;
      s.snow[i] -= take;
      got += take;
    }
    b.vol += got * GAIN;
    ev.grew += got * GAIN;
    for (const md of l.mud) {
      if (Math.hypot(md.x - b.x, md.y - b.y) < md.r) {
        b.vol = Math.max(1, b.vol - m * 0.015 * Math.sqrt(b.vol));
        ev.mud = true;
      }
    }
  }
  const b = s.ball;
  const r = radiusOf(b.vol);
  const spd = Math.hypot(b.vx, b.vy);
  if (s.phase === "body") {
    if (r >= l.body && Math.hypot(b.x - l.spot.x, b.y - l.spot.y) < SPOT_R && spd < 90) {
      s.bodyR = r;
      ev.parked = true;
      if (l.head) {
        s.phase = "head";
        s.ball = newBall(l.head.start.x, l.head.start.y);
      } else {
        s.phase = "done";
        s.over = true;
        s.won = true;
      }
    }
  } else if (s.phase === "head" && l.head) {
    if (r > l.head.max) {
      s.over = true;
      s.cause = "big";
      ev.big = true;
    } else if (r >= l.head.min && Math.hypot(b.x - l.spot.x, b.y - l.spot.y) < s.bodyR * 0.6) {
      ev.placed = true;
      s.phase = "done";
      s.over = true;
      s.won = true;
    }
  }
  if (!s.over && s.time >= l.timeLimit) {
    s.over = true;
    s.cause = "time";
    ev.time = true;
  }
  return ev;
}

export function starsFor(s: Roll): number {
  if (!s.won) return 0;
  if (s.time <= s.level.par * 1.25 + 3) return 3;
  if (s.time <= s.level.par * 1.6 + 6) return 2;
  return 1;
}

// ─── Autopilot (used to build and check every stage) ────────────────────────

function blocked(level: RollLevel, r: number): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
    const x = cc * CELL + CELL / 2;
    const y = rr * CELL + CELL / 2;
    let bad = x < r || y < r || x > FIELD_W - r || y > FIELD_H - r;
    for (const k of level.rocks) if (Math.hypot(x - k.x, y - k.y) < k.r + r + 2) bad = true;
    for (const f of level.fences) {
      const cx = Math.max(f.x, Math.min(f.x + f.w, x));
      const cy = Math.max(f.y, Math.min(f.y + f.h, y));
      if (Math.hypot(x - cx, y - cy) < r + 2) bad = true;
    }
    g[rr * COLS + cc] = bad ? 1 : 0;
  }
  return g;
}

/** Dijkstra over the cell grid from `from`; `cost` adds to each step into a cell. Returns the path to the best goal. */
function plan(level: RollLevel, s: Roll, r: number, goal: (i: number, dist: number) => number, cost: (i: number) => number): number[] | null {
  const g = blocked(level, r);
  const start = Math.min(ROWS - 1, Math.max(0, Math.floor(s.ball.y / CELL))) * COLS + Math.min(COLS - 1, Math.max(0, Math.floor(s.ball.x / CELL)));
  const dist = new Float64Array(COLS * ROWS).fill(Infinity);
  const from = new Int32Array(COLS * ROWS).fill(-1);
  const done = new Uint8Array(COLS * ROWS);
  dist[start] = 0;
  let best = -1;
  let bestScore = -Infinity;
  // binary heap of [distance, cell]
  const hd: number[] = [0];
  const hc: number[] = [start];
  const pushH = (d: number, c: number) => {
    hd.push(d); hc.push(c);
    let i = hd.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hd[p] <= hd[i]) break;
      [hd[p], hd[i]] = [hd[i], hd[p]];
      [hc[p], hc[i]] = [hc[i], hc[p]];
      i = p;
    }
  };
  const popH = (): number => {
    const top = hc[0];
    const ld = hd.pop() as number;
    const lc = hc.pop() as number;
    if (hd.length) {
      hd[0] = ld; hc[0] = lc;
      let i = 0;
      for (;;) {
        const a = 2 * i + 1;
        const b = a + 1;
        let m = i;
        if (a < hd.length && hd[a] < hd[m]) m = a;
        if (b < hd.length && hd[b] < hd[m]) m = b;
        if (m === i) break;
        [hd[m], hd[i]] = [hd[i], hd[m]];
        [hc[m], hc[i]] = [hc[i], hc[m]];
        i = m;
      }
    }
    return top;
  };
  while (hc.length) {
    const u = popH();
    if (done[u]) continue;
    const ud = dist[u];
    done[u] = 1;
    const sc = goal(u, ud);
    if (sc > bestScore) { bestScore = sc; best = u; }
    const ux = u % COLS;
    const uy = Math.floor(u / COLS);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = ux + dx;
      const ny = uy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const v = ny * COLS + nx;
      if (g[v] && v !== start) continue;
      const nd = ud + Math.hypot(dx, dy) * (1 + cost(v));
      if (nd < dist[v]) { dist[v] = nd; from[v] = u; pushH(nd, v); }
    }
  }
  if (best < 0 || bestScore === -Infinity) return null;
  const path: number[] = [];
  for (let k = best; k !== -1; k = from[k]) path.push(k);
  return path.reverse();
}

const center = (i: number) => ({ x: (i % COLS) * CELL + CELL / 2, y: Math.floor(i / COLS) * CELL + CELL / 2 });

/**
 * Plays a stage: while growing it heads for the snowiest reachable ground, then rolls to the spot
 * (for the head, it avoids fresh snow so the head stays small enough). `jitter` (0..1) aims the
 * finger sloppily and slows the reactions, like a hurried player.
 */
export function pilotRun(level: RollLevel, jitter: number, seed: number, maxTime = 240, greedyHead = false): Roll {
  const s = newRoll({ ...level, timeLimit: Math.min(level.timeLimit, maxTime) });
  const rng = mulberry(seed);
  const dt = 1 / 60;
  let path: number[] = [];
  let replan = 0;
  let wob = { x: 0, y: 0 };
  while (!s.over) {
    const r = ballR(s);
    const growing = s.phase === "body" ? r < level.body * 1.03 : r < (level.head ? (greedyHead ? level.body : (level.head.min * 0.4 + level.head.max * 0.6)) : 0);
    if ((replan -= dt) <= 0 || !path.length) {
      replan = 0.3 + jitter * 0.3;
      if (growing) {
        path = plan(level, s, r, (i, d) => {
          const p = center(i);
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += snowAt(s, p.x + dx * CELL, p.y + dy * CELL);
          return sum < 1.5 || d < 3 ? -Infinity : sum / (d + 6);
        }, () => 0) ?? [];
      } else {
        const target = level.spot;
        path = plan(level, s, r, (i, d) => {
          const p = center(i);
          return -Math.hypot(p.x - target.x, p.y - target.y) * 1000 - d;
        }, (i) => (s.phase === "head" ? s.snow[i] * 6 : 0)) ?? [];
      }
      if (jitter > 0) wob = { x: (rng() - 0.5) * jitter * 14, y: (rng() - 0.5) * jitter * 14 };
    }
    // aim a couple of cells along the path; the last stretch goes straight for the spot
    while (path.length > 1) {
      const p = center(path[0]);
      if (Math.hypot(p.x - s.ball.x, p.y - s.ball.y) < CELL * 0.9) path.shift();
      else break;
    }
    let aim = path.length ? center(path[Math.min(path.length - 1, 1)]) : { x: s.ball.x, y: s.ball.y };
    if (!growing && Math.hypot(level.spot.x - s.ball.x, level.spot.y - s.ball.y) < 40) aim = level.spot;
    const near = !growing && Math.hypot(level.spot.x - s.ball.x, level.spot.y - s.ball.y) < 26;
    steer(s, aim.x + (near ? 0 : wob.x), aim.y + (near ? 0 : wob.y));
    stepRoll(s, dt);
  }
  return s;
}

// ─── Stages ─────────────────────────────────────────────────────────────────

function shape(stage: number) {
  const twoBalls = stage >= 10;
  return {
    body: twoBalls ? 24 + Math.min(8, (stage - 10) * 0.4) : 20 + stage * 1.2,
    headMin: 0.5 + Math.min(0.1, (stage - 10) * 0.006),
    headMax: 0.8 - Math.min(0.08, (stage - 10) * 0.005),
    bare: 2 + Math.floor(stage / 3),
    rocks: stage < 2 ? 0 : Math.min(6, 1 + Math.floor(stage / 5)),
    fences: stage < 6 ? 0 : Math.min(3, 1 + Math.floor((stage - 6) / 8)),
    mud: stage < 5 ? 0 : Math.min(4, 1 + Math.floor((stage - 5) / 6)),
    thin: Math.min(0.5, stage * 0.018),
    twoBalls,
    slack: Math.max(1.35, 2.1 - stage * 0.025),
  };
}

export function buildLevel(stage: number): RollLevel {
  const sh = shape(stage);
  const rng = mulberry(8800 + stage * 113);
  for (let attempt = 0; attempt < 400; attempt++) {
    const snow = new Array<number>(COLS * ROWS).fill(1);
    // thinner snow in later stages, with bare patches where the sun got in
    for (let i = 0; i < snow.length; i++) snow[i] = 1 - sh.thin * rng();
    const bareAt: Array<{ x: number; y: number; r: number }> = [];
    for (let k = 0; k < sh.bare; k++) bareAt.push({ x: rng() * FIELD_W, y: rng() * FIELD_H, r: 24 + rng() * 40 });
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const x = cc * CELL + CELL / 2;
      const y = rr * CELL + CELL / 2;
      if (bareAt.some((b) => Math.hypot(b.x - x, b.y - y) < b.r)) snow[rr * COLS + cc] = 0;
    }
    const spot = { x: 60 + rng() * 240, y: 80 + rng() * 120 };
    const start = { x: 40 + rng() * 280, y: FIELD_H - 50 - rng() * 60 };
    const rocks: Rock[] = [];
    for (let k = 0; k < sh.rocks; k++) {
      for (let tries = 0; tries < 40; tries++) {
        const rk = { x: 30 + rng() * 300, y: 60 + rng() * 440, r: 12 + rng() * 10 };
        if (Math.hypot(rk.x - spot.x, rk.y - spot.y) < rk.r + 60 || Math.hypot(rk.x - start.x, rk.y - start.y) < rk.r + 40) continue;
        if (rocks.some((o) => Math.hypot(o.x - rk.x, o.y - rk.y) < o.r + rk.r + 50)) continue;
        rocks.push(rk);
        break;
      }
    }
    const fences: Fence[] = [];
    for (let k = 0; k < sh.fences; k++) {
      const horiz = rng() < 0.6;
      const f = horiz ? { x: 20 + rng() * 180, y: 230 + rng() * 200, w: 90 + rng() * 60, h: 8 } : { x: 60 + rng() * 240, y: 220 + rng() * 140, w: 8, h: 90 + rng() * 60 };
      fences.push(f);
    }
    const mud: Mud[] = [];
    for (let k = 0; k < sh.mud; k++) mud.push({ x: 40 + rng() * 280, y: 140 + rng() * 300, r: 18 + rng() * 16 });
    // keep the snowman spot clear of snow so the body does not keep growing while parking
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const x = cc * CELL + CELL / 2;
      const y = rr * CELL + CELL / 2;
      if (Math.hypot(x - spot.x, y - spot.y) < SPOT_R + 6) snow[rr * COLS + cc] = 0;
    }
    const head = sh.twoBalls ? { start: { x: 40 + rng() * 280, y: 300 + rng() * 120 }, min: Math.round(sh.body * sh.headMin), max: Math.round(sh.body * sh.headMax) } : null;
    const base: RollLevel = { stage, snow, rocks, fences, mud, start, spot, body: Math.round(sh.body), head, timeLimit: 999, par: 0 };
    const run = pilotRun(base, 0, 1, 150);
    if (!run.won || run.time > 110) continue;
    const timeLimit = Math.ceil(run.time * sh.slack + 8);
    const lv = { ...base, par: Math.ceil(run.time), timeLimit };
    if (![[0.5, 7], [0.7, 11]].every(([j, sd]) => pilotRun(lv, j, sd).won)) continue;
    return lv;
  }
  throw new Error(`no snow-roll level for stage ${stage}`);
}

const cache = new Map<number, RollLevel>();
/** Stages are checked by the autopilot, so each one is built when it is first played. */
export function levelFor(stage: number): RollLevel {
  let l = cache.get(stage);
  if (!l) {
    l = buildLevel(stage);
    cache.set(stage, l);
  }
  return l;
}
