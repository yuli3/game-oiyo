/**
 * 양떼 몰이 (Snowfield Sheepdog) — an OIYO original herding game for the year of the sheep, 2027.
 * Drag the sheepdog around a snowy field. Sheep run from the dog and stick together as a flock, so
 * you steer the whole flock by where you stand, not by touching any sheep. Bring every sheep through
 * the gate into the pen. Later fields add pine trees, a frozen pond where sheep slide, deep snow that
 * slows them, a narrower gate, and a stubborn black goat that only half listens.
 */

import { mulberry } from "./pixel-kit";

export const HERD_SLUG = "sheep-herd";
export const FIELD_W = 360;
export const FIELD_H = 600;
export const SHEEP_R = 8;
export const DOG_R = 9;
export const DOG_SPEED = 230;
const FLEE_R = 92;
const SHEEP_MAX = 120;

export interface Vec { x: number; y: number }
export interface Seg { a: Vec; b: Vec }
export interface Circle { x: number; y: number; r: number }
export interface Rect { x0: number; y0: number; x1: number; y1: number }

export interface Sheep { x: number; y: number; vx: number; vy: number; goat: boolean; penned: boolean; face: number }

export interface Layout {
  stage: number;
  pen: Rect;
  gate: { x0: number; x1: number; y: number }; // opening on the pen's bottom side
  fences: Seg[];
  hedges: number; // fences before this index belong to the pen and its hedges
  trees: Circle[];
  ponds: Rect[]; // ice: little friction
  drifts: Rect[]; // deep snow: heavy friction
  sheep: number;
  goats: number;
  limit: number; // seconds
}

export interface Herd {
  layout: Layout;
  time: number;
  dog: Vec;
  target: Vec | null;
  sheep: Sheep[];
  over: boolean;
  won: boolean;
  rand: () => number;
}

export const STAGE_COUNT = 30;

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

export function buildLayout(stage: number): Layout {
  const rand = mulberry(7727 + stage * 131);
  const band = Math.floor(stage / 5);
  const sheep = Math.min(14, 4 + Math.floor(stage * 0.4));
  const goats = stage >= 20 ? 1 + (stage >= 26 ? 1 : 0) : 0;
  const penW = Math.max(120, 170 - stage * 1.4);
  const penH = 96;
  const side = stage % 3; // pen at centre, left, right
  // the pen sits flush against the field's edges, so no sheep can slip round the back of it
  const px = side === 0 ? (FIELD_W - penW) / 2 : side === 1 ? 0 : FIELD_W - penW;
  const pen: Rect = { x0: px, y0: 0, x1: px + penW, y1: penH + 20 };
  const gateW = Math.max(46, 84 - stage * 1.3);
  const gx = pen.x0 + (penW - gateW) / 2;
  const gate = { x0: gx, x1: gx + gateW, y: pen.y1 };
  const fences: Seg[] = [
    { a: { x: pen.x0, y: pen.y0 }, b: { x: pen.x1, y: pen.y0 } },
    { a: { x: pen.x0, y: pen.y0 }, b: { x: pen.x0, y: pen.y1 } },
    { a: { x: pen.x1, y: pen.y0 }, b: { x: pen.x1, y: pen.y1 } },
    { a: { x: pen.x0, y: pen.y1 }, b: { x: gx, y: pen.y1 } },
    { a: { x: gx + gateW, y: pen.y1 }, b: { x: pen.x1, y: pen.y1 } },
  ];
  // hedges from the pen to the field's sides: the whole top strip is pen or hedge, no corners to get stuck in
  if (pen.x0 > 0) fences.push({ a: { x: 0, y: pen.y1 }, b: { x: pen.x0, y: pen.y1 } });
  if (pen.x1 < FIELD_W) fences.push({ a: { x: pen.x1, y: pen.y1 }, b: { x: FIELD_W, y: pen.y1 } });
  const hedges = fences.length;
  // a fence across the field in later stages, with a way around
  if (band >= 3) {
    const y = 300 + rand() * 60;
    const leftGap = rand() < 0.5;
    fences.push(leftGap ? { a: { x: 110, y }, b: { x: FIELD_W, y } } : { a: { x: 0, y }, b: { x: FIELD_W - 110, y } });
  }
  const trees: Circle[] = [];
  const nTrees = band === 0 ? 0 : Math.min(7, 1 + band + (stage % 5 >= 3 ? 1 : 0));
  let guard = 0;
  while (trees.length < nTrees && guard++ < 500) {
    const t = { x: 30 + rand() * (FIELD_W - 60), y: 180 + rand() * 300, r: 14 + rand() * 6 };
    if (trees.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < 70)) continue;
    if (t.y < pen.y1 + 60 && t.x > gate.x0 - 40 && t.x < gate.x1 + 40) continue;
    // keep trees off the cross fence, so the way round it stays open
    if (fences.length > hedges && Math.abs(t.y - fences[hedges].a.y) < 50) continue;
    trees.push(t);
  }
  const ponds: Rect[] = [];
  if (band === 2 || band >= 4) {
    const w = 110 + rand() * 60;
    const x0 = 20 + rand() * (FIELD_W - 40 - w);
    const y0 = 200 + rand() * 120;
    ponds.push({ x0, y0, x1: x0 + w, y1: y0 + 60 });
  }
  const drifts: Rect[] = [];
  if (band >= 3) {
    const w = 90 + rand() * 60;
    const x0 = 20 + rand() * (FIELD_W - 40 - w);
    const y0 = 380 + rand() * 60;
    drifts.push({ x0, y0, x1: x0 + w, y1: y0 + 50 });
  }
  return { stage, pen, gate, fences, hedges, trees, ponds, drifts, sheep, goats, limit: 45 + sheep * 4 + band * 12 };
}

