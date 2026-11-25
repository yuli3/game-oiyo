/**
 * Bead Parade (구슬 행렬) — an OIYO original bead-chain shooter (2026-11-25).
 *
 * A parade of coloured beads rolls along a spiral toward the hole in the middle of the lawn. From the centre, a little
 * flower launcher shoots beads: tap where to shoot. A bead that lands next to two or more of its colour pops them all,
 * and when a gap closes on two matching ends they meet and can pop again. Clear the whole parade before the front bead
 * reaches the hole; the further away you keep it, the more stars.
 *
 * Pure and deterministic: fixed 1/120 s steps, beads on a polyline by arc length, the launcher's colours drawn from a
 * seeded source. Every stage is checked by playing it with a greedy shooter, which becomes its plan.
 */

export const BEAD_SLUG = "bead-parade";
export const STAGE_COUNT = 30;
export const R = 11; // bead radius
export const D = 22; // bead spacing along the track
export const DT = 1 / 120;
export const SHOT_SPEED = 720;
export const RELOAD = 0.22;
export const RUSH = 1.4; // seconds of fast roll-in at the start
export const SHOOTER: [number, number] = [180, 320];

export interface BeadStage {
  stage: number;
  /** the track's points, from where beads come in to the hole */
  track: Array<[number, number]>;
  colors: number;
  beads: number[]; // colours, front first
  speed: number; // px/s
  seed: number;
  /** the planned shots: [time (s), aim x, aim y] */
  plan: Array<[number, number, number]>;
}

export interface Bead { s: number; c: number }

export interface Parade {
  stage: BeadStage;
  /** beads from the back of the parade to the front (s rising) */
  beads: Bead[];
  t: number;
  shot: null | { x: number; y: number; vx: number; vy: number; c: number };
  reload: number;
  current: number;
  next: number;
  rng: () => number;
  shots: number;
  popped: number;
  reach: number; // furthest the front has got, as a share of the track
  over: boolean;
  won: boolean;
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

/** Cumulative arc lengths of a track. */
export function lengths(track: Array<[number, number]>): number[] {
  const out = [0];
  for (let i = 1; i < track.length; i++) out.push(out[i - 1] + Math.hypot(track[i][0] - track[i - 1][0], track[i][1] - track[i - 1][1]));
  return out;
}

const lenCache = new WeakMap<BeadStage, number[]>();
const lensOf = (st: BeadStage) => {
  let l = lenCache.get(st);
  if (!l) {
    l = lengths(st.track);
    lenCache.set(st, l);
  }
  return l;
};
export const trackLength = (st: BeadStage) => lensOf(st)[lensOf(st).length - 1];

/** The point s px along the track. */
export function pointAt(st: BeadStage, s: number): [number, number] {
  const L = lensOf(st);
  const tr = st.track;
  if (s <= 0) return tr[0];
  if (s >= L[L.length - 1]) return tr[tr.length - 1];
  let lo = 0;
  let hi = L.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (L[mid] <= s) lo = mid;
    else hi = mid;
  }
  const k = (s - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
  return [tr[lo][0] + (tr[hi][0] - tr[lo][0]) * k, tr[lo][1] + (tr[hi][1] - tr[lo][1]) * k];
}

function present(p: Parade): number[] {
  const set = new Set(p.beads.map((b) => b.c));
  return [...set].sort((a, b) => a - b);
}

function draw(p: Parade): number {
  const cs = present(p);
  if (!cs.length) return 0;
  return cs[Math.floor(p.rng() * cs.length)];
}

export function newParade(stage: BeadStage): Parade {
  // the whole parade queued up behind the entrance, front bead first in
  const beads: Bead[] = stage.beads.map((c, i) => ({ s: -(i * D), c })).reverse();
  const p: Parade = { stage, beads, t: 0, shot: null, reload: 0, current: 0, next: 0, rng: mulberry(stage.seed), shots: 0, popped: 0, reach: 0, over: false, won: false };
  p.current = draw(p);
  p.next = draw(p);
  return p;
}

export function canShoot(p: Parade): boolean {
  return !p.over && !p.shot && p.reload <= 0;
}

/** Shoots the current bead toward (x, y). */
export function shoot(p: Parade, x: number, y: number): boolean {
  if (!canShoot(p)) return false;
  const [sx, sy] = SHOOTER;
  const d = Math.hypot(x - sx, y - sy);
  if (d < 1) return false;
  p.shot = { x: sx, y: sy, vx: ((x - sx) / d) * SHOT_SPEED, vy: ((y - sy) / d) * SHOT_SPEED, c: p.current };
  p.current = p.next;
  p.next = draw(p);
  p.reload = RELOAD;
  p.shots++;
  return true;
}

/** Groups of touching beads (indices into p.beads, back to front). */
function groups(p: Parade): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = 0;
  for (let i = 1; i <= p.beads.length; i++) {
    if (i === p.beads.length || p.beads[i].s - p.beads[i - 1].s > D + 0.5) {
      out.push([start, i - 1]);
      start = i;
    }
  }
  return out;
}

