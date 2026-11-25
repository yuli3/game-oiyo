/**
 * Gumball Volley (껌볼 발리) — an OIYO original aim-and-volley block game (2026-11-25).
 *
 * Numbered candy blocks hang over a counter. Aim, and a volley of gumballs shoots out one after another, bouncing off
 * the walls and the blocks; every hit takes one off a block's number, and at zero it pops. Grab the + bubbles for an
 * extra gumball. After each volley the blocks come down a row. Pop them all before one reaches the counter.
 *
 * Pure and deterministic: fixed time steps, every stage's rows seeded per stage. Field px, y pointing down.
 */

export const VOLLEY_SLUG = "gumball-volley";
export const STAGE_COUNT = 30;
export const COLS = 7;
export const ROWS = 9;
export const CELL = 44;
export const X0 = 26;
export const Y0 = 60;
export const FLOOR = 480;
export const BALL_R = 5;
export const SPEED = 600;
export const GAP = 0.08; // seconds between gumballs in a volley
export const DT = 1 / 120;
export const PLUS = -1; // a + bubble in a cell
export const MIN_ANGLE = (10 * Math.PI) / 180; // aim limits, from the right-hand side of the counter

export interface VolleyStage {
  stage: number;
  rows: number[][]; // top row first comes in first: 0 empty, PLUS, or a block's number
  start: number; // rows on the board at the start
  balls: number; // gumballs to start with
  par: number; // volleys for three stars
}

export interface Shop {
  stage: VolleyStage;
  grid: number[]; // ROWS × COLS
  next: number; // the next row to come in
  balls: number;
  launchX: number;
  volleys: number;
  over: boolean;
  won: boolean;
}

export function newShop(stage: VolleyStage): Shop {
  const grid = new Array(ROWS * COLS).fill(0);
  // the first rows hang at the top, the earliest lowest
  for (let r = 0; r < stage.start; r++) {
    const row = stage.rows[r];
    const y = stage.start - 1 - r;
    for (let c = 0; c < COLS; c++) grid[y * COLS + c] = row[c];
  }
  return { stage, grid, next: stage.start, balls: stage.balls, launchX: X0 + (COLS * CELL) / 2, volleys: 0, over: false, won: false };
}

export interface VolleyResult {
  hits: number;
  popped: number;
  pluses: number;
  landX: number;
  pops: Array<{ i: number }>;
}

const LEFT = X0 + BALL_R;
const RIGHT = X0 + COLS * CELL - BALL_R;
const TOP = Y0 + BALL_R;

/** Clamps an aim: radians from the right-hand side, 0..π, kept away from flat. */
export const clampAim = (a: number) => Math.max(MIN_ANGLE, Math.min(Math.PI - MIN_ANGLE, a));

/** One gumball in flight. */
interface Ball { x: number; y: number; vx: number; vy: number; live: boolean; t0: number }

/**
 * Fires a whole volley at `angle` (radians, measured up from the right-hand side) and runs it to the end, changing the
 * grid. `onStep` (optional) sees every ball each step, for drawing.
 */