export const LAYOUTS: readonly Layout[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLayout(i));

export function newHerd(stage: number, seed: number): Herd {
  const layout = LAYOUTS[stage];
  const rand = mulberry(seed);
  const sheep: Sheep[] = [];
  const cx = 80 + rand() * (FIELD_W - 160);
  const cy = 470 + rand() * 40;
  let guard = 0;
  while (sheep.length < layout.sheep + layout.goats && guard++ < 2000) {
    const x = cx + (rand() - 0.5) * 120;
    const y = cy + (rand() - 0.5) * 90;
    if (x < 20 || x > FIELD_W - 20 || y > FIELD_H - 20) continue;
    if (layout.trees.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + SHEEP_R + 4)) continue;
    if (sheep.some((s) => Math.hypot(s.x - x, s.y - y) < SHEEP_R * 2.4)) continue;
    sheep.push({ x, y, vx: 0, vy: 0, goat: sheep.length >= layout.sheep, penned: false, face: 1 });
  }
  return { layout, time: 0, dog: { x: FIELD_W / 2, y: FIELD_H - 30 }, target: null, sheep, over: false, won: false, rand };
}

export function setDogTarget(h: Herd, p: Vec | null): void {
  h.target = p ? { x: Math.max(DOG_R, Math.min(FIELD_W - DOG_R, p.x)), y: Math.max(DOG_R, Math.min(FIELD_H - DOG_R, p.y)) } : null;
}