/** Pops the run of one colour through index i if it has three or more; returns how many popped. */
function popAt(p: Parade, i: number): number {
  const c = p.beads[i].c;
  let a = i;
  let b = i;
  while (a > 0 && p.beads[a - 1].c === c && p.beads[a].s - p.beads[a - 1].s <= D + 0.5) a--;
  while (b < p.beads.length - 1 && p.beads[b + 1].c === c && p.beads[b + 1].s - p.beads[b].s <= D + 0.5) b++;
  const n = b - a + 1;
  if (n < 3) return 0;
  p.beads.splice(a, n);
  p.popped += n;
  return n;
}

export type StepEvent = { popped: number; landed: boolean; wasted: boolean };

export function step(p: Parade): StepEvent {
  const ev: StepEvent = { popped: 0, landed: false, wasted: false };
  if (p.over) return ev;
  const st = p.stage;
  const L = trackLength(st);
  p.t += DT;
  p.reload = Math.max(0, p.reload - DT);
  // the back group rolls forward, pushing whatever it touches
  const g = groups(p);
  if (g.length) {
    const v = p.t < RUSH ? st.speed * 5 : st.speed;
    const [a, b] = g[0];
    for (let i = a; i <= b; i++) p.beads[i].s += v * DT;
    for (let i = b + 1; i < p.beads.length; i++) if (p.beads[i].s - p.beads[i - 1].s < D) p.beads[i].s = p.beads[i - 1].s + D;
    // a group whose back matches the front of the group behind it rolls back to meet it
    for (let k = 1; k < g.length; k++) {
      const [ga] = g[k];
      const behind = ga - 1;
      if (behind < 0 || p.beads[behind].c !== p.beads[ga].c) continue;
      const pull = Math.min(260 * DT, p.beads[ga].s - p.beads[behind].s - D);
      if (pull <= 0) continue;
      for (let i = ga; i <= g[k][1]; i++) p.beads[i].s -= pull;
    }
    // where groups met with matching ends, pop the joined run
    for (let i = 1; i < p.beads.length; i++) {
      if (p.beads[i].s - p.beads[i - 1].s <= D + 0.5 && p.beads[i].c === p.beads[i - 1].c) {
        const before = p.beads.length;
        const n = popAt(p, i);
        if (n) {
          ev.popped += n;
          i = Math.max(0, i - n);
          if (p.beads.length !== before) continue;
        }
      }
    }
  }
  // the shot flies straight; it joins the parade where it hits
  if (p.shot) {
    const sh = p.shot;
    sh.x += sh.vx * DT;
    sh.y += sh.vy * DT;
    let hit = -1;
    let best = 2 * R;
    p.beads.forEach((b, i) => {
      if (b.s < 0) return;
      const [bx, by] = pointAt(st, b.s);
      const d = Math.hypot(bx - sh.x, by - sh.y);
      if (d < best) {
        best = d;
        hit = i;
      }
    });
    if (hit >= 0) {
      const hb = p.beads[hit];
      const [hx, hy] = pointAt(st, hb.s);
      const [ax, ay] = pointAt(st, hb.s + 4);
      const ahead = (sh.x - hx) * (ax - hx) + (sh.y - hy) * (ay - hy) > 0;
      const at = ahead ? hit + 1 : hit;
      const s = ahead ? hb.s + D : hb.s;
      // the beads in front of it in its group shuffle up one place
      let end = at;
      while (end < p.beads.length && (end === at || p.beads[end].s - p.beads[end - 1].s <= D + 0.5)) end++;
      for (let i = at; i < end; i++) p.beads[i].s += D;
      p.beads.splice(at, 0, { s, c: sh.c });
      for (let i = end + 1; i < p.beads.length; i++) if (p.beads[i].s - p.beads[i - 1].s < D) p.beads[i].s = p.beads[i - 1].s + D;
      p.shot = null;
      ev.landed = true;
      ev.popped += popAt(p, at);
      // the colours drawn next come from what's left
      if (!present(p).includes(p.current)) p.current = draw(p);
      if (!present(p).includes(p.next)) p.next = draw(p);
    } else if (sh.x < -20 || sh.x > 380 || sh.y < -20 || sh.y > 580) {
      p.shot = null;
      ev.wasted = true;
    }
  }
  const front = p.beads.length ? p.beads[p.beads.length - 1].s : 0;
  p.reach = Math.max(p.reach, front / L);
  if (!p.beads.length) {
    p.over = true;
    p.won = true;
  } else if (front >= L) p.over = true;
  return ev;
}

