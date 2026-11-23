/**
 * 첫 해 구름 밀기 (First Sunrise) — an OIYO original sliding-block puzzle for the 2027 new year.
 * The 2×2 sun rises straight up through a sky crowded with clouds. Long clouds drift only
 * along their length, the magpie (1×1) hops any way, mountain rocks never move.
 * Slide pieces out of the way until the sun reaches the top row.
 * Every board ships with its par, the true shortest move count from a breadth-first solver.
 */

export const SUNRISE_SLUG = "first-sunrise";

/**
 * Board rows: `.` sky, `#` rock, `S` sun (2×2), lowercase letters = clouds (1×2, 1×3, 2×1, 3×1),
 * uppercase letters other than S = magpie (1×1, moves in all four directions).
 */
export interface Level {
  rows: readonly string[];
  par: number;
}

export type Axis = "h" | "v" | "free";

export interface Piece {
  id: string;
  w: number;
  h: number;
  axis: Axis;
  sun: boolean;
}

export interface Parsed {
  w: number;
  h: number;
  pieces: Piece[];
  rocks: boolean[];
  start: number[]; // x0,y0,x1,y1,... per piece
  sunIndex: number;
}

export function parse(level: Level): Parsed {
  const h = level.rows.length;
  const w = level.rows[0].length;
  const rocks = new Array<boolean>(w * h).fill(false);
  const cells = new Map<string, Array<[number, number]>>();
  level.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "#") rocks[y * w + x] = true;
    else if (ch !== ".") {
      const list = cells.get(ch) ?? [];
      list.push([x, y]);
      cells.set(ch, list);
    }
  }));
  const pieces: Piece[] = [];
  const start: number[] = [];
  let sunIndex = -1;
  for (const [id, list] of cells) {
    const xs = list.map((c) => c[0]);
    const ys = list.map((c) => c[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const pw = Math.max(...xs) - x0 + 1;
    const ph = Math.max(...ys) - y0 + 1;
    if (pw * ph !== list.length) throw new Error(`first-sunrise: piece ${id} is not a rectangle`);
    const sun = id === "S";
    if (sun && (pw !== 2 || ph !== 2)) throw new Error("first-sunrise: the sun must be 2x2");
    const axis: Axis = sun ? "v" : pw === 1 && ph === 1 ? "free" : ph === 1 ? "h" : pw === 1 ? "v" : "free";
    if (!sun && pw > 1 && ph > 1) throw new Error(`first-sunrise: cloud ${id} must be one cell thick`);
    if (sun) sunIndex = pieces.length;
    pieces.push({ id, w: pw, h: ph, axis, sun });
    start.push(x0, y0);
  }
  if (sunIndex < 0) throw new Error("first-sunrise: no sun");
  return { w, h, pieces, rocks, start, sunIndex };
}

/** Occupancy grid: -1 empty, -2 rock, otherwise piece index. */
export function occupancy(p: Parsed, s: readonly number[]): Int16Array {
  const g = new Int16Array(p.w * p.h).fill(-1);
  p.rocks.forEach((r, i) => { if (r) g[i] = -2; });
  p.pieces.forEach((pc, i) => {
    const x0 = s[i * 2];
    const y0 = s[i * 2 + 1];
    for (let y = 0; y < pc.h; y++) for (let x = 0; x < pc.w; x++) g[(y0 + y) * p.w + x0 + x] = i;
  });
  return g;
}

export type Dir = "up" | "down" | "left" | "right";
export const DELTA: Record<Dir, readonly [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function allowed(pc: Piece, dir: Dir): boolean {
  if (pc.axis === "free") return true;
  if (pc.axis === "h") return dir === "left" || dir === "right";
  return dir === "up" || dir === "down";
}

/** How many cells the piece can slide in that direction (0 when blocked or not allowed). */
export function reach(p: Parsed, s: readonly number[], idx: number, dir: Dir, grid = occupancy(p, s)): number {
  const pc = p.pieces[idx];
  if (!allowed(pc, dir)) return 0;
  const [dx, dy] = DELTA[dir];
  let x0 = s[idx * 2];
  let y0 = s[idx * 2 + 1];
  let n = 0;
  for (;;) {
    x0 += dx;
    y0 += dy;
    if (x0 < 0 || y0 < 0 || x0 + pc.w > p.w || y0 + pc.h > p.h) return n;
    for (let y = 0; y < pc.h; y++) for (let x = 0; x < pc.w; x++) {
      const v = grid[(y0 + y) * p.w + x0 + x];
      if (v !== -1 && v !== idx) return n;
    }
    n += 1;
  }
}

export function moveBy(s: readonly number[], idx: number, dir: Dir, steps: number): number[] {
  const out = s.slice();
  const [dx, dy] = DELTA[dir];
  out[idx * 2] += dx * steps;
  out[idx * 2 + 1] += dy * steps;
  return out;
}

export function isWon(p: Parsed, s: readonly number[]): boolean {
  return s[p.sunIndex * 2 + 1] === 0;
}

export interface Move { piece: number; dir: Dir; steps: number }

/** Shortest solution (one move = one piece sliding any distance in one direction), or null. */
export function solve(level: Level, limit = 400_000): Move[] | null {
  const p = parse(level);
  const key = (s: readonly number[]) => String.fromCharCode(...s);
  const start = p.start.slice();
  if (isWon(p, start)) return [];
  const prev = new Map<string, { from: string; move: Move } | null>();
  prev.set(key(start), null);
  let frontier: number[][] = [start];
  const dirs: Dir[] = ["up", "down", "left", "right"];
  while (frontier.length && prev.size < limit) {
    const next: number[][] = [];
    for (const s of frontier) {
      const grid = occupancy(p, s);
      const ks = key(s);
      for (let i = 0; i < p.pieces.length; i++) {
        for (const d of dirs) {
          const r = reach(p, s, i, d, grid);
          for (let k = 1; k <= r; k++) {
            const t = moveBy(s, i, d, k);
            const kt = key(t);
            if (prev.has(kt)) continue;
            prev.set(kt, { from: ks, move: { piece: i, dir: d, steps: k } });
            if (isWon(p, t)) {
              const path: Move[] = [];
              let cur: string = kt;
              for (;;) {
                const e = prev.get(cur);
                if (!e) break;
                path.push(e.move);
                cur = e.from;
              }
              return path.reverse();
            }
            next.push(t);
          }
        }
      }
    }
    frontier = next;
  }
  return null;
}

export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5) + 1) return 2;
  return 1;
}

