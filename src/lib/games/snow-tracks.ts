/**
 * 눈 위 발자국 (Snow Tracks) — an OIYO original path-linking logic puzzle for a snowy morning.
 * Each animal walked from its burrow to its food overnight. Draw every animal's trail with your finger:
 * trails go up, down, left or right, never cross or share a square, and together they cover every
 * patch of snow (trees are in the way). Footprints already pressed in the snow show whose trail
 * passes there. Every puzzle has exactly one answer.
 */

export const TRACKS_SLUG = "snow-tracks";
export const STAGE_COUNT = 30;

export const ANIMALS = ["rabbit", "fox", "deer", "magpie", "boar", "squirrel", "otter"] as const;
export type Animal = (typeof ANIMALS)[number];

export interface TrackPuzzle {
  stage: number;
  w: number;
  h: number;
  tree: boolean[];
  den: number[]; // cell per animal
  food: number[];
  clue: number[]; // per cell: animal index or -1
  animals: number;
}

/**
 * Puzzle data: rows separated by "/". "." snow, "#" tree, "A"–"G" burrow of animal 0–6,
 * "a"–"g" its food, "1"–"7" footprints of animal 0–6. Generated offline and checked for a
 * unique answer (see the tests).
 */
const DATA: string[] = [
  "Ab.../.a.C./.2.../B.3../c....",
  "...../...../Abc../.C.../...Ba",
  ".ba../...../..C../..B../c.A..",
  "..a../.DbA./....B/..dCc/.....",
  ".2.../...../.dcb./.D.CB/..a.A",
  "....../.Aba2./4...../d..Dc./..BC../......",
  "....../.2.4../....Da/..2dCb/.B.c../.A....",
  "..DC../.4..a./..3.2./.d..../.....A/.cB..b",
  "A4..D./....../a..4../B...../.2.#dc/...bC.",
  ".Dc..A/.3..B./....a./.#Cb../...41./..d...",
  "..e..#/C.d.../B....E/...c../..#D../ba.A..",
  "....../.E.A2./.d...B/..ab#c/....D./e#..C.",
  "e....E/D.5..#/...bA./..#a../d...2./C.cB..",
  ".A..../.a..D./.BE#e./.#..../.C.5../.b..cd",
  "..Dc.#/4...CB/.eEd#./....ab/..1.A./1.....",
  ".CE..../.D.4.e./.#4..d./......./.B2.a../.c...../..bA..#",
  ".ba..A#/.E54.2./......./.ed..../......2/.DC.cB./.......",
  "E#...DA/.ed..c./......./4..4.../......./BC..2../....ba#",
  "..d..../..EDc../.ea..../A....C./b.1.#B./..2..../.......",
  "......./.....5E/..#C..c/...D..b/ed...A./...#..a/......B",
  "e....../d...F../..5...a/.fE..#./..b.#../D.CBA../c..#...",
  "..1..../6..Ab../..#..a#/....Bc./...D.dC/#..E.eF/f......",
  "B....../a...Cb./.1dc.../......./.ADe#../#....../F...#fE",
  ".f#.d../.e..c../.F.D#../.a.E..#/.BC..A./.....b./.......",
  "f....A./#.3..Ba/....#../.c...#./.DdeFEb/..4...C/.......",
  "..#..b../.....a../.3cB..../A......./...E..../ef.d..../....##.C/F......D",
  ".d.....f/.e..5..#/......../BC3.D.6./..#.c.../....1.EF/......../bA#.a...",
  "..#...../...cd.../.F....../A...Ef../..#.5.../..eD4.3./..5...../ab..#.BC",
  "#.....1./..CD..../...ed.../....E..A/..G.f..#/Fg....ab/.....cB./..#.....",
  ".B....../.A.a7.../.4....gf/b......./c....#../......#./.DCde.GF/...#...E",
];

export function parsePuzzle(stage: number, s: string): TrackPuzzle {
  const rows = s.split("/");
  const h = rows.length;
  const w = rows[0].length;
  const tree: boolean[] = [];
  const clue: number[] = [];
  const den: number[] = [];
  const food: number[] = [];
  let animals = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const i = y * w + x;
      tree.push(ch === "#");
      clue.push(-1);
      if (ch >= "A" && ch <= "G") {
        den[ch.charCodeAt(0) - 65] = i;
        animals = Math.max(animals, ch.charCodeAt(0) - 64);
      } else if (ch >= "a" && ch <= "g") {
        food[ch.charCodeAt(0) - 97] = i;
      } else if (ch >= "1" && ch <= "7") {
        clue[i] = ch.charCodeAt(0) - 49;
      }
    }
  });
  return { stage, w, h, tree, den, food, clue, animals };
}

