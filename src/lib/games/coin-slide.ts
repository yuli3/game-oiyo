/**
 * Coin Slide (카페 슬라이드) — an OIYO original table-shuffle game (2026-11-25).
 *
 * Slide big tokens up a long café table. The further a token stops, the more it scores: 1 past the line, 2 in the
 * middle band, 3 right at the edge — but slide too hard and it drops off the end. Tokens knock into each other and
 * into sugar-pot posts on the table. Score the stage's points with the tokens you have.
 *
 * Pure and deterministic: every stage's posts are seeded per stage. Field px, y pointing down; the far end is at the top.
 */

export const SLIDE_SLUG = "coin-slide";
export const STAGE_COUNT = 30;
export const TOKEN = 14; // radius
export const POST = 10;
export const FRICTION = 600; // px/s² of slowing down
export const LEFT = 40;
export const RIGHT = 320;
export const EDGE = 40; // the far end of the table
export const START = { x: 180, y: 520 };
export const MAX_SPEED = 1100;
/** Score bands from the far end: [from y, to y, points]. A token counts by where its centre rests. */
export const BANDS: Array<[number, number, number]> = [[EDGE, 92, 3], [92, 152, 2], [152, 220, 1]];

export interface Post { x: number; y: number }
export interface SlideStage {
  stage: number;
  tokens: number;
  posts: Post[];
  need: number;
  par: number;
}
export interface Puck { x: number; y: number; vx: number; vy: number; on: boolean }
export interface Table {
  stage: SlideStage;
  pucks: Puck[];
  thrown: number;
  t: number;
  over: boolean;
  won: boolean;
}

export const newTable = (stage: SlideStage): Table => ({ stage, pucks: [], thrown: 0, t: 0, over: false, won: false });

export const pointsAt = (y: number) => {
  for (const [a, b, p] of BANDS) if (y >= a && y < b) return p;
  return 0;
};
export const score = (tb: Table) => tb.pucks.reduce((s, p) => s + (p.on ? pointsAt(p.y) : 0), 0);
export const moving = (tb: Table) => tb.pucks.some((p) => p.on && (p.vx !== 0 || p.vy !== 0));

export function slide(tb: Table, vx: number, vy: number): boolean {
  if (tb.over || moving(tb) || tb.thrown >= tb.stage.tokens) return false;
  const sp = Math.hypot(vx, vy);
  const k = sp > MAX_SPEED ? MAX_SPEED / sp : 1;
  tb.pucks.push({ x: START.x, y: START.y, vx: vx * k, vy: vy * k, on: true });
  tb.thrown++;
  return true;
}

function collide(a: Puck, b: Puck) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d >= TOKEN * 2 || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (rel > 0) {
    const j = rel * 0.92; // equal masses, a little give
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;
  }
  const push = (TOKEN * 2 - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  return true;
}

export type SlideEvent = "knock" | "post" | "drop" | "stop" | null;

export function step(tb: Table, dt: number): SlideEvent[] {
  const ev: SlideEvent[] = [];
  if (tb.over) return ev;
  tb.t += dt;
  const sub = 4;
  const wasMoving = moving(tb);
  for (let k = 0; k < sub; k++) {
    const h = dt / sub;
    for (const p of tb.pucks) {
      if (!p.on) continue;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp === 0) continue;
      const slow = Math.max(0, sp - FRICTION * h);
      p.vx *= slow / sp;
      p.vy *= slow / sp;
      if (slow < 2) p.vx = p.vy = 0;
      p.x += p.vx * h;
      p.y += p.vy * h;
      // sugar-pot posts
      for (const q of tb.stage.posts) {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d < TOKEN + POST && d > 0) {
          const nx = dx / d;
          const ny = dy / d;
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) {
            p.vx -= 1.8 * vn * nx;
            p.vy -= 1.8 * vn * ny;
            ev.push("post");
          }
          p.x = q.x + nx * (TOKEN + POST);
          p.y = q.y + ny * (TOKEN + POST);
        }
      }
      // off the sides or the far end
      if (p.x < LEFT - TOKEN * 0.5 || p.x > RIGHT + TOKEN * 0.5 || p.y < EDGE) {
        p.on = false;
        p.vx = p.vy = 0;
        ev.push("drop");
      }
    }
    const on = tb.pucks.filter((p) => p.on);
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) if (collide(on[i], on[j])) ev.push("knock");
  }
  if (wasMoving && !moving(tb)) {
    ev.push("stop");
    if (tb.thrown >= tb.stage.tokens) {
      tb.over = true;
      tb.won = score(tb) >= tb.stage.need;
    }
  }
  return ev;
}