export function starsFor(p: Parade): number {
  if (!p.won) return 0;
  if (p.reach < 0.7) return 3;
  if (p.reach < 0.88) return 2;
  return 1;
}

function clone(p: Parade): Parade {
  // the colour source is replayed: keep its state by counting draws
  return { ...p, beads: p.beads.map((b) => ({ ...b })), shot: p.shot ? { ...p.shot } : null };
}

/** How good a shot at bead i looks: what it pops (with what follows), else a bead beside its own colour. */
function judge(p: Parade, x: number, y: number): number {
  const q = clone(p);
  // a throwaway colour source, so judging doesn't use up the real one
  const saved = q.rng;
  q.rng = mulberry(Math.floor(p.t * 1000) + p.shots * 7);
  shoot(q, x, y);
  let popped = 0;
  let landedAt = -1;
  for (let n = 0; n < 1.2 / DT && q.shot; n++) {
    const before = q.beads.map((b) => b.s);
    const ev = step(q);
    popped += ev.popped;
    if (ev.landed) landedAt = before.length;
    if (ev.wasted) return -50;
  }
  // let any meetings play out
  for (let n = 0; n < 0.8 / DT; n++) popped += step(q).popped;
  q.rng = saved;
  if (q.won) return 1e6;
  if (q.over) return -1e6;
  let v = popped * 20;
  if (landedAt >= 0 && popped === 0) {
    // landed without popping: worth it next to a bead of the same colour
    let pairs = 0;
    for (let i = 1; i < q.beads.length; i++) if (q.beads[i].c === q.beads[i - 1].c && q.beads[i].s - q.beads[i - 1].s <= D + 0.5) pairs++;
    v += pairs;
  }
  // keep the front well back
  const front = q.beads.length ? q.beads[q.beads.length - 1].s / trackLength(q.stage) : 0;
  return v - front * 10;
}

