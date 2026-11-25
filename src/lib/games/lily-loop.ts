/**
 * Lily Loop (개구리 한 바퀴) — an OIYO original conveyor colour-clear puzzle (2026-11-25).
 *
 * A pond mosaic is made of coloured berries. Hungry frogs wait in lines below, each one a colour with a number on its
 * back: how many berries it can eat. Send a frog onto the lily-pad loop and it rides once around the mosaic, gobbling
 * the berries of its own colour that it can see from the edge — straight in, as far as its colour goes. A frog still
 * hungry after its lap hops onto a waiting pad, where you can send it round again; when every pad is taken and another
 * hungry frog comes back, the pond is in a jam. Eat the whole picture.
 *
 * Pure and deterministic: frogs move one pad per tick; every stage's picture, frogs and lines are seeded per stage
 * and kept only when a search finds the sends that clear it.
 */

export const LILY_SLUG = "lily-loop";
export const STAGE_COUNT = 30;
export const EMPTY = -1;
export const BELT_MAX = 4;

export interface LilyStage {
  stage: number;
  rows: number;
  cols: number;
  /** colour of each cell (index into colors), or EMPTY */
  cells: number[];
  colors: string[];
  /** the lines of frogs, front first: [colour, berries] */
  lanes: Array<Array<[number, number]>>;
  /** how many waiting pads there are */
  pads: number;
  /** a way to clear it: a line's front frog (its index) or a waiting frog (100 + pad) */
  plan: number[];
  par: number;
}

export interface Frog {
  color: number;
  ammo: number;
  pos: number;
}

export interface Pond {
  stage: LilyStage;
  cells: number[];
  lanes: Array<Array<[number, number]>>;
  pads: Array<[number, number] | null>;
  belt: Frog[];
  sends: number;
  ticks: number;
  over: boolean;
  won: boolean;
  why: "" | "jam" | "hungry";
}

export function newPond(stage: LilyStage): Pond {
  return {
    stage,
    cells: stage.cells.slice(),
    lanes: stage.lanes.map((l) => l.map((f) => [f[0], f[1]] as [number, number])),
    pads: new Array(stage.pads).fill(null),
    belt: [],
    sends: 0,
    ticks: 0,
    over: false,
    won: false,
    why: "",
  };
}

export const lapLength = (st: LilyStage) => 2 * (st.rows + st.cols);

/** The cells a frog at loop position p looks at, nearest first. */
export function lineAt(st: LilyStage, p: number): number[] {
  const { rows: R, cols: C } = st;
  const out: number[] = [];
  if (p < C) for (let r = 0; r < R; r++) out.push(r * C + p);
  else if (p < C + R) for (let c = C - 1; c >= 0; c--) out.push((p - C) * C + c);
  else if (p < 2 * C + R) {
    const c = C - 1 - (p - C - R);
    for (let r = R - 1; r >= 0; r--) out.push(r * C + c);
  } else {
    const r = R - 1 - (p - 2 * C - R);
    for (let c = 0; c < C; c++) out.push(r * C + c);
  }
  return out;
}

/** Whether a frog can be sent now: the start of the loop must be clear. */
export function canSend(p: Pond): boolean {
  return !p.over && p.belt.length < BELT_MAX && !p.belt.some((f) => f.pos < 2);
}

/** Sends a line's front frog (choice = line) or a waiting one (choice = 100 + pad). */
export function send(p: Pond, choice: number): boolean {
  if (!canSend(p)) return false;
  let frog: [number, number] | null = null;
  if (choice >= 100) {
    frog = p.pads[choice - 100] ?? null;
    if (!frog) return false;
    p.pads[choice - 100] = null;
  } else {
    const lane = p.lanes[choice];
    if (!lane || !lane.length) return false;
    frog = lane.shift() as [number, number];
  }
  p.belt.push({ color: frog[0], ammo: frog[1], pos: -1 });
  p.sends++;
  return true;
}

