/**
 * 눈송이 오리기 (Paper Snowflake) — an OIYO original folding-and-cutting puzzle for winter 2027.
 * The paper is already folded into one thin wedge. Drag your finger across the wedge like scissors to
 * snip cells out; the unfolded snowflake updates live beside the target. Paper that gets cut off from
 * the centre falls away, just like real paper. Match the target snowflake in as few snips as you can.
 * Early stages fold the paper 4 ways (a square star), later ones fold it 6 ways like a real snowflake.
 */

import { mulberry } from "./pixel-kit";

export const FLAKE_SLUG = "snowflake-cut";
export const STAGE_COUNT = 30;

export interface FlakeGrid {
  folds: 4 | 6; // rotational symmetry
  rings: number; // ring 0 is the uncuttable centre
  slots: number[]; // cells per ring
  offsets: number[]; // first cell index of each ring
  cells: number;
  wedge: number; // folded wedge angle in radians (half a period)
  paper: boolean[]; // the folded sheet is pre-trimmed into a star point; false = never paper
}

export interface FlakePuzzle {
  stage: number;
  grid: FlakeGrid;
  cuts: number[]; // the cells that generated the target
  target: boolean[]; // effective paper left after cutting, per cell
  par: number; // fewest snips (connected groups of generating cuts)
}

export function makeGrid(folds: 4 | 6, rings: number): FlakeGrid {
  const slots: number[] = [];
  const offsets: number[] = [];
  let n = 0;
  for (let r = 0; r < rings; r++) {
    const s = r === 0 ? 1 : folds === 4 ? 1 + Math.floor(r * 0.6) : 1 + Math.floor(r / 2);
    slots.push(s);
    offsets.push(n);
    n += s;
  }
  // trim the outer rim into a point along the a = 0 fold, like the first cut of a real paper snowflake
  const paper: boolean[] = [];
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < slots[r]; s++) {
      const a = (s + 0.5) / slots[r];
      paper.push(r < 2 || (r + 0.5) / rings <= 1 - 0.3 * a);
    }
  }
  return { folds, rings, slots, offsets, cells: n, wedge: Math.PI / folds, paper };
}

export function ringOf(g: FlakeGrid, cell: number): number {
  let r = g.rings - 1;
  while (r > 0 && g.offsets[r] > cell) r--;
  return r;
}

/** Cell under a point given in folded-wedge polar form: radius 0..1 of the paper, angle 0..wedge. */
export function cellAtPolar(g: FlakeGrid, radius: number, angle: number): number {
  if (radius < 0 || radius >= 1 || angle < 0 || angle > g.wedge) return -1;
  const r = Math.min(g.rings - 1, Math.floor(radius * g.rings));
  const s = Math.min(g.slots[r] - 1, Math.floor((angle / g.wedge) * g.slots[r]));
  return g.offsets[r] + s;
}

/** Fold any angle of the unfolded paper back into the wedge. */
export function foldAngle(g: FlakeGrid, theta: number): number {
  const period = g.wedge * 2;
  let a = theta % period;
  if (a < 0) a += period;
  return a > g.wedge ? period - a : a;
}

function angleSpan(g: FlakeGrid, r: number, s: number): [number, number] {
  return [(s / g.slots[r]) * g.wedge, ((s + 1) / g.slots[r]) * g.wedge];
}

/** Neighbouring cells inside the wedge (same ring side by side, or overlapping cells in the next ring). */
export function neighbours(g: FlakeGrid, cell: number): number[] {
  const r = ringOf(g, cell);
  const s = cell - g.offsets[r];
  const out: number[] = [];
  if (s > 0) out.push(cell - 1);
  if (s < g.slots[r] - 1) out.push(cell + 1);
  const [a0, a1] = angleSpan(g, r, s);
  for (const rr of [r - 1, r + 1]) {
    if (rr < 0 || rr >= g.rings) continue;
    for (let k = 0; k < g.slots[rr]; k++) {
      const [b0, b1] = angleSpan(g, rr, k);
      if (Math.min(a1, b1) - Math.max(a0, b0) > 1e-9) out.push(g.offsets[rr] + k);
    }
  }
  return out;
}

/** Paper left after cutting: cut cells are gone and so is any piece no longer joined to the centre. */
export function effective(g: FlakeGrid, cut: boolean[]): boolean[] {
  const kept = new Array<boolean>(g.cells).fill(false);
  const stack = [0];
  kept[0] = true;
  while (stack.length) {
    const c = stack.pop() as number;
    for (const n of neighbours(g, c)) {
      if (!kept[n] && !cut[n] && g.paper[n]) {
        kept[n] = true;
        stack.push(n);
      }
    }
  }
  return kept;
}

