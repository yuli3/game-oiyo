/**
 * Roller Claim (롤러 땅따기) — an OIYO original territory-paint game (2026-11-25).
 *
 * You push a paint roller over a playground. Inside your painted patch you are safe; step out and the roller leaves
 * a wet stripe behind it. Roll back into your patch and the loop closes: the stripe and everything it fenced in turn
 * your colour. Stray balls bounce around the playground — if one rolls over your wet stripe, the stripe is wiped and
 * the roller goes home. Running over your own wet stripe costs a life. Paint the share of the ground the stage asks
 * for before time runs out.
 *
 * Pure and deterministic: the playground, the balls and their bounces are seeded per stage.
 */

export const ROLLER_SLUG = "roller-claim";
export const STAGE_COUNT = 30;
export const COLS = 24;
export const ROWS = 30;
export const CELL = 15;
export const TOP = 100; // field px of the grid's top edge
export const STEP = 0.12; // seconds per cell for the roller
export const LIVES = 3;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface Ball { x: number; y: number; dx: number; dy: number }
export interface RollerStage {
  stage: number;
  start: [number, number]; // the roller's home cell (a 3×3 patch is painted around it)
  balls: Ball[];
  ballStep: number; // seconds per cell for the balls
  goal: number; // painted share needed (0..1)
  limit: number; // seconds
  par: number; // seconds a quick painter takes
}

export interface Ground {
  stage: RollerStage;
  owned: Uint8Array; // 1 painted
  trail: Uint8Array; // 1 wet stripe
  trailCells: number[];
  x: number;
  y: number;
  dir: number; // −1 standing still
  want: number; // the direction asked for next
  lives: number;
  balls: Ball[];
  t: number;
  moveT: number;
  ballT: number;
  painted: number;
  over: boolean;
  won: boolean;
}

const idx = (x: number, y: number) => y * COLS + x;
export const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

export function newGround(stage: RollerStage): Ground {
  const owned = new Uint8Array(COLS * ROWS);
  const [sx, sy] = stage.start;
  for (let y = sy - 1; y <= sy + 1; y++) for (let x = sx - 1; x <= sx + 1; x++) owned[idx(x, y)] = 1;
  return {
    stage, owned, trail: new Uint8Array(COLS * ROWS), trailCells: [], x: sx, y: sy, dir: -1, want: -1, lives: LIVES,
    balls: stage.balls.map((b) => ({ ...b })), t: 0, moveT: 0, ballT: 0, painted: 9, over: false, won: false,
  };
}

export const share = (g: Ground) => g.painted / (COLS * ROWS);

/** Asks the roller to head a way (0 up, 1 right, 2 down, 3 left); turning straight back is refused while out. */
export function steer(g: Ground, dir: number): void {
  if (g.over || dir < 0 || dir > 3) return;
  if (g.trailCells.length && g.dir >= 0 && (dir + 2) % 4 === g.dir) return;
  g.want = dir;
}

/** Closes the loop: the stripe and everything it fenced off from the edge become painted. */
function claim(g: Ground): number {
  for (const c of g.trailCells) {
    g.owned[c] = 1;
    g.trail[c] = 0;
  }
  g.trailCells = [];
  // flood the unpainted ground from the playground's edge; whatever the flood can't reach is fenced in
  const seen = new Uint8Array(COLS * ROWS);
  const stack: number[] = [];
  for (let x = 0; x < COLS; x++) for (const y of [0, ROWS - 1]) if (!g.owned[idx(x, y)]) stack.push(idx(x, y));
  for (let y = 0; y < ROWS; y++) for (const x of [0, COLS - 1]) if (!g.owned[idx(x, y)]) stack.push(idx(x, y));
  while (stack.length) {
    const c = stack.pop()!;
    if (seen[c] || g.owned[c]) continue;
    seen[c] = 1;
    const x = c % COLS;
    const y = (c / COLS) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (inside(nx, ny)) stack.push(idx(nx, ny));
    }
  }
  let gained = 0;
  for (let c = 0; c < COLS * ROWS; c++)
    if (!g.owned[c] && !seen[c]) {
      g.owned[c] = 1;
      gained++;
    }
  let n = 0;
  for (let c = 0; c < COLS * ROWS; c++) n += g.owned[c];
  g.painted = n;
  return gained;
}

function lose(g: Ground): void {
  wipe(g);
  g.lives--;
  if (g.lives <= 0) g.over = true;
}