function closest(seg: Seg, x: number, y: number): Vec {
  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const t = Math.max(0, Math.min(1, ((x - seg.a.x) * dx + (y - seg.a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: seg.a.x + dx * t, y: seg.a.y + dy * t };
}

function collide(l: Layout, p: { x: number; y: number; vx?: number; vy?: number }, r: number): void {
  for (const f of l.fences) {
    const c = closest(f, p.x, p.y);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < r && d > 1e-6) {
      const nx = (p.x - c.x) / d;
      const ny = (p.y - c.y) / d;
      p.x = c.x + nx * r;
      p.y = c.y + ny * r;
      if (p.vx !== undefined && p.vy !== undefined) {
        const vn = p.vx * nx + p.vy * ny;
        if (vn < 0) {
          p.vx -= vn * nx * 1.3;
          p.vy -= vn * ny * 1.3;
        }
      }
    }
  }
  for (const t of l.trees) {
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d < t.r + r && d > 1e-6) {
      p.x = t.x + ((p.x - t.x) / d) * (t.r + r);
      p.y = t.y + ((p.y - t.y) / d) * (t.r + r);
    }
  }
  p.x = Math.max(r, Math.min(FIELD_W - r, p.x));
  p.y = Math.max(r, Math.min(FIELD_H - r, p.y));
}

export function isPenned(l: Layout, s: Pick<Sheep, "x" | "y">): boolean {
  return inRect({ x0: l.pen.x0 + 2, y0: l.pen.y0 + 2, x1: l.pen.x1 - 2, y1: l.pen.y1 - 4 }, s.x, s.y);
}

export function friction(l: Layout, x: number, y: number): number {
  if (l.ponds.some((r) => inRect(r, x, y))) return 0.4;
  if (l.drifts.some((r) => inRect(r, x, y))) return 5.5;
  return 3.2;
}

export interface HerdEvents { penned: number; bleat: number }

export function stepHerd(h: Herd, dt: number): HerdEvents {
  const ev: HerdEvents = { penned: 0, bleat: 0 };
  if (h.over) return ev;
  const l = h.layout;
  h.time += dt;
  // dog runs toward the finger
  if (h.target) {
    const dx = h.target.x - h.dog.x;
    const dy = h.target.y - h.dog.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, DOG_SPEED * dt);
    if (d > 0.5) {
      h.dog.x += (dx / d) * step;
      h.dog.y += (dy / d) * step;
    }
    // the dog hops over fences and round trees, but never goes into the pen strip
    h.dog.x = Math.max(DOG_R, Math.min(FIELD_W - DOG_R, h.dog.x));
    h.dog.y = Math.max(l.gate.y + DOG_R + 4, Math.min(FIELD_H - DOG_R, h.dog.y));
  }
  // flock centre (outside the pen)
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const s of h.sheep) if (!s.penned) {
    cx += s.x;
    cy += s.y;
    n++;
  }
  if (n) {
    cx /= n;
    cy /= n;
  }
  for (const s of h.sheep) {
    let ax = 0;
    let ay = 0;
    const ddx = s.x - h.dog.x;
    const ddy = s.y - h.dog.y;
    const dd = Math.hypot(ddx, ddy);
    const listen = s.goat ? 0.55 : 1;
    if (dd < FLEE_R && dd > 1e-3) {
      const k = ((FLEE_R - dd) / FLEE_R) * 900 * listen;
      ax += (ddx / dd) * k;
      ay += (ddy / dd) * k;
      if (dd < FLEE_R * 0.5 && h.rand() < dt * 2) ev.bleat += 1;
    }
    if (!s.penned && n > 1) {
      // cohesion pulls stragglers in, stronger when the dog is near
      const k = dd < FLEE_R * 1.4 ? 60 : 22;
      ax += (cx - s.x) * k * 0.01 * (s.goat ? 0.3 : 1);
      ay += (cy - s.y) * k * 0.01 * (s.goat ? 0.3 : 1);
    }
    for (const o of h.sheep) {
      if (o === s) continue;
      const ox = s.x - o.x;
      const oy = s.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od < SHEEP_R * 2.6 && od > 1e-3) {
        const k = ((SHEEP_R * 2.6 - od) / (SHEEP_R * 2.6)) * 500;
        ax += (ox / od) * k;
        ay += (oy / od) * k;
      }
    }
    // sheep shy away from the field's edges, so nobody gets pinned in a corner
    if (!s.penned) {
      const m = 40;
      const k = 32;
      if (s.x < m) ax += (m - s.x) * k;
      if (s.x > FIELD_W - m) ax -= (s.x - (FIELD_W - m)) * k;
      if (s.y > FIELD_H - m) ay -= (s.y - (FIELD_H - m)) * k;
      if (s.y < m) ay += (m - s.y) * k;
    }
    // goats wander off on their own
    if (s.goat) {
      ax += (h.rand() - 0.5) * 260;
      ay += (h.rand() - 0.5) * 260;
    } else {
      ax += (h.rand() - 0.5) * 40;
      ay += (h.rand() - 0.5) * 40;
    }
    // inside the pen, sheep settle down and drift away from the gate
    if (s.penned) {
      ay -= 40;
      ax *= 0.5;
    }
    const fr = friction(l, s.x, s.y);
    s.vx += ax * dt;
    s.vy += ay * dt;
    s.vx -= s.vx * Math.min(1, fr * dt);
    s.vy -= s.vy * Math.min(1, fr * dt);
    const sp = Math.hypot(s.vx, s.vy);
    const max = SHEEP_MAX * (s.goat ? 0.85 : 1);
    if (sp > max) {
      s.vx *= max / sp;
      s.vy *= max / sp;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (Math.abs(s.vx) > 6) s.face = s.vx > 0 ? 1 : -1;
    collide(l, s, SHEEP_R);
    const now = isPenned(l, s);
    if (now && !s.penned) ev.penned += 1;
    s.penned = now;
  }
  if (h.sheep.every((s) => s.penned)) {
    h.over = true;
    h.won = true;
  } else if (h.time >= l.limit) {
    h.over = true;
    h.won = false;
  }
  return ev;
}

