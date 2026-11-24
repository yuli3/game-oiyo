/**
 * Scarf Knit (목도리 뜨기) — knit Grandma's two-colour pattern into a scarf before Seollal.
 *
 * The needle runs along a row stitch by stitch, one way and then back, the way flat knitting goes. Hold to
 * knit with the red yarn; let go to knit with the cream. Above the needle, the chart shows the pattern for
 * the row. Change yarn exactly where the chart changes colour — a stitch takes whichever yarn you hold as the
 * needle passes its middle. Rows grow wider, the needle speeds up and the motifs get finer. Knit enough
 * stitches true to the chart and the scarf is ready to wrap around someone you love.
 *
 * Pure and deterministic: charts are seeded per stage.
 */

export const SCARF_SLUG = "scarf-knit";
export const STAGE_COUNT = 30;
export const LEAD = 1; // s before the first stitch of each row
export const TURN = 0.7; // s to turn the work between rows

export interface ScarfStage {
  stage: number;
  rows: number[][]; // 0 cream, 1 red; each row as charted left to right
  speed: number; // stitches per second
  need: number; // stitches knitted true to the chart
  total: number;
}

export interface Knitting {
  stage: ScarfStage;
  t: number; // s into the current row (negative while turning)
  row: number;
  made: number[][]; // colours knitted so far, in chart order (left to right)
  good: number;
  over: boolean;
  won: boolean;
}

/** Row r goes left to right when even, right to left when odd. */
export const forward = (r: number) => r % 2 === 0;

export function newKnitting(stage: ScarfStage): Knitting {
  return { stage, t: -LEAD, row: 0, made: stage.rows.map(() => []), good: 0, over: false, won: false };
}

/** Time (from the row's start) when the needle reaches the middle of the k-th stitch it knits in a row. */
export const stitchTime = (st: ScarfStage, k: number) => (k + 0.5) / st.speed;

/** Chart index of the k-th stitch knitted in row r. */
export const chartIndex = (st: ScarfStage, r: number, k: number) => (forward(r) ? k : st.rows[r].length - 1 - k);

export interface KnitEvents { stitched: Array<{ row: number; col: number; good: boolean }>; rowDone: boolean; end: boolean }

/** Advances by dt with the red yarn held (true) or not. */
export function stepKnitting(kn: Knitting, holding: boolean, dt: number): KnitEvents {
  const ev: KnitEvents = { stitched: [], rowDone: false, end: false };
  if (kn.over) return ev;
  const st = kn.stage;
  const before = kn.t;
  kn.t += dt;
  const row = st.rows[kn.row];
  for (;;) {
    const k = kn.made[kn.row].filter((v) => v >= 0).length;
    if (k >= row.length) break;
    const at = stitchTime(st, k);
    if (!(at > before - 1e-9 && at <= kn.t)) break;
    const col = chartIndex(st, kn.row, k);
    const colour = holding ? 1 : 0;
    if (kn.made[kn.row].length < row.length) kn.made[kn.row] = new Array(row.length).fill(-1);
    kn.made[kn.row][col] = colour;
    const good = colour === row[col];
    if (good) kn.good++;
    ev.stitched.push({ row: kn.row, col, good });
    // count with a marker array: -1 means not knitted yet
    if (kn.made[kn.row].filter((v) => v >= 0).length !== k + 1) break;
  }
  if (kn.made[kn.row].length === row.length && kn.made[kn.row].every((v) => v >= 0)) {
    ev.rowDone = true;
    kn.row++;
    kn.t = -TURN;
    if (kn.row >= st.rows.length) {
      kn.over = true;
      kn.won = kn.good >= st.need;
      ev.end = true;
    }
  }
  return ev;
}