function wipe(g: Ground): void {
  for (const c of g.trailCells) g.trail[c] = 0;
  g.trailCells = [];
  const [sx, sy] = g.stage.start;
  // back home: the nearest painted cell to the start
  g.x = sx;
  g.y = sy;
  if (!g.owned[idx(sx, sy)]) {
    let best = -1;
    let bd = Infinity;
    for (let c = 0; c < COLS * ROWS; c++)
      if (g.owned[c]) {
        const d = Math.abs((c % COLS) - sx) + Math.abs(((c / COLS) | 0) - sy);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
    if (best >= 0) {
      g.x = best % COLS;
      g.y = (best / COLS) | 0;
    }
  }
  g.dir = -1;
  g.want = -1;
}

export interface StepEvents { claimed: number; hit: boolean }

export function step(g: Ground, dt: number): StepEvents {
  const ev: StepEvents = { claimed: 0, hit: false };
  if (g.over) return ev;
  g.t += dt;
  // balls bounce off the edges, one cell at a time
  g.ballT += dt;
  while (g.ballT >= g.stage.ballStep) {
    g.ballT -= g.stage.ballStep;
    for (const b of g.balls) {
      if (!inside(b.x + b.dx, b.y)) b.dx = -b.dx;
      if (!inside(b.x, b.y + b.dy)) b.dy = -b.dy;
      b.x += b.dx;
      b.y += b.dy;
      if (g.trail[idx(b.x, b.y)]) {
        // a ball across the wet stripe wipes it and sends the roller home (no life lost)
        ev.hit = true;
        wipe(g);
      }
    }
  }
  g.moveT += dt;
  while (g.moveT >= STEP) {
    g.moveT -= STEP;
    if (g.want >= 0) g.dir = g.want;
    if (g.dir < 0) continue;
    const nx = g.x + DX[g.dir];
    const ny = g.y + DY[g.dir];
    if (!inside(nx, ny)) continue; // the fence: wait for a turn
    const c = idx(nx, ny);
    if (g.trail[c]) {
      ev.hit = true;
      lose(g);
      if (g.over) return ev;
      continue;
    }
    g.x = nx;
    g.y = ny;
    if (g.owned[c]) {
      if (g.trailCells.length) ev.claimed += claim(g);
    } else {
      g.trail[c] = 1;
      g.trailCells.push(c);
    }
  }
  if (share(g) >= g.stage.goal) {
    g.over = true;
    g.won = true;
  } else if (g.t >= g.stage.limit) g.over = true;
  return ev;
}

export function starsFor(g: Ground): number {
  if (!g.won) return 0;
  if (g.t <= g.stage.par && g.lives === LIVES) return 3;
  if (g.t <= (g.stage.par + g.stage.limit) / 2) return 2;
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

export interface PainterOpts {
  /** the longest side of a loop the player dares to paint */
  reach?: number;
  /** how close (cells) a ball may come to the stripe before the player heads home */
  caution?: number;
  /** extra cells of travel before a turn is made (late reactions) */
  late?: number;
  seed?: number;
  /** "loops" paints boxes off the patch; "random" wanders */
  mode?: "loops" | "random";
}

/** Shortest way home through unpainted, stripe-free ground: the first direction to take, or −1. */
export function homeward(g: Ground): number {
  const prev = new Int16Array(COLS * ROWS).fill(-2);
  const start = idx(g.x, g.y);
  prev[start] = -1;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    const x = c % COLS;
    const y = (c / COLS) | 0;
    if (g.owned[c] && c !== start) {
      // walk back to the first step
      let cur = c;
      while (prev[cur] !== start) cur = prev[cur];
      const nx = cur % COLS;
      const ny = (cur / COLS) | 0;
      for (let d = 0; d < 4; d++) if (nx === g.x + DX[d] && ny === g.y + DY[d]) return d;
      return -1;
    }
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inside(nx, ny)) continue;
      const n = idx(nx, ny);
      if (prev[n] !== -2 || g.trail[n]) continue;
      if (c === start && g.trailCells.length && g.dir >= 0 && (d + 2) % 4 === g.dir) continue;
      prev[n] = c;
      q.push(n);
    }
  }
  return -1;
}