// Generated by a seeded search (see the test): each board's par is its true shortest solution.
// Stages 1–10 have long clouds only, 11–20 add magpies, 21–30 add mountain rocks and taller skies.
export const LEVELS: readonly Level[] = [
  { par: 4, rows: ["ccc..", ".....", "aa.d.", "..bd.", "SSb..", "SSb.."] },
  { par: 5, rows: ["..a..", "cca..", "dd...", "ee...", "SS.bb", "SS..."] },
  { par: 6, rows: ["..bb..", "......", ".cc..e", "aaad.e", "fSSd..", "fSS..."] },
  { par: 7, rows: ["eccc.g", "e..hhg", "e.bb..", "f.aa.d", "f..SSd", "...SSd"] },
  { par: 8, rows: ["ee.b.", "...b.", "..cb.", "aac..", "SSc..", "SS..."] },
  { par: 9, rows: ["cc...g", "..eeeg", "bb.a..", "...a.h", "..ff.h", ".SS..h", ".SS..."] },
  { par: 9, rows: ["..dgg.", "bbdi..", "ffaiee", "..a...", "..ahhh", "SS.ccc", "SS...."] },
  { par: 9, rows: ["......", "ee.b..", "...baa", "c..bgg", "cddd..", ".fhhSS", ".f..SS"] },
  { par: 10, rows: [".jeee.", ".jddbb", "..aa..", "hh..cc", "..fii.", "..fgSS", "...gSS"] },
  { par: 12, rows: ["..haaa", ".eh...", ".edcc.", "..d...", "..gbbb", "f.g.SS", "f...SS"] },
  { par: 9, rows: ["...bbd", ".aaagd", "...egc", ".B.egc", "...e.A", ".SSfff", ".SS..."] },
  { par: 10, rows: [".fffb.", "cccgb.", "...gdd", "...a..", "...ahh", "SSAiie", "SS...e"] },
  { par: 11, rows: [".jeee.", "ijc..C", "ihca..", "Bhca..", "fddbb.", "fkAgSS", ".k.gSS"] },
  { par: 11, rows: [".fff..", ".ee..A", "dd.hbb", "...hai", ".gg.ai", "SSccc.", "SS...."] },
  { par: 12, rows: ["gg.A..", "ja..ii", "jaddd.", "...fbb", ".e.f..", ".eccSS", ".e..SS"] },
  { par: 12, rows: ["hhB.jj", ".ccfdd", "aaaf..", ".iii..", "gggkA.", "ebbkSS", "e...SS"] },
  { par: 12, rows: ["Bf.ccc", ".fb...", "gfb...", "ga.eee", ".ad.ii", "h.dSS.", "h..SS."] },
  { par: 12, rows: [".C.c..", "fffc..", ".ddAgg", "B.aaee", "ji.bbb", "jih.SS", "..h.SS"] },
  { par: 12, rows: [".ddaae", "..gc.e", "..gcff", "..ghh.", "A..bbb", "SSii..", "SS...."] },
  { par: 15, rows: ["fffAe.", "aadde.", ".B.hkc", "...hkc", "jj.iib", "SSgggb", "SS...."] },
  { par: 7, rows: ["..A...", ".jjhh.", "#.#...", "...ggg", "..dddB", "f.bbb.", "fa.cSS", ".a.cSS"] },
  { par: 8, rows: ["fB.#A.", "f..a.g", "...abg", "ee.cbg", "dd.cb#", ".SS...", ".SS..."] },
  { par: 9, rows: ["j..a..", "j.Aa.b", "hgggib", "hcc.i.", ".ff.d#", "BSS.de", ".SS..e"] },
  { par: 9, rows: ["hff.cc", "h#.ajj", "...aee", "..bbb.", "gidA..", "gid.SS", "gid.SS"] },
  { par: 13, rows: ["...#A.", ".f.a..", ".fBadd", ".c.ii.", ".chgbb", "eehgSS", "....SS"] },
  { par: 13, rows: [".fff.i", "hjje.i", "h..e#i", "h..bc.", "aaabcd", "gg.b.d", ".SS...", ".SS..."] },
  { par: 14, rows: ["#bA.#a", ".b.dda", ".g.ffa", "eg....", "eccjjh", "..SSih", "..SSi."] },
  { par: 16, rows: ["....#d", ".gge.d", "ffjeii", "ccje.a", ".hh.Aa", "SS.bbb", "SS...."] },
  { par: 21, rows: ["C.hhhb", "..a..b", "B.af#j", "ddaf.j", ".Ae#.c", "SSeg.c", "SSeg.."] },
  { par: 21, rows: ["...g.h", ".aag#h", "jj.g..", ".ffci.", "bbeci.", "..e.i.", "SSedd.", "SS...."] },
];

export const LEVEL_COUNT = LEVELS.length;