export const PUZZLES: TrackPuzzle[] = DATA.map((s, i) => parsePuzzle(i, s));

export function neighbours(p: { w: number; h: number }, i: number): number[] {
  const x = i % p.w;
  const y = Math.floor(i / p.w);
  const out: number[] = [];
  if (y > 0) out.push(i - p.w);
  if (y < p.h - 1) out.push(i + p.w);
  if (x > 0) out.push(i - 1);
  if (x < p.w - 1) out.push(i + 1);
  return out;
}

/**
 * Count answers, stopping at `limit`. Returns the count and the first answer found as a colour per cell.
 */
export function solve(p: TrackPuzzle, limit = 2): { count: number; first: number[] | null; second: number[] | null } {
  const n = p.w * p.h;
  const color = new Array<number>(n).fill(-1);
  const endOwner = new Array<number>(n).fill(-1);
  for (let a = 0; a < p.animals; a++) {
    color[p.den[a]] = a;
    color[p.food[a]] = a;
    endOwner[p.den[a]] = a;
    endOwner[p.food[a]] = a;
  }
  const head = p.den.slice(0, p.animals);
  const done = new Array<boolean>(p.animals).fill(false);
  let empty = 0;
  for (let i = 0; i < n; i++) if (!p.tree[i] && color[i] === -1) empty++;
  let count = 0;
  let first: number[] | null = null;
  let second: number[] | null = null;
  const nb = Array.from({ length: n }, (_, i) => neighbours(p, i).filter((j) => !p.tree[j]));

  const moves = (a: number): number[] => {
    const out: number[] = [];
    for (const j of nb[head[a]]) {
      if (j === p.food[a]) out.push(j);
      else if (color[j] === -1 && (p.clue[j] === -1 || p.clue[j] === a)) out.push(j);
    }
    return out;
  };

  const feasible = (): boolean => {
    // every empty cell needs two usable neighbours
    for (let i = 0; i < n; i++) {
      if (p.tree[i] || color[i] !== -1) continue;
      let k = 0;
      for (const j of nb[i]) {
        if (color[j] === -1) k++;
        else {
          const a = color[j];
          if (!done[a] && (j === head[a] || j === p.food[a]) && (p.clue[i] === -1 || p.clue[i] === a)) k++;
        }
      }
      if (k < 2) return false;
    }
    // each open trail must still reach its food, and every empty pocket must be someone's to fill
    const comp = new Array<number>(n).fill(-1);
    let c = 0;
    const touches: Array<Set<number>> = [];
    for (let i = 0; i < n; i++) {
      if (p.tree[i] || color[i] !== -1 || comp[i] !== -1) continue;
      const stack = [i];
      comp[i] = c;
      const heads = new Set<number>();
      const foods = new Set<number>();
      while (stack.length) {
        const x = stack.pop() as number;
        for (const j of nb[x]) {
          if (color[j] === -1) {
            if (comp[j] === -1) {
              comp[j] = c;
              stack.push(j);
            }
          } else {
            const a = color[j];
            if (done[a]) continue;
            if (j === head[a]) heads.add(a);
            if (j === p.food[a]) foods.add(a);
          }
        }
      }
      let ok = false;
      const both = new Set<number>();
      for (const a of heads) if (foods.has(a)) {
        ok = true;
        both.add(a);
      }
      if (!ok) return false;
      touches.push(both);
      c++;
    }
    for (let a = 0; a < p.animals; a++) {
      if (done[a]) continue;
      if (nb[head[a]].includes(p.food[a])) continue;
      let reach = false;
      for (const j of nb[head[a]]) {
        if (color[j] === -1 && comp[j] >= 0 && touches[comp[j]].has(a)) reach = true;
      }
      if (!reach) return false;
    }
    return true;
  };

  const rec = (): void => {
    if (count >= limit) return;
    let best = -1;
    let bestMoves: number[] = [];
    for (let a = 0; a < p.animals; a++) {
      if (done[a]) continue;
      const m = moves(a);
      if (!m.length) return;
      if (best === -1 || m.length < bestMoves.length) {
        best = a;
        bestMoves = m;
      }
    }
    if (best === -1) {
      if (empty === 0) {
        count++;
        if (!first) first = color.slice();
        else if (!second) second = color.slice();
      }
      return;
    }
    const a = best;
    for (const j of bestMoves) {
      if (j === p.food[a]) {
        done[a] = true;
        const prev = head[a];
        head[a] = j;
        if (feasible() || p.animals === 1) rec();
        head[a] = prev;
        done[a] = false;
      } else {
        color[j] = a;
        empty--;
        const prev = head[a];
        head[a] = j;
        if (feasible()) rec();
        head[a] = prev;
        empty++;
        color[j] = -1;
      }
      if (count >= limit) return;
    }
  };
  if (feasible()) rec();
  return { count, first, second };
}