export function volley(s: Shop, angle: number, onStep?: (balls: ReadonlyArray<{ x: number; y: number; live: boolean }>, t: number) => void): VolleyResult {
  const a = clampAim(angle);
  const res: VolleyResult = { hits: 0, popped: 0, pluses: 0, landX: s.launchX, pops: [] };
  const balls: Ball[] = Array.from({ length: s.balls }, (_, k) => ({ x: s.launchX, y: FLOOR, vx: Math.cos(a) * SPEED, vy: -Math.sin(a) * SPEED, live: false, t0: k * GAP }));
  let landed = false;
  let t = 0;
  let done = 0;
  while (done < balls.length && t < 20) {
    t += DT;
    for (const b of balls) {
      if (!b.live) {
        if (b.t0 <= t && b.y === FLOOR && b.vy !== 0) b.live = true;
        else continue;
      }
      const px = b.x;
      const py = b.y;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      if (b.x < LEFT) {
        b.x = 2 * LEFT - b.x;
        b.vx = -b.vx;
      } else if (b.x > RIGHT) {
        b.x = 2 * RIGHT - b.x;
        b.vx = -b.vx;
      }
      if (b.y < TOP) {
        b.y = 2 * TOP - b.y;
        b.vy = -b.vy;
      }
      // blocks: the cell the ball's centre is now in, with the ball's radius around it
      const c = Math.floor((b.x - X0) / CELL);
      const r = Math.floor((b.y - Y0) / CELL);
      for (const [cc, rr] of [[c, r], [Math.floor((b.x + Math.sign(b.vx) * BALL_R - X0) / CELL), r], [c, Math.floor((b.y + Math.sign(b.vy) * BALL_R - Y0) / CELL)]]) {
        if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
        const i = rr * COLS + cc;
        const v = s.grid[i];
        if (v === PLUS) {
          const mx = X0 + cc * CELL + CELL / 2;
          const my = Y0 + rr * CELL + CELL / 2;
          if (Math.hypot(b.x - mx, b.y - my) < 14 + BALL_R) {
            s.grid[i] = 0;
            res.pluses++;
          }
          continue;
        }
        if (v <= 0) continue;
        // which face it came through: the side it was outside of before this step
        const bx0 = X0 + cc * CELL - BALL_R;
        const bx1 = X0 + (cc + 1) * CELL + BALL_R;
        const by0 = Y0 + rr * CELL - BALL_R;
        const by1 = Y0 + (rr + 1) * CELL + BALL_R;
        if (b.x <= bx0 || b.x >= bx1 || b.y <= by0 || b.y >= by1) continue;
        const wasOutX = px <= bx0 || px >= bx1;
        const wasOutY = py <= by0 || py >= by1;
        if (wasOutX && !wasOutY) b.vx = -b.vx;
        else if (wasOutY && !wasOutX) b.vy = -b.vy;
        else {
          b.vx = -b.vx;
          b.vy = -b.vy;
        }
        b.x = px;
        b.y = py;
        s.grid[i] = v - 1;
        res.hits++;
        if (v - 1 === 0) {
          res.popped++;
          res.pops.push({ i });
        }
        break;
      }
      if (b.y >= FLOOR && b.vy > 0) {
        b.y = FLOOR;
        b.vy = 0;
        b.vx = 0;
        b.live = false;
        b.t0 = Infinity;
        done++;
        if (!landed) {
          landed = true;
          res.landX = Math.max(LEFT, Math.min(RIGHT, b.x));
        }
      }
    }
    onStep?.(balls, t);
  }
  return res;
}

/** After a volley: gumballs for + bubbles, the blocks come down a row, a new row comes in at the top. */
export function settle(s: Shop, res: VolleyResult): void {
  s.volleys++;
  s.balls += res.pluses;
  s.launchX = res.landX;
  const blocksLeft = s.grid.some((v) => v > 0) || s.next < s.stage.rows.length;
  if (!blocksLeft) {
    s.over = true;
    s.won = true;
    return;
  }
  // a block on the bottom row can't come down any further: it reaches the counter
  for (let c = 0; c < COLS; c++) {
    if (s.grid[(ROWS - 1) * COLS + c] > 0) {
      s.over = true;
      return;
    }
  }
  for (let r = ROWS - 1; r > 0; r--) for (let c = 0; c < COLS; c++) s.grid[r * COLS + c] = s.grid[(r - 1) * COLS + c];
  const row = s.next < s.stage.rows.length ? s.stage.rows[s.next] : new Array(COLS).fill(0);
  for (let c = 0; c < COLS; c++) s.grid[c] = row[c];
  s.next++;
  if (!s.grid.some((v) => v > 0) && s.next >= s.stage.rows.length) {
    s.over = true;
    s.won = true;
  }
}

