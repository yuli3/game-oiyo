/**
 * Cable Knot (엉킨 전선) — an OIYO original untangle puzzle (2026-11-25).
 *
 * The desk is a mess of charging cables. Each plug sits in a socket on the board, a few sockets are empty, and the
 * cables run straight between plugs, crossing each other everywhere. Tap a plug, then an empty socket, and the plug
 * moves there. Get the board to zero crossings within the move limit; the fewer moves, the more stars.
 *
 * Pure and deterministic: every board is made by laying out a tidy (crossing-free) desk and then moving some plugs,
 * so an answer always exists.
 */

export const CABLE_SLUG = "cable-knot";
export const STAGE_COUNT = 30;

export interface Point { x: number; y: number }
export interface CableStage {
  stage: number;
  sockets: Point[]; // fixed places on the desk (field px); there are more sockets than plugs
  plugs: number;
  edges: Array<[number, number]>; // cables between plugs
  start: number[]; // start[plug] = socket
  limit: number; // moves allowed
  par: number; // moves a quick solver needs
}

export interface Desk {
  stage: CableStage;
  at: number[]; // at[plug] = socket
  moves: number;
  over: boolean;
  won: boolean;
}

export const newDesk = (stage: CableStage): Desk => ({ stage, at: stage.start.slice(), moves: 0, over: false, won: false });

function cross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** Fast crossing counts for one desk: a lazily filled table of which socket-to-socket cables cross. */
class Counter {
  readonly n: number;
  readonly tab: Int8Array; // −1 not yet worked out, 0 no, 1 yes
  readonly inc: number[][]; // cables at each plug
  constructor(readonly st: CableStage) {
    const n = st.sockets.length;
    this.n = n;
    this.tab = new Int8Array(n * n * n * n).fill(-1);
    this.inc = Array.from({ length: st.plugs }, () => [] as number[]);
    st.edges.forEach(([x, y], i) => {
      this.inc[x].push(i);
      this.inc[y].push(i);
    });
  }
  crosses(at: number[], i: number, j: number): boolean {
    const [a, b] = this.st.edges[i];
    const [c, d] = this.st.edges[j];
    if (a === c || a === d || b === c || b === d) return false;
    const n = this.n;
    const k = ((at[a] * n + at[b]) * n + at[c]) * n + at[d];
    if (this.tab[k] < 0) {
      const s = this.st.sockets;
      this.tab[k] = cross(s[at[a]], s[at[b]], s[at[c]], s[at[d]]) ? 1 : 0;
    }
    return this.tab[k] === 1;
  }
  total(at: number[]): number {
    let t = 0;
    const E = this.st.edges.length;
    for (let i = 0; i < E; i++) for (let j = i + 1; j < E; j++) if (this.crosses(at, i, j)) t++;
    return t;
  }
  /** Crossings that involve a cable at this plug. */
  around(at: number[], plug: number): number {
    const E = this.st.edges.length;
    let t = 0;
    for (const i of this.inc[plug]) for (let j = 0; j < E; j++) if (j !== i && this.crosses(at, i, j)) t++;
    return t;
  }
  afterMove(at: number[], total: number, plug: number, socket: number): number {
    const before = this.around(at, plug);
    const was = at[plug];
    at[plug] = socket;
    const after = this.around(at, plug);
    at[plug] = was;
    return total - before + after;
  }
}

const counters = new WeakMap<CableStage, Counter>();
function counterFor(st: CableStage): Counter {
  let k = counters.get(st);
  if (!k) {
    k = new Counter(st);
    counters.set(st, k);
  }
  return k;
}

/** How many pairs of cables cross (cables sharing a plug never count). */
export const crossCount = (st: CableStage, at: number[]) => counterFor(st).total(at);

/** Whether a cable crosses any other (for drawing it red). */
export function tangled(st: CableStage, at: number[], i: number): boolean {
  const k = counterFor(st);
  for (let j = 0; j < st.edges.length; j++) if (j !== i && k.crosses(at, i, j)) return true;
  return false;
}

export const emptySockets = (d: Desk) => d.stage.sockets.map((_, s) => s).filter((s) => !d.at.includes(s));

/** Moves a plug to an empty socket. */
export function move(d: Desk, plug: number, socket: number): boolean {
  if (d.over || plug < 0 || plug >= d.at.length || socket < 0 || socket >= d.stage.sockets.length || d.at.includes(socket)) return false;
  d.at[plug] = socket;
  d.moves++;
  if (crossCount(d.stage, d.at) === 0) {
    d.over = true;
    d.won = true;
  } else if (d.moves >= d.stage.limit) d.over = true;
  return true;
}