export function sameMask(a: boolean[], b: boolean[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Connected groups among a set of cells (each group can be snipped in one drag). */
export function groupCount(g: FlakeGrid, cells: number[]): number {
  const set = new Set(cells);
  const seen = new Set<number>();
  let groups = 0;
  for (const c of cells) {
    if (seen.has(c)) continue;
    groups++;
    const stack = [c];
    seen.add(c);
    while (stack.length) {
      const x = stack.pop() as number;
      for (const n of neighbours(g, x)) if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return groups;
}

function bandOf(stage: number) {
  if (stage < 5) return { folds: 4 as const, rings: 7, notches: 2 + Math.floor(stage / 3) };
  if (stage < 15) return { folds: 6 as const, rings: 8, notches: 2 + Math.floor((stage - 5) / 3) };
  if (stage < 25) return { folds: 6 as const, rings: 10, notches: 4 + Math.floor((stage - 15) / 3) };
  return { folds: 6 as const, rings: 12, notches: 6 + Math.floor((stage - 25) / 2) };
}

function buildPuzzle(stage: number, taken: Set<string>): FlakePuzzle {
  const band = bandOf(stage);
  const g = makeGrid(band.folds, band.rings);
  for (let attempt = 0; ; attempt++) {
    const rng = mulberry(9000 + stage * 131 + attempt * 7919);
    const cut = new Array<boolean>(g.cells).fill(false);
    const cuts: number[] = [];
    let groups = 0;
    for (let n = 0; n < band.notches; n++) {
      // favour outer rings and the fold edges: that is where real snowflakes get their points
      const r = 2 + Math.floor(Math.pow(rng(), 0.6) * (g.rings - 2));
      const edge = rng() < 0.45;
      const s = edge ? (rng() < 0.5 ? 0 : g.slots[r] - 1) : Math.floor(rng() * g.slots[r]);
      let c = g.offsets[r] + s;
      if (cut[c] || !g.paper[c]) continue;
      const size = 1 + Math.floor(rng() * (stage < 10 ? 2 : 3));
      const group: number[] = [];
      for (let k = 0; k < size; k++) {
        if (!cut[c] && c !== 0) {
          cut[c] = true;
          group.push(c);
        }
        const ns = neighbours(g, c).filter((x) => x !== 0 && !cut[x] && g.paper[x] && ringOf(g, x) >= 2);
        if (!ns.length) break;
        c = ns[Math.floor(rng() * ns.length)];
      }
      cuts.push(...group);
      if (group.length) groups++;
    }
    if (groups < 2) continue;
    // every cut has to show: no cut cell may already be lost with a fallen piece of another cut
    const target = effective(g, cut);
    const keptCount = target.filter(Boolean).length;
    if (keptCount < g.paper.filter(Boolean).length * 0.45) continue;
    const kept = effective(g, new Array<boolean>(g.cells).fill(false));
    if (sameMask(target, kept)) continue;
    const key = target.map((v) => (v ? 1 : 0)).join("") + band.folds;
    if (taken.has(key)) continue;
    taken.add(key);
    return { stage, grid: g, cuts, target, par: groupCount(g, cuts) };
  }
}

export const PUZZLES: FlakePuzzle[] = (() => {
  const taken = new Set<string>();
  return Array.from({ length: STAGE_COUNT }, (_, i) => buildPuzzle(i, taken));
})();

export interface FlakeState {
  puzzle: FlakePuzzle;
  cut: boolean[];
  snips: number;
  solved: boolean;
}

export function newFlake(stage: number): FlakeState {
  const p = PUZZLES[stage];
  return { puzzle: p, cut: new Array<boolean>(p.grid.cells).fill(false), snips: 0, solved: false };
}

export function currentPaper(st: FlakeState): boolean[] {
  return effective(st.puzzle.grid, st.cut);
}

/** Apply one drag. `cells` are the cells the finger crossed; `restore` puts paper back instead. */
export function applySnip(st: FlakeState, cells: number[], restore: boolean): boolean {
  if (st.solved) return false;
  let changed = false;
  for (const c of cells) {
    if (c <= 0 || c >= st.cut.length || !st.puzzle.grid.paper[c]) continue;
    if (st.cut[c] === !restore) continue;
    st.cut[c] = !restore;
    changed = true;
  }
  if (!changed) return false;
  st.snips++;
  if (sameMask(currentPaper(st), st.puzzle.target)) st.solved = true;
  return true;
}

export function starsFor(snips: number, par: number): number {
  if (snips <= par) return 3;
  if (snips <= par + 2) return 2;
  return 1;
}

/**
 * Raster lookup for drawing a whole unfolded snowflake in a size×size pixel buffer.
 * Each entry is a cell index, or -1 for empty air.
 */
export function flakeRaster(g: FlakeGrid, size: number): Int16Array {
  const out = new Int16Array(size * size);
  const c = (size - 1) / 2;
  const R = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = c - y;
      const rad = Math.hypot(dx, dy) / R;
      if (rad >= 1) {
        out[y * size + x] = -1;
        continue;
      }
      // start the fold at straight up so the points line up vertically
      const theta = Math.atan2(dx, dy) + g.wedge;
      out[y * size + x] = cellAtPolar(g, rad, foldAngle(g, theta));
    }
  }
  return out;
}