export function play(s: Shop, angle: number): VolleyResult | null {
  if (s.over) return null;
  const res = volley(s, angle);
  settle(s, res);
  return res;
}

export function starsFor(s: Shop): number {
  if (!s.won) return 0;
  if (s.volleys <= s.stage.par) return 3;
  if (s.volleys <= s.stage.par + 2) return 2;
  return 1;
}

export function cloneShop(s: Shop): Shop {
  return { ...s, grid: s.grid.slice() };
}

const NUDGE = (0.6 * Math.PI) / 180;

/** How a volley left things: popped blocks and + bubbles count, damage counts more the lower the block. */
function judge(before: Shop, after: Shop, res: VolleyResult): number {
  let v = res.popped * 1000 + res.pluses * 400;
  for (let i = 0; i < before.grid.length; i++) {
    const was = before.grid[i];
    if (was > 0) v += (was - Math.max(0, after.grid[i])) * (10 + Math.floor(i / COLS) * 6);
  }
  return v;
}

/** The aim a careful player would choose: tries the whole fan, keeping aims that still work a hair to either side. */
export function chooseAim(s: Shop, step = 2.5): number {
  let best = Math.PI / 2;
  let bestV = -Infinity;
  for (let deg = 12; deg <= 168; deg += step) {
    const a = (deg * Math.PI) / 180;
    let v = 0;
    for (const da of [0, -NUDGE, NUDGE]) {
      const t = cloneShop(s);
      const res = volley(t, a + da);
      v += judge(s, t, res);
    }
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
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

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface AimerOpts {
  /** spread of the aim (radians) */
  aim?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: VolleyStage, opts: AimerOpts = {}): Shop {
  const { aim = 0, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 2287 + 41);
  const s = newShop(st);
  let guard = 0;
  while (!s.over && guard++ < 200) {
    const a = mode === "random" ? MIN_ANGLE + rng() * (Math.PI - 2 * MIN_ANGLE) : chooseAim(s) + gauss(rng) * aim;
    play(s, a);
  }
  return s;
}

function shape(stage: number) {
  return {
    rows: 6 + Math.floor(stage / 3), // 6 up to 15 rows to clear
    start: 4,
    balls: 3,
    blocks: [2, stage < 8 ? 4 : 5] as [number, number], // blocks per row
    hp: stage < 5 ? 1.6 : stage < 15 ? 1.4 : 1.25, // how tough blocks are, against the gumballs a player has by then
  };
}

/** Human-like aimers: pick a sensible aim, then miss it by about a degree. */
export const HUMAN_AIMERS: AimerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ aim: 0.022, seed }));

export function buildStage(stage: number): VolleyStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(621000 + stage * 409 + attempt * 7919);
    const rows: number[][] = [];
    for (let r = 0; r < sh.rows; r++) {
      const row = new Array(COLS).fill(0);
      const n = sh.blocks[0] + Math.floor(rng() * (sh.blocks[1] - sh.blocks[0] + 1));
      const cells = Array.from({ length: COLS }, (_, i) => i);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      // a block's number keeps pace with the gumballs a player has by then (3, and most rows bring one more)
      for (let k = 0; k < n; k++) row[cells[k]] = Math.max(1, Math.round((3 + r * 0.8) * sh.hp * (0.7 + rng() * 0.6)));
      // most rows bring a + bubble
      if (r < sh.rows - 1 && rng() < 0.8) row[cells[n]] = PLUS;
      rows.push(row);
    }
    const st: VolleyStage = { stage, rows, start: sh.start, balls: sh.balls, par: 0 };
    const careful = pilot(st);
    if (!careful.won) continue;
    st.par = careful.volleys;
    if (HUMAN_AIMERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`gumball-volley stage ${stage + 1}: no fair shop`);
}

/** The 30 shops, built once by scripts/build-gumball-volley-stages.ts (building takes minutes, too slow for a page). */
export { VOLLEY_STAGES } from "./gumball-volley-stages";