export type TickEvent = { ate: number[]; back: number; gone: number };

/** One tick: every frog on the loop moves one pad on and eats what it can see. */
export function tick(p: Pond): TickEvent {
  const ev: TickEvent = { ate: [], back: 0, gone: 0 };
  if (p.over) return ev;
  const st = p.stage;
  const L = lapLength(st);
  p.ticks++;
  for (const f of p.belt) {
    f.pos++;
    if (f.pos >= L) continue;
    for (const i of lineAt(st, f.pos)) {
      if (p.cells[i] === EMPTY) continue;
      if (p.cells[i] !== f.color || f.ammo <= 0) break;
      p.cells[i] = EMPTY;
      f.ammo--;
      ev.ate.push(i);
    }
  }
  // frogs that finished the lap: full ones leave, hungry ones wait on a pad
  const done = p.belt.filter((f) => f.pos >= L);
  p.belt = p.belt.filter((f) => f.pos < L);
  for (const f of done) {
    if (f.ammo <= 0) {
      ev.gone++;
      continue;
    }
    const k = p.pads.indexOf(null);
    if (k < 0) {
      p.over = true;
      p.why = "jam";
      return ev;
    }
    p.pads[k] = [f.color, f.ammo];
    ev.back++;
  }
  if (p.cells.every((v) => v === EMPTY)) {
    p.over = true;
    p.won = true;
  } else if (!p.belt.length && p.lanes.every((l) => !l.length) && p.pads.every((x) => !x)) {
    p.over = true;
    p.why = "hungry";
  }
  return ev;
}

/** Sends a frog and runs until the loop is empty again. */
export function lap(p: Pond, choice: number): boolean {
  if (!send(p, choice)) return false;
  for (let n = 0; n < 1000 && p.belt.length && !p.over; n++) tick(p);
  return true;
}

export function starsFor(p: Pond): number {
  if (!p.won) return 0;
  if (p.sends <= p.stage.par + 1) return 3;
  if (p.sends <= p.stage.par + 3) return 2;
  return 1;
}

export const choices = (p: Pond): number[] => [
  ...p.lanes.map((l, k) => (l.length ? k : -1)).filter((k) => k >= 0),
  ...p.pads.map((f, k) => (f ? 100 + k : -1)).filter((k) => k >= 0),
];

function clone(p: Pond): Pond {
  return { ...p, cells: p.cells.slice(), lanes: p.lanes.map((l) => l.map((f) => [f[0], f[1]] as [number, number])), pads: p.pads.map((f) => (f ? ([f[0], f[1]] as [number, number]) : null)), belt: p.belt.map((f) => ({ ...f })) };
}

const left = (p: Pond) => p.cells.filter((v) => v !== EMPTY).length;
const padsUsed = (p: Pond) => p.pads.filter(Boolean).length;
const keyOf = (p: Pond) => p.cells.join("") + "|" + p.lanes.map((l) => l.length).join(",") + "|" + p.pads.map((f) => (f ? f.join(":") : "-")).sort().join(",");

/** Beam search, one frog's lap at a time, for sends that clear the picture. */
export function solve(st: LilyStage, width = 120): number[] | null {
  let beam: Array<{ p: Pond; path: number[] }> = [{ p: newPond(st), path: [] }];
  const seen = new Set<string>();
  for (let depth = 0; depth < 80 && beam.length; depth++) {
    const next: Array<{ p: Pond; path: number[]; v: number }> = [];
    for (const { p, path } of beam) {
      for (const c of choices(p)) {
        const q = clone(p);
        lap(q, c);
        if (q.won) return [...path, c];
        if (q.over) continue;
        const k = keyOf(q);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ p: q, path: [...path, c], v: -left(q) * 10 - padsUsed(q) * 4 - q.sends });
      }
    }
    next.sort((a, z) => z.v - a.v);
    beam = next.slice(0, width);
  }
  return null;
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