/** The best aim now: a bead's centre (each visible bead tried). */
export function bestAim(p: Parade, rng?: () => number, noise = 0): [number, number] | null {
  let best: [number, number] | null = null;
  let bestV = -Infinity;
  const seen = new Set<string>();
  for (const b of p.beads) {
    if (b.s < 0) continue;
    const [x, y] = pointAt(p.stage, b.s);
    const key = `${Math.round(x / 4)}:${Math.round(y / 4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const v = judge(p, x, y);
    if (v > bestV) {
      bestV = v;
      best = [x, y];
    }
  }
  if (best && noise > 0 && rng) {
    // a human aim: the angle a little off
    const [sx, sy] = SHOOTER;
    const a = Math.atan2(best[1] - sy, best[0] - sx) + (rng() * 2 - 1) * noise;
    const d = Math.hypot(best[0] - sx, best[1] - sy);
    best = [sx + Math.cos(a) * d, sy + Math.sin(a) * d];
  }
  return best;
}

export interface ShooterOpts {
  /** how far off (radians, either way) each shot may be */
  noise?: number;
  /** chance a shot goes at any bead rather than the best one */
  slip?: number;
  /** how long (s, up to) a shooter takes to line up each shot after reloading */
  pause?: number;
  seed?: number;
  mode?: "plan" | "human" | "random";
}

/** Plays a stage: its planned shots, a human-like shooter who aims a little off, or shots in random directions. */
export function pilot(st: BeadStage, opts: ShooterOpts = {}): Parade {
  const { noise = 0, slip = 0, pause = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2273 + 11);
  const p = newParade(st);
  let k = 0;
  let ready = 0;
  for (let n = 0; n < 240 / DT && !p.over; n++) {
    if (mode === "plan") {
      while (k < st.plan.length && p.t >= st.plan[k][0] - 1e-9 && canShoot(p)) {
        shoot(p, st.plan[k][1], st.plan[k][2]);
        k++;
      }
    } else if (canShoot(p) && p.t > RUSH && p.t >= ready) {
      if (mode === "random") {
        const a = rng() * Math.PI * 2;
        shoot(p, SHOOTER[0] + Math.cos(a) * 100, SHOOTER[1] + Math.sin(a) * 100);
      } else {
        let aim = bestAim(p, rng, noise);
        if (rng() < slip) {
          // a hasty shot at whatever bead catches the eye
          const vis = p.beads.filter((b) => b.s >= 0);
          if (vis.length) aim = pointAt(st, vis[Math.floor(rng() * vis.length)].s);
        }
        if (aim) shoot(p, aim[0], aim[1]);
      }
      ready = p.t + RELOAD + rng() * pause;
    }
    step(p);
  }
  return p;
}

/** Human-like shooters: up to 0.6 s to line up each shot, every shot up to 3° off, one in three at any bead. */
export const HUMAN_SHOOTERS: ShooterOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ mode: "human", noise: 0.05, slip: 0.33, pause: 0.6, seed }));

/** A spiral track from the edge of the lawn into the hole beside the launcher. */
export function spiral(stage: number, rng: () => number): Array<[number, number]> {
  const turns = Math.min(2.2, 1.25 + stage * 0.03);
  const start = rng() * Math.PI * 2;
  const pts: Array<[number, number]> = [];
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = start + t * turns * Math.PI * 2;
    const r = 1 - t * 0.62;
    pts.push([Math.round((SHOOTER[0] + Math.cos(a) * 158 * r) * 10) / 10, Math.round((SHOOTER[1] + Math.sin(a) * 205 * r) * 10) / 10]);
  }
  return pts;
}

function shape(stage: number) {
  return {
    beads: Math.min(56, 22 + Math.round(stage * 1.2)),
    colors: stage < 4 ? 3 : stage < 14 ? 4 : 5,
    speed: Math.min(38, 20 + stage * 0.65),
  };
}

/** Plays the greedy shooter on a stage to find its plan (null if it doesn't clear the parade with three stars). */
export function planFor(st: BeadStage): Array<[number, number, number]> | null {
  const p = newParade(st);
  const plan: Array<[number, number, number]> = [];
  for (let n = 0; n < 240 / DT && !p.over; n++) {
    if (canShoot(p) && p.t > RUSH) {
      const aim = bestAim(p);
      if (aim) {
        plan.push([Math.round(p.t * 1000) / 1000, Math.round(aim[0] * 100) / 100, Math.round(aim[1] * 100) / 100]);
        shoot(p, aim[0], aim[1]);
      }
    }
    step(p);
  }
  return p.won && starsFor(p) === 3 ? plan : null;
}

export function buildStage(stage: number): BeadStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(751000 + stage * 499 + attempt * 7919);
    const track = spiral(stage, rng);
    // runs of one colour, two or three long, so the parade has pairs to aim at
    const beads: number[] = [];
    while (beads.length < sh.beads) {
      const c = Math.floor(rng() * sh.colors);
      if (beads.length && beads[beads.length - 1] === c) continue;
      const run = rng() < 0.5 ? 2 : 1;
      for (let k = 0; k < run && beads.length < sh.beads; k++) beads.push(c);
    }
    const st: BeadStage = { stage, track, colors: sh.colors, beads, speed: sh.speed, seed: 761000 + stage * 503 + attempt, plan: [] };
    const plan = planFor(st);
    if (!plan) continue;
    st.plan = plan;
    const planned = pilot(st);
    if (!planned.won || starsFor(planned) < 3) continue;
    if (HUMAN_SHOOTERS.filter((o) => pilot(st, o).won).length < 7) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`bead-parade stage ${stage + 1}: no fair parade`);
}

/** The 30 parades, built once by scripts/build-bead-parade-stages.ts (playing them through takes minutes, too slow for a page). */
export { BEAD_STAGES } from "./bead-parade-stages";