/** The player's board: one trail (list of cells from the burrow) per animal. */
export interface TrackBoard {
  puzzle: TrackPuzzle;
  trails: number[][];
  moves: number;
}

export function newBoard(stage: number): TrackBoard {
  const p = PUZZLES[stage];
  return { puzzle: p, trails: Array.from({ length: p.animals }, (_, a) => [p.den[a]]), moves: 0 };
}

export function ownerAt(b: TrackBoard, cell: number): number {
  for (let a = 0; a < b.trails.length; a++) if (b.trails[a].includes(cell)) return a;
  return -1;
}

export function isComplete(b: TrackBoard, a: number): boolean {
  const t = b.trails[a];
  return t[t.length - 1] === b.puzzle.food[a];
}

/** Which animal a touch on `cell` picks up, and the trail is cut back to that cell. */
export function grab(b: TrackBoard, cell: number): number {
  const p = b.puzzle;
  const atDen = p.den.indexOf(cell);
  if (atDen >= 0 && atDen < p.animals) {
    b.trails[atDen] = [cell];
    return atDen;
  }
  const atFood = p.food.indexOf(cell);
  if (atFood >= 0 && atFood < p.animals && !isComplete(b, atFood)) return -1;
  const a = ownerAt(b, cell);
  if (a < 0) return -1;
  const t = b.trails[a];
  b.trails[a] = t.slice(0, t.indexOf(cell) + 1);
  return a;
}

/**
 * Extend animal `a`'s trail into `cell` (must be next to its end). Walking back onto its own trail
 * shortens it; walking over another trail cuts that trail back. Returns true if something changed.
 */
export function extend(b: TrackBoard, a: number, cell: number): boolean {
  const p = b.puzzle;
  const t = b.trails[a];
  const end = t[t.length - 1];
  if (cell === end) return false;
  const idx = t.indexOf(cell);
  if (idx >= 0) {
    b.trails[a] = t.slice(0, idx + 1);
    return true;
  }
  if (isComplete(b, a)) return false;
  if (!neighbours(p, end).includes(cell) || p.tree[cell]) return false;
  const den = p.den.indexOf(cell);
  if (den >= 0 && den < p.animals) return false;
  const food = p.food.indexOf(cell);
  if (food >= 0 && food < p.animals && food !== a) return false;
  if (p.clue[cell] >= 0 && p.clue[cell] !== a) return false;
  const other = ownerAt(b, cell);
  if (other >= 0) {
    const ot = b.trails[other];
    b.trails[other] = ot.slice(0, ot.indexOf(cell));
    if (!b.trails[other].length) b.trails[other] = [p.den[other]];
  }
  b.trails[a] = [...t, cell];
  return true;
}

export function solved(b: TrackBoard): boolean {
  const p = b.puzzle;
  let covered = 0;
  for (let a = 0; a < p.animals; a++) {
    if (!isComplete(b, a)) return false;
    covered += b.trails[a].length;
    for (const c of b.trails[a]) if (p.clue[c] >= 0 && p.clue[c] !== a) return false;
  }
  for (let i = 0; i < p.clue.length; i++) if (p.clue[i] >= 0 && !b.trails[p.clue[i]].includes(i)) return false;
  return covered === p.tree.filter((t) => !t).length;
}

export function starsFor(moves: number, puzzle: TrackPuzzle): number {
  // one stroke per animal is perfect; a few fixes are fine
  if (moves <= puzzle.animals + 1) return 3;
  if (moves <= puzzle.animals * 2 + 2) return 2;
  return 1;
}