export interface KeeperOpts {
  /** chance a frog is sent without looking */
  slip?: number;
  seed?: number;
  mode?: "plan" | "think" | "random";
}

/**
 * Plays a stage one lap at a time: the plan, a keeper who sends the frog that would eat the most (and sometimes one at
 * random), or random sends.
 */
export function pilot(st: LilyStage, opts: KeeperOpts = {}): Pond {
  const { slip = 0, seed = 1, mode = "think" } = opts;
  const rng = mulberry(seed * 2287 + 41);
  const p = newPond(st);
  if (mode === "plan") {
    for (const c of st.plan) if (!p.over) lap(p, c);
    return p;
  }
  let guard = 0;
  while (!p.over && guard++ < 200) {
    const cs = choices(p);
    if (!cs.length) break;
    if (mode === "random" || rng() < slip) {
      lap(p, cs[Math.floor(rng() * cs.length)]);
      continue;
    }
    let best = cs[0];
    let bestV = -Infinity;
    for (const c of cs) {
      const q = clone(p);
      lap(q, c);
      const v = q.won ? 1e6 : q.over ? -1e6 : (left(p) - left(q)) * 10 - padsUsed(q) * 3 + rng();
      if (v > bestV) {
        bestV = v;
        best = c;
      }
    }
    lap(p, best);
  }
  if (!p.over) p.over = true;
  return p;
}

/** Human-like keepers: send the frog that eats the most, one send in ten without looking. */
export const HUMAN_KEEPERS: KeeperOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ slip: 0.1, seed }));

// ---------------- pictures ----------------

interface Picture { palette: Record<string, string>; rows: string[] }

/** Hand-drawn mosaics for the first stages. */
export const PICTURES: Picture[] = [
  { palette: { r: "#fa5252", p: "#ffa8a8" }, rows: [".rr..rr.", "rppr.rrr", "rprrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr..."] },
  { palette: { y: "#fcc419", o: "#f08c00" }, rows: ["....y....", "...yyy...", "yyyyoyyyy", ".yyoooyy.", "..yyoyy..", "..yy.yy..", ".yy...yy."] },
  { palette: { g: "#40c057", l: "#b2f2bb", d: "#2b8a3e" }, rows: ["....gg...", "...gglg..", "..gglgdg.", ".gglgdgg.", ".glgdggg.", ".gdglgg..", "..dggg...", ".d.......", "d........"] },
  { palette: { r: "#e03131", w: "#fff5f5", b: "#e9c46a" }, rows: ["...rrr...", ".rrwrrrr.", "rrrrrwrrr", "rwrrrrrwr", "rrrrrrrrr", "...bbb...", "...bbb...", "..bbbbb.."] },
  { palette: { o: "#ff922b", w: "#fff4e6", k: "#343a40" }, rows: ["....ooo.....", "..oooowoo..o", ".oookowwoooo", "ooooooowwoo.", ".ooooowwoooo", "..oooooooo.o", "....ooo....."] },
  { palette: { p: "#f783ac", y: "#ffd43b", g: "#51cf66" }, rows: ["..pp.pp..", ".pppppppp", "..ppyypp.", ".ppyyyypp", "..ppyypp.", ".pppppppp", "..pp.pp..", "....g....", "...ggg..."] },
  { palette: { r: "#e03131", k: "#212529", w: "#f8f9fa" }, rows: ["....kk....", "...kwwk...", "..rrkkrr..", ".rrkrrkrr.", "rrrrkkrrrr", "rkrrkkrrkr", "rrrrkkrrrr", ".rrkrrkrr.", "..rrkkrr.."] },
  { palette: { o: "#fd7e14", k: "#212529", p: "#ff8787", w: "#fff9db" }, rows: ["o........o", "oo......oo", "oooooooooo", "ookoooooko", "oooowwoooo", "ooowpwwooo", "oooowwoooo", ".oooooooo.", "..oooooo.."] },
  { palette: { p: "#faa2c1", c: "#e03131", b: "#e9a553", d: "#a9652a" }, rows: ["...cc...", "..pppp..", ".pppppp.", "pppppppp", "pppppppp", "bdbdbdbd", ".bdbdbd.", ".dbdbdb.", "..bdbd..", "..dbdb..", "...bd..."] },
  { palette: { b: "#4dabf7", w: "#e7f5ff", d: "#1864ab", y: "#ffd43b" }, rows: [".....bb.....", "...bbbbbb...", "..bwbbbbbb..", ".bbbbbbbbbbd", "bbbbbbbbbbdd", "bbyybbbbbddd", ".bbbbbbbbbdd", "..bbbbbbbbd.", "....bbbb...."] },
];