export function starsFor(d: Desk): number {
  if (!d.won) return 0;
  if (d.moves <= d.stage.par) return 3;
  if (d.moves <= Math.ceil((d.stage.par + d.stage.limit) / 2)) return 2;
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

export interface UntanglerOpts {
  /** how many of the best-looking moves a person weighs, picking among them */
  breadth?: number;
  /** chance of a careless move */
  slip?: number;
  seed?: number;
  /** "think" picks a move that removes crossings; "random" moves any plug anywhere free */
  mode?: "think" | "random";
}

/** The next move a person would make: the plug and the empty socket. */
export function nextMove(d: Desk, opts: UntanglerOpts, rng: () => number, recent: Array<[number, number]>): [number, number] {
  const { breadth = 1, slip = 0, mode = "think" } = opts;
  const st = d.stage;
  const empty = emptySockets(d);
  if (mode === "random" || rng() < slip) return [Math.floor(rng() * st.plugs), empty[Math.floor(rng() * empty.length)]];
  const k = counterFor(st);
  const now = k.total(d.at);
  const options: Array<{ p: number; s: number; c: number; r: number }> = [];
  for (let p = 0; p < st.plugs; p++) for (const s of empty) options.push({ p, s, c: k.afterMove(d.at, now, p, s), r: rng() });
  options.sort((x, y) => x.c - y.c || x.r - y.r);
  // never put a plug straight back; when nothing helps, take the least-bad fresh move
  const fresh = options.filter((o) => !recent.some(([p, s]) => p === o.p && s === o.s));
  const pool = (fresh.length ? fresh : options).slice(0, Math.max(1, options[0].c < now ? breadth : 1));
  const pick = pool[Math.floor(rng() * pool.length)];
  return [pick.p, pick.s];
}

export function pilot(st: CableStage, opts: UntanglerOpts = {}): Desk {
  const rng = mulberry((opts.seed ?? 1) * 2207 + 31);
  const d = newDesk(st);
  const recent: Array<[number, number]> = [];
  while (!d.over) {
    const from = d.at.slice();
    const [p, s] = nextMove(d, opts, rng, recent);
    move(d, p, s);
    recent.push([p, from[p]]);
    if (recent.length > 4) recent.shift();
  }
  return d;
}

function shape(stage: number) {
  return {
    plugs: 7 + Math.floor(stage / 4), // 7 → 14
    spare: stage < 10 ? 5 : 4, // empty sockets
    moved: 3 + Math.floor(stage / 6), // plugs moved off their tidy socket: 3 → 7
    slack: stage < 5 ? 3.5 : stage < 15 ? 3 : 2.6,
  };
}

/** Human-like untanglers: weigh the best three moves and take one, a careless move one time in ten. */
export const HUMAN_UNTANGLERS: UntanglerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ breadth: 3, slip: 0.1, seed }));

export function layout(stage: number, attempt: number): CableStage | null {
  const sh = shape(stage);
  const rng = mulberry(371000 + stage * 239 + attempt * 7919);
  const n = sh.plugs;
  const total = n + sh.spare;
  // sockets scattered over the desk, kept apart
  const sockets: Point[] = [];
  for (let tries = 0; tries < 600 && sockets.length < total; tries++) {
    const p = { x: Math.round(36 + rng() * 288), y: Math.round(140 + rng() * 320) };
    if (sockets.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 56)) continue;
    sockets.push(p);
  }
  if (sockets.length < total) return null;
  // cables: the shortest links among the first n sockets that cross nothing laid so far (a tidy desk)
  const pairs: Array<[number, number, number]> = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b, Math.hypot(sockets[a].x - sockets[b].x, sockets[a].y - sockets[b].y)]);
  pairs.sort((x, y) => x[2] - y[2]);
  const edges: Array<[number, number]> = [];
  const deg = new Array(n).fill(0);
  const tidy = Array.from({ length: n }, (_, i) => i);
  for (const [a, b] of pairs) {
    if (deg[a] >= 3 || deg[b] >= 3) continue;
    const trial: CableStage = { stage, sockets, plugs: n, edges: [...edges, [a, b]], start: tidy, limit: 0, par: 0 };
    if (crossCount(trial, tidy) > 0) continue;
    edges.push([a, b]);
    deg[a]++;
    deg[b]++;
  }
  if (deg.some((x) => x < 1) || edges.length < n) return null;
  // move some plugs onto other sockets (the spare ones included)
  const moved = shuffle(tidy, rng).slice(0, Math.min(n, sh.moved));
  const free = shuffle([...moved, ...Array.from({ length: sh.spare }, (_, i) => n + i)], rng);
  const start = tidy.slice();
  moved.forEach((plug, k) => (start[plug] = free[k]));
  const st: CableStage = { stage, sockets, plugs: n, edges, start, limit: 0, par: 0 };
  if (crossCount(st, start) < Math.min(2 + Math.floor(stage / 3), 10)) return null;
  return st;
}

/** Sets the move limit from slower human-like untanglers with room to spare; random moving must run out. */
export function buildStage(stage: number): CableStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 1500; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    st.limit = 120;
    const quick = pilot(st, { breadth: 1, seed: 1 });
    if (!quick.won || quick.moves > sh.moved * 2) continue;
    const runs = HUMAN_UNTANGLERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const slowest = Math.max(...runs.map((r) => r.moves));
    if (slowest > Math.max(10, quick.moves * 4)) continue; // no desk that only luck untangles
    st.par = Math.ceil(quick.moves * 1.5) + 1;
    st.limit = Math.ceil(slowest * sh.slack) + 6;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`cable-knot stage ${stage + 1}: no fair desk`);
}

/** The 30 desks, each built the first time it is asked for (building all of them up front takes a couple of seconds). */
export const CABLE_STAGES: CableStage[] = [];
const built: CableStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(CABLE_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