/**
 * A simple herding pilot for the tests: stand behind the sheep that is furthest from the gate,
 * on the far side from the gate, and push. Collect stragglers first when the flock spreads out.
 */
export function pilotTarget(h: Herd): Vec {
  const l = h.layout;
  const gate = { x: (l.gate.x0 + l.gate.x1) / 2, y: l.gate.y + 10 };
  const out = h.sheep.filter((s) => !s.penned);
  if (!out.length) return h.dog;
  let cx = 0;
  let cy = 0;
  for (const s of out) {
    cx += s.x;
    cy += s.y;
  }
  cx /= out.length;
  cy /= out.length;
  // aim point: the gate, or a waypoint around a cross fence
  let aim = gate;
  const cross = l.fences[l.hedges];
  if (cross && cy > cross.a.y) {
    const gapX = cross.a.x > 0 ? 55 : FIELD_W - 55;
    aim = { x: gapX, y: cross.a.y - 30 };
  }
  // a sheep stuck under the pen wall beside the gate: walk round and nudge it sideways toward the gate
  const stuck = out.find((s) => s.y < l.gate.y + 34 && (s.x < l.gate.x0 + 4 || s.x > l.gate.x1 - 4));
  if (stuck && (out.length <= 3 || Math.hypot(stuck.x - cx, stuck.y - cy) > 60)) {
    const dir = stuck.x < gate.x ? -1 : 1;
    return { x: Math.max(DOG_R, Math.min(FIELD_W - DOG_R, stuck.x + dir * 30)), y: stuck.y + 14 };
  }
  // a flock pressed against a side of the field: first ease it back toward the middle
  const gateFar = Math.abs(cx - gate.x) > 90;
  if ((cx < 64 || cx > FIELD_W - 64) && gateFar) aim = { x: FIELD_W / 2, y: cy - 30 };
  // the sheep worst placed: far from the flock, or the flock's back
  let worst = out[0];
  let worstD = -1;
  for (const s of out) {
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d > worstD) {
      worstD = d;
      worst = s;
    }
  }
  const spread = worstD > 60;
  const from = spread ? { x: worst.x, y: worst.y } : { x: cx, y: cy };
  let to = spread ? { x: cx, y: cy } : aim;
  if (spread && cross && worst.y > cross.a.y !== cy > cross.a.y) to = { x: cross.a.x > 0 ? 55 : FIELD_W - 55, y: cross.a.y };
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const d = Math.hypot(dx, dy) || 1;
  // stand just behind the flock's back edge along the push direction
  let reach = 0;
  if (!spread) for (const s of out) reach = Math.max(reach, ((s.x - cx) * dx + (s.y - cy) * dy) / d);
  const back = spread ? 34 : reach + 34;
  return { x: Math.max(DOG_R, Math.min(FIELD_W - DOG_R, from.x + (dx / d) * back)), y: Math.max(DOG_R, Math.min(FIELD_H - DOG_R, from.y + (dy / d) * back)) };
}

export function starsFor(time: number, limit: number): 1 | 2 | 3 {
  if (time <= limit * 0.5) return 3;
  if (time <= limit * 0.75) return 2;
  return 1;
}