export function starsFor(kn: Knitting): number {
  if (!kn.won) return 0;
  const miss = kn.stage.total - kn.good;
  if (miss === 0) return 3;
  if (miss <= Math.ceil(kn.stage.total * 0.04)) return 2;
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

export interface PilotOpts {
  /** ± s of slop on each change of yarn */
  slop?: number;
  /** s it lags behind a change it meant to make on time (a consistent late habit) */
  late?: number;
  seed?: number;
  /** "chart" follows the chart; "cream" never holds; "red" always holds; "random" flips at random */
  mode?: "chart" | "cream" | "red" | "random";
}

export function pilot(stage: ScarfStage, opts: PilotOpts = {}): Knitting {
  const { slop = 0, late = 0, seed = 1, mode = "chart" } = opts;
  const rng = mulberry(seed);
  const kn = newKnitting(stage);
  const dt = 1 / 240;
  let plan: Array<{ at: number; hold: boolean }> = [];
  let planned = -1;
  let holding = false;
  let flipAt = 0;
  while (!kn.over) {
    if (planned !== kn.row) {
      planned = kn.row;
      plan = [];
      const row = stage.rows[kn.row];
      // the yarn for each stitch, in knitting order; change halfway between two stitches that differ
      for (let k = 0; k < row.length; k++) {
        const want = row[chartIndex(stage, kn.row, k)] === 1;
        const prevWant = k === 0 ? null : row[chartIndex(stage, kn.row, k - 1)] === 1;
        if (prevWant === null || want !== prevWant) {
          const boundary = k === 0 ? -0.3 : k / stage.speed;
          plan.push({ at: boundary + late + (k === 0 ? 0 : (rng() * 2 - 1) * slop), hold: want });
        }
      }
    }
    if (mode === "chart") {
      while (plan.length && kn.t >= plan[0].at) holding = plan.shift()!.hold;
    } else if (mode === "red") holding = true;
    else if (mode === "cream") holding = false;
    else if (kn.t >= flipAt) {
      holding = rng() < 0.5;
      flipAt = kn.t + 0.2 + rng() * 0.6;
    }
    const rowBefore = kn.row;
    stepKnitting(kn, holding, dt);
    if (kn.row !== rowBefore) flipAt = kn.t;
  }
  return kn;
}

function shape(stage: number) {
  return {
    width: 12 + Math.floor(stage / 4),
    rows: 4 + Math.floor(stage / 6),
    speed: 2.6 + stage * 0.13,
    minRun: Math.max(1, 3 - Math.floor(stage / 10)),
    maxRun: Math.max(3, 6 - Math.floor(stage / 8)),
  };
}

/** Human-like knitters used to set the mark: each yarn change lands within this many seconds of the boundary. */
export const HUMAN_KNITTERS: PilotOpts[] = [1, 2, 3, 4].map((seed) => ({ slop: 0.06, late: 0.02, seed }));

/** A symmetric motif row: runs of each colour between minRun and maxRun, mirrored about the middle. */
function motifRow(width: number, minRun: number, maxRun: number, rng: () => number): number[] {
  const half = Math.ceil(width / 2);
  const left: number[] = [];
  let colour = rng() < 0.5 ? 0 : 1;
  while (left.length < half) {
    const run = minRun + Math.floor(rng() * (maxRun - minRun + 1));
    for (let i = 0; i < run && left.length < half; i++) left.push(colour);
    colour = 1 - colour;
  }
  const right = left.slice(0, width - half).reverse();
  return [...left, ...right];
}

export function buildStage(stage: number): ScarfStage {
  const sh = shape(stage);
  const rng = mulberry(121700 + stage * 89);
  const rows = Array.from({ length: sh.rows }, () => motifRow(sh.width, sh.minRun, sh.maxRun, rng));
  const total = rows.reduce((s, r) => s + r.length, 0);
  const st: ScarfStage = { stage, rows, speed: sh.speed, need: total, total };
  const human = HUMAN_KNITTERS.map((o) => pilot(st, o).good).sort((a, b) => a - b);
  const reds = rows.flat().filter((v) => v === 1).length;
  // the mark: a little under the second-worst human-like knitter, and always above knitting one colour
  st.need = Math.max(Math.max(reds, total - reds) + 2, Math.floor(human[1] - total * 0.04));
  return st;
}

export const SCARF_STAGES: ScarfStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