export function starsFor(tb: Table): number {
  if (!tb.won) return 0;
  const s = score(tb);
  if (s >= tb.stage.par) return 3;
  if (s >= Math.ceil((tb.stage.need + tb.stage.par) / 2)) return 2;
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

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** The spot a sensible player aims for: deep in the 3 band on a lane clear of posts and of tokens already resting;
 *  failing that the 2 band, then the 1 band. Lanes are tried from the middle outward. */
export const LANES = Array.from({ length: 13 }, (_, k) => 180 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 18);
export const TARGET_YS = [66, 122, 186];
export function pickTarget(tb: Table): { x: number; y: number } {
  const things = [...tb.stage.posts.map((p) => ({ x: p.x, y: p.y, r: POST })), ...tb.pucks.filter((p) => p.on).map((p) => ({ x: p.x, y: p.y, r: TOKEN }))];
  const blocked = (x: number, ty: number) =>
    things.some((o) => {
      // anything within a token's reach of the straight line from the start to (x, ty), or sitting on the spot
      if (o.y < ty - TOKEN * 2 || o.y > START.y) return false;
      const f = Math.min(1, (START.y - o.y) / (START.y - ty));
      const lx = START.x + (x - START.x) * f;
      return Math.abs(o.x - lx) < TOKEN + o.r + 4;
    });
  for (const ty of TARGET_YS) for (const x of LANES) if (!blocked(x, ty)) return { x, y: ty };
  return { x: 180, y: 186 };
}

/** The slide that stops at a spot (straight line, constant friction). */
export function aimAt(target: { x: number; y: number }): { vx: number; vy: number } {
  const dx = target.x - START.x;
  const dy = target.y - START.y;
  const d = Math.hypot(dx, dy);
  const sp = Math.sqrt(2 * FRICTION * d);
  return { vx: (dx / d) * sp, vy: (dy / d) * sp };
}

export interface SliderOpts {
  /** spread of the direction (degrees) and of the speed (fraction) */
  aimSpread?: number;
  powerSpread?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: SlideStage, opts: SliderOpts = {}): Table {
  const { aimSpread = 1, powerSpread = 0.012, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 2917 + 89);
  const tb = newTable(st);
  const dt = 1 / 60;
  let guard = 0;
  while (!tb.over && guard++ < 60 * 200) {
    if (!moving(tb)) {
      if (mode === "random") {
        const a = -Math.PI / 2 + (rng() - 0.5) * 0.6;
        const sp = 300 + rng() * 800;
        slide(tb, Math.cos(a) * sp, Math.sin(a) * sp);
      } else {
        const v = aimAt(pickTarget(tb));
        const a = (gauss(rng) * aimSpread * Math.PI) / 180;
        const k = 1 + gauss(rng) * powerSpread;
        slide(tb, (v.vx * Math.cos(a) - v.vy * Math.sin(a)) * k, (v.vx * Math.sin(a) + v.vy * Math.cos(a)) * k);
      }
    }
    step(tb, dt);
  }
  return tb;
}

function shape(stage: number) {
  return {
    tokens: 4 + Math.floor(stage / 6), // 4 up to 8
    posts: stage < 3 ? 0 : Math.min(5, 1 + Math.floor((stage - 3) / 6)),
    share: stage < 5 ? 0.4 : stage < 15 ? 0.5 : 0.55, // points needed, as a share of all-3s
  };
}

/** Human-like sliders: off by about a degree in direction and 1.5% in speed. */
export const HUMAN_SLIDERS: SliderOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ aimSpread: 1, powerSpread: 0.015, seed }));

export function buildStage(stage: number): SlideStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(501000 + stage * 331 + attempt * 7919);
    const posts: Post[] = [];
    for (let k = 0; k < 60 && posts.length < sh.posts; k++) {
      const p = { x: 70 + Math.floor(rng() * 220), y: 120 + Math.floor(rng() * 260) };
      // spread apart, and never on the straight middle lane near the start
      if (posts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 70)) continue;
      if (p.y > 330 && Math.abs(p.x - 180) < 40) continue;
      posts.push(p);
    }
    const st: SlideStage = { stage, tokens: sh.tokens, posts, need: Math.ceil(sh.tokens * 3 * sh.share), par: 0 };
    if (HUMAN_SLIDERS.some((o) => !pilot(st, o).won)) continue;
    const careful = pilot(st, { aimSpread: 0.3, powerSpread: 0.004 });
    if (!careful.won) continue;
    const exact = pilot(st, { aimSpread: 0, powerSpread: 0 });
    if (!exact.won) continue;
    st.par = Math.max(st.need, Math.min(score(careful), score(exact)) - 2);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`coin-slide stage ${stage + 1}: no fair table`);
}

export const SLIDE_STAGES: SlideStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