const PALETTES = [
  ["#51cf66", "#2b8a3e", "#ffd43b", "#212529", "#ff8787"],
  ["#748ffc", "#364fc7", "#ffffff", "#212529", "#ffa94d"],
  ["#ff922b", "#d9480f", "#fff4e6", "#212529", "#66d9e8"],
  ["#cc5de8", "#862e9c", "#fcc2d7", "#212529", "#94d82d"],
  ["#22b8cf", "#0b7285", "#e3fafc", "#212529", "#ff6b6b"],
];

/** A round pixel critter: body, outline, belly or stripes, eyes and cheeks, in k colours (mirrored, so it reads). */
export function critter(seed: number, size: number, k: number): Picture {
  const rng = mulberry(seed * 977 + 13);
  const g: string[][] = Array.from({ length: size }, () => new Array(size).fill("."));
  const cx = (size - 1) / 2;
  const rx = size * (0.4 + rng() * 0.08);
  const ry = size * (0.33 + rng() * 0.07);
  const cy = size - 1.5 - ry;
  const inBody = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (inBody(x, y)) g[y][x] = "b";
  // ears (two blocks) or antennae (two thin stalks) on top, two feet below
  const top = Math.max(0, Math.round(cy - ry));
  const ex = Math.max(1, Math.round(rx * 0.55));
  const ears = rng() < 0.5;
  for (const sx of [-1, 1]) {
    const x = Math.round(cx + sx * ex);
    if (ears) {
      for (let y = Math.max(0, top - 2); y <= top; y++) for (const dx of [0, sx]) if (x + dx >= 0 && x + dx < size) g[y][x + dx] = "b";
    } else {
      for (let y = Math.max(0, top - 2); y < top; y++) g[y][x] = "b";
      if (top - 3 >= 0) g[top - 3][x] = "b";
    }
    const fx = Math.round(cx + sx * rx * 0.5);
    if (fx >= 0 && fx < size) g[size - 1][fx] = "b";
  }
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < size && y < size ? g[y][x] : ".");
  // outline where the body meets the outside
  if (k >= 2) {
    const edge: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (g[y][x] === "b" && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(".")) edge.push([x, y]);
    for (const [x, y] of edge) g[y][x] = "o";
  }
  // a belly, or stripes across the back
  if (k >= 3) {
    if (rng() < 0.6) {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (g[y][x] === "b" && ((x - cx) / (rx * 0.5)) ** 2 + ((y - cy - ry * 0.35) / (ry * 0.45)) ** 2 <= 1) g[y][x] = "s";
    } else {
      for (let y = 0; y < size; y++) if ((y + Math.floor(rng() * 2)) % 3 === 0) for (let x = 0; x < size; x++) if (g[y][x] === "b" && y > cy) g[y][x] = "s";
    }
  }
  // two eyes
  if (k >= 4) {
    const ey = Math.round(cy - ry * 0.25);
    const dx = Math.max(1, Math.round(rx * 0.4));
    for (const x of [Math.round(cx - dx), Math.round(cx + dx)]) if (at(x, ey) !== ".") g[ey][x] = "e";
  }
  // cheeks under the eyes
  if (k >= 5) {
    const ey = Math.round(cy - ry * 0.25) + 1;
    const dx = Math.max(2, Math.round(rx * 0.65));
    for (const x of [Math.round(cx - dx), Math.round(cx + dx)]) if (at(x, ey) === "b" || at(x, ey) === "s") g[ey][x] = "c";
  }
  // mirror the left half, so odd rounding never leaves it lopsided
  for (let y = 0; y < size; y++) for (let x = 0; x < Math.floor(size / 2); x++) g[y][size - 1 - x] = g[y][x];
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  return { palette: { b: pal[0], o: pal[1], s: pal[2], e: pal[3], c: pal[4] }, rows: g.map((r) => r.join("")) };
}