export function pilot(st: RollerStage, opts: PainterOpts = {}): Ground {
  const { reach = 6, caution = 3, late = 0, seed = 1, mode = "loops" } = opts;
  const rng = mulberry(seed * 4973 + 37);
  const g = newGround(st);
  const dt = STEP / 2;
  // a box plan: out (d1) until `depth` cells of stripe, across (d2) for `width` cells, back (d3) until home
  let plan: { d1: number; d2: number; depth: number; width: number; leg: number; walked: number } | null = null;
  let goHome = false;
  let lastCell = -1;
  let randomLeft = 0;
  const room = (d: number) => {
    let x = g.x;
    let y = g.y;
    while (inside(x + DX[d], y + DY[d]) && g.owned[idx(x + DX[d], y + DY[d])]) {
      x += DX[d];
      y += DY[d];
    }
    let k = 0;
    while (inside(x + DX[d], y + DY[d]) && !g.owned[idx(x + DX[d], y + DY[d])] && k < 12) {
      x += DX[d];
      y += DY[d];
      k++;
    }
    return k;
  };
  while (!g.over) {
    const cell = idx(g.x, g.y);
    if (cell !== lastCell) {
      lastCell = cell;
      const out = g.trailCells.length > 0;
      if (mode === "random") {
        if (--randomLeft <= 0) {
          steer(g, Math.floor(rng() * 4));
          randomLeft = 1 + Math.floor(rng() * 5);
        }
      } else if (!out) {
        goHome = false;
        if (plan && plan.leg === 0 && !inside(g.x + DX[plan.d1], g.y + DY[plan.d1])) plan = null; // the fence: plan again
        if (!plan || plan.leg > 0) {
          // a new box into the most open side
          const dirs = shuffle([0, 1, 2, 3], rng);
          let d1 = dirs[0];
          let best = -1;
          for (const d of dirs) {
            const r = room(d);
            if (r > best) {
              best = r;
              d1 = d;
            }
          }
          if (best <= 0) {
            const free = dirs.filter((d) => inside(g.x + DX[d], g.y + DY[d]));
            d1 = free[0] ?? 0;
          }
          const depth = Math.max(1, Math.min(Math.max(best, 1), 2 + Math.floor(rng() * (reach - 1))));
          plan = { d1, d2: (d1 + (rng() < 0.5 ? 1 : 3)) % 4, depth, width: 2 + Math.floor(rng() * (reach - 1)), leg: 0, walked: 0 };
        }
        steer(g, plan.d1);
      } else {
        const danger = g.balls.some((b) => Math.abs(b.x - g.x) + Math.abs(b.y - g.y) <= caution || g.trailCells.some((c) => Math.abs((c % COLS) - b.x) + Math.abs(((c / COLS) | 0) - b.y) <= caution));
        if (danger || !plan) goHome = true;
        if (plan && !goHome) {
          plan.walked++;
          if (plan.leg === 0 && g.trailCells.length >= plan.depth + late) {
            plan.leg = 1;
            plan.walked = 0;
          } else if (plan.leg === 1 && plan.walked >= plan.width + late) {
            plan.leg = 2;
          }
          const d = plan.leg === 0 ? plan.d1 : plan.leg === 1 ? plan.d2 : (plan.d1 + 2) % 4;
          // the fence ahead: give up the box and go home
          if (!inside(g.x + DX[d], g.y + DY[d]) || g.trail[idx(g.x + DX[d], g.y + DY[d])]) goHome = true;
          else steer(g, d);
        }
        if (goHome) {
          const d = homeward(g);
          if (d >= 0) steer(g, d);
        }
      }
    }
    step(g, dt);
  }
  return g;
}

function shape(stage: number) {
  return {
    balls: stage < 3 ? 0 : Math.min(3, 1 + Math.floor((stage - 3) / 9)),
    ballStep: Math.max(0.22, 0.32 - stage * 0.004),
    goal: Math.min(0.6, 0.3 + stage * 0.012),
    slack: stage < 5 ? 1.8 : stage < 15 ? 1.6 : 1.4,
  };
}

/** Human-like painters: boxes up to six cells across, heading home when a ball comes within three cells. */
export const HUMAN_PAINTERS: PainterOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ reach: 6, caution: 3, late: 0, seed }));

export function layout(stage: number, attempt: number): RollerStage {
  const sh = shape(stage);
  const rng = mulberry(381000 + stage * 241 + attempt * 7919);
  const start: [number, number] = [4 + Math.floor(rng() * (COLS - 8)), 4 + Math.floor(rng() * (ROWS - 8))];
  const balls: Ball[] = [];
  for (let k = 0; k < sh.balls; k++) {
    let x: number;
    let y: number;
    do {
      x = Math.floor(rng() * COLS);
      y = Math.floor(rng() * ROWS);
    } while (Math.abs(x - start[0]) + Math.abs(y - start[1]) < 8);
    balls.push({ x, y, dx: rng() < 0.5 ? 1 : -1, dy: rng() < 0.5 ? 1 : -1 });
  }
  return { stage, start, balls, ballStep: sh.ballStep, goal: sh.goal, limit: 0, par: 0 };
}

/** Sets the clock from the slowest human-like painter, with room to spare; wandering at random must fall short. */
export function buildStage(stage: number): RollerStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const st = layout(stage, attempt);
    st.limit = 600;
    const runs = HUMAN_PAINTERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const slowest = Math.max(...runs.map((r) => r.t));
    st.limit = Math.ceil(slowest * sh.slack) + 5;
    const quick = pilot(st, { reach: 8, caution: 3, seed: 1 });
    if (!quick.won) continue;
    st.par = Math.ceil(Math.min(quick.t, ...runs.map((r) => r.t)) * 1.25);
    if (st.par >= st.limit) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`roller-claim stage ${stage + 1}: no fair playground`);
}

export const ROLLER_STAGES: RollerStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