function pictureFor(stage: number, variant = 0): Picture {
  if (stage < PICTURES.length) return PICTURES[stage];
  const k = stage < 15 ? 3 : stage < 22 ? 4 : 5;
  const size = stage < 15 ? 9 : stage < 22 ? 10 : 11;
  return critter(stage * 31 + 7 + variant * 1009, size, k);
}

function shape(stage: number) {
  return {
    lanes: stage < 4 ? 2 : 3,
    pads: stage < 15 ? 3 : stage < 24 ? 2 : 1,
    chunks: stage < 4 ? [6, 8, 10] : stage < 10 ? [4, 6, 8] : [3, 4, 5, 6],
  };
}

/** Human-like keepers have to clear at least this many in eight. */
const HUMANS_NEEDED = 7;

export function buildStage(stage: number): LilyStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 800; attempt++) {
    // a fresh critter every 50 tries, in case one picture can't be made fair
    const pic = pictureFor(stage, Math.floor(attempt / 50));
    const keys = Object.keys(pic.palette);
    const rows = pic.rows.length;
    const cols = Math.max(...pic.rows.map((r) => r.length));
    const cells: number[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(keys.indexOf(pic.rows[r][c] ?? "."));
    const used = keys.filter((_, k) => cells.includes(k));
    const remap = keys.map((key) => used.indexOf(key));
    for (let i = 0; i < cells.length; i++) if (cells[i] >= 0) cells[i] = remap[cells[i]];
    const colors = used.map((key) => pic.palette[key]);
    const rng = mulberry(711000 + stage * 467 + attempt * 7919);
    // every colour's berries split into frogs
    const frogs: Array<[number, number]> = [];
    colors.forEach((_, k) => {
      let n = cells.filter((v) => v === k).length;
      while (n > 0) {
        let a = sh.chunks[Math.floor(rng() * sh.chunks.length)];
        if (a >= n || n - a < 3) a = n;
        frogs.push([k, a]);
        n -= a;
      }
    });
    for (let i = frogs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [frogs[i], frogs[j]] = [frogs[j], frogs[i]];
    }
    const lanes: Array<Array<[number, number]>> = Array.from({ length: sh.lanes }, () => []);
    frogs.forEach((f, i) => lanes[i % sh.lanes].push(f));
    const st: LilyStage = { stage, rows, cols, cells, colors, lanes, pads: sh.pads, plan: [], par: 0 };
    const plan = solve(st);
    if (!plan) continue;
    st.plan = plan;
    st.par = plan.length;
    if (!pilot(st, { mode: "plan" }).won) continue;
    if (HUMAN_KEEPERS.filter((o) => pilot(st, o).won).length < HUMANS_NEEDED) continue;
    // anyone can clear the first twenty ponds (the stars reward planning); from stage 21 on, with fewer pads, sending
    // frogs without looking mostly jams the pond
    const randomWins = Array.from({ length: 30 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length;
    if (stage >= 20 && randomWins > 6) continue;
    if (stage >= 20 && [1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`lily-loop stage ${stage + 1}: no fair pond`);
}

/** The 30 ponds, built once by scripts/build-lily-loop-stages.ts (searching takes a while, too slow for a page). */
export { LILY_STAGES } from "./lily-loop-stages";
