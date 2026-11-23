/**
 * 눈 치우기 (Snow Plow) — an OIYO original push puzzle for a snowed-in Seollal morning.
 * Drive the little plow with your finger. Driving into snow pushes it one square ahead. Two small
 * piles pushed together become one big heap, and a big heap is too heavy to push. Clear every road
 * square so the family car can get through; snow may be left on the yards. Every puzzle can be
 * solved, and the stars count your moves against the shortest answer.
 */

export const PLOW_SLUG = "snow-plow";
export const STAGE_COUNT = 30;

export type Cell = "road" | "yard" | "house";

export interface PlowPuzzle {
  stage: number;
  w: number;
  h: number;
  cells: Cell[];
  snow: number[]; // pile size per cell (0, 1 or 2)
  start: number;
  best: number; // shortest number of moves
}

/**
 * Puzzle data: rows separated by "/". "." road, "," yard, "#" house, "P" plow on road,
 * "o" small pile on road, "O" big heap on road, "q" small pile on a yard. Then the shortest solution length and
 * one shortest answer as U/R/D/L moves (checked in the tests).
 */
const DATA: Array<[string, number, string]> = [
  ["..,o./.o.,./.P,#,/,#,.#/..#../.....", 10, "ULURDRRRUL"],
  ["...P./.,..,/.o#.,/...#o/,..,./##.,.", 12, "DLLDDRDLRRRU"],
  [".,.,#/.o.../P#..,/#..../,,..o/.##,.", 13, "URRDRUDDDDRUU"],
  [".P.../,,#.,/#,##./....o/..,../,..o.", 15, "DDDRRDRUUDDDLLL"],
  [",.o../..#../.P..,/#,.o./...o./,#,..", 16, "RRRDDLULDUURUULL"],
  ["...../P..../...#o/.#o.,/.,.o./,.,##", 17, "RRDDDURRDLLUUURRD"],
  [".,#..#/,.o.,#/.#,..,/...#P,/...o../o.#.../,#....", 20, "UULLLRDDDRRDRULLLLLD"],
  [",.,.,./##P.../.o...,/,..#../....../...o.#/,o...#", 21, "DDLLURRRRDDDLLDLUURUL"],
  ["#,..../...#o./P..,oo/,..o../.....,/,#.#,./,.#..,", 22, "URURRRRDDDULRUULDDDDLU"],
  [",..,,./,#,..,/P...o./.,#.oo/..,.o./....../.#.#.#", 23, "RRRDDDRRUUUDLURDDLLUUUR"],
  ["....##/..,o.,/,.#.o#/.#,..,/,oP,../o..##,/......", 25, "DDLLUUUURUULDRRRRDLDRDLLL"],
  ["..o,.#/.#,o#./,.P.,./.....,/##,,../#..#o./,...o.", 27, "LLUURRDDRUDRRDDDDLUUUDDDLLL"],
  [",o.o,,/....#o/,...#./o.o.#./.#..../.,.P,./.,##..", 26, "LLLUURRUUULRRDDDDLDRURRUUU"],
  [",....#/..#..,/,o#,.o/,.,oo,/,...o#/....../##.P.#", 27, "UUURLDDRUULUURRDLUULLLDDLDR"],
  [",,o..#/..,.P./..#oo./.##,.,/..,..#/.#,.../.,o#o#/.....#", 30, "ULLDLDLDDDDRDRUDRRUUULURURULLD"],
  [",o..#./.#o,,./,..#.P/o..##o/,...o./..#,../.....,/.#,...", 32, "ULLULLRRDRRDDDDULLLLUULDURRURULL"],
  ["#,o.,./.ooo.o/#,,..,/.P#.#./#.,#.o/,..#../...#../,#..,.", 36, "UUDRRRUURDULLDRDLUULDLDDDRDDDRRUURUU"],
  [".#.#../,....#/oo.,,P/...###/.o#.../,..o.,/...o,,/#.#.o,", 28, "LLLDLLURRDLDLDDRRURRLLLRDRDR"],
  [",,P#,./...,#./.o..../o##o.,/.#..o#/..,#.,/....oo/,.#...", 39, "DLLDDDDDRRRDRRULUULURLULLULDDDDDRRRRDRU"],
  [".#,#,,/,o..o./.#.oo./.##.#,/.#.o../P...../...o.,/.#,#..", 29, "RRURRDLLDRRURULLUURURDULLDLUL"],
  [",,.o.#/,#o.../o...,#/.##.,#/,o.,#./..#,.P/o....,/.,o...", 43, "LLUUUURULLDRDDDDDLLULUUURRRDDLLDDDLUURDRRDL"],
  ["....../#..,o,/,,o..o/P#o#.,/.#.##./.#..#./o....,/..,,.,", 24, "URURRRDDRULLLDDDDLDLUUUU"],
  ["#,o,.../.o,,#../..o..#o/...o##,/,...#../,#.,#o./#..#,P,/,......", 35, "RUULDRDLDLLLUUUUULUDRRDDUUUULRRRRDD"],
  [".#.o.,./,#,,#../oo....,/,.,#,../#,..o../..#..o./.P#.,o.", 31, "UUULURRRRRDRDDDLUURULDLLLUUUURR"],
  ["##,#,o./....#oP/.#....,/..#.o,./o....../,..o.#,/,....#./.o,,..,", 23, "ULDDLLDRDDLLLUULDRDDLDR"],
  [".,....P/o...,../...o#,./,...,o./,.o...#/.#o.#../.o,#.,#", 33, "DDDLLLLLDRDRULURULURULLLDDRDDLDDR"],
  ["#.o,o.P/,.....#/..,#.#./..,#,,./#.o,.../,oo.,../#.....o/,.....,", 26, "LLDLLLURDDDLDRDLDRRDRURURD"],
  [",o..,,#/..o#o.,/..o..o,/.,,..##/..#.#P./.#..,../...o,.#", 30, "DLLLDRUUUULRRRUULLLDULDDURDRRU"],
  [".,,.##./....,.P/.....#./oo.o.#./,,o#..#/,oo.,#,/#.....,", 31, "LLDDDDDLLLURRLUUUUDLDULDRRRURDD"],
  ["....#.#/.#.o,../,oo#.../...##o./..,P,.,/#o...##/,.,..,,", 33, "LULLUUURRDRLDDULDDDRDLUURRRRUURUL"],
];

export function parsePuzzle(stage: number, s: string, best: number): PlowPuzzle {
  const rows = s.split("/");
  const h = rows.length;
  const w = rows[0].length;
  const cells: Cell[] = [];
  const snow: number[] = [];
  let start = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const i = y * w + x;
      cells.push(ch === "#" ? "house" : ch === "," || ch === "q" ? "yard" : "road");
      snow.push(ch === "o" || ch === "q" ? 1 : ch === "O" ? 2 : 0);
      if (ch === "P") start = i;
    }
  });
  return { stage, w, h, cells, snow, start, best };
}

export const PUZZLES: PlowPuzzle[] = DATA.map(([s, best], i) => parsePuzzle(i, s, best));

/** A recorded shortest answer per puzzle ("URDL"), used by the tests. */
export const ANSWERS: string[] = DATA.map((d) => d[2]);

export const DIRS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function stepTo(p: { w: number; h: number }, i: number, d: number): number {
  const x = (i % p.w) + DIRS[d][0];
  const y = Math.floor(i / p.w) + DIRS[d][1];
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return -1;
  return y * p.w + x;
}

export interface PlowBoard {
  puzzle: PlowPuzzle;
  at: number;
  snow: number[];
  facing: number;
  moves: number;
  history: Array<{ at: number; snow: number[]; facing: number }>;
}

export function newBoard(p: PlowPuzzle): PlowBoard {
  return { puzzle: p, at: p.start, snow: p.snow.slice(), facing: 1, moves: 0, history: [] };
}

export type MoveResult = "moved" | "pushed" | "merged" | "blocked";

/** Pure move on a state; returns the new plow cell and snow, or null when blocked. */
export function tryMove(p: PlowPuzzle, at: number, snow: number[], d: number): null | { at: number; snow: number[]; result: MoveResult } {
  const n = stepTo(p, at, d);
  if (n < 0 || p.cells[n] === "house") return null;
  if (!snow[n]) return { at: n, snow, result: "moved" };
  if (snow[n] >= 2) return null; // a big heap is too heavy
  const m = stepTo(p, n, d);
  if (m < 0 || p.cells[m] === "house") return null;
  if (snow[m] >= 2) return null;
  const next = snow.slice();
  const merged = next[m] === 1;
  next[m] += 1;
  next[n] = 0;
  return { at: n, snow: next, result: merged ? "merged" : "pushed" };
}

export function move(b: PlowBoard, d: number): MoveResult {
  const r = tryMove(b.puzzle, b.at, b.snow, d);
  b.facing = d;
  if (!r) return "blocked";
  b.history.push({ at: b.at, snow: b.snow, facing: b.facing });
  b.at = r.at;
  b.snow = r.snow;
  b.moves++;
  return r.result;
}

export function undo(b: PlowBoard): boolean {
  const h = b.history.pop();
  if (!h) return false;
  b.at = h.at;
  b.snow = h.snow;
  b.facing = h.facing;
  b.moves = Math.max(0, b.moves - 1);
  return true;
}

export function isClear(p: PlowPuzzle, snow: number[]): boolean {
  for (let i = 0; i < snow.length; i++) if (snow[i] && p.cells[i] === "road") return false;
  return true;
}

function blocked(p: PlowPuzzle, i: number, d: number): boolean {
  const n = stepTo(p, i, d);
  return n < 0 || p.cells[n] === "house";
}

/**
 * True when snow on the road can never be cleared: a big heap (too heavy to push) or a pile wedged
 * into a corner of houses or the map edge.
 */
export function isStuck(p: PlowPuzzle, snow: number[]): boolean {
  for (let i = 0; i < snow.length; i++) {
    if (!snow[i] || p.cells[i] !== "road") continue;
    if (snow[i] >= 2) return true;
    const v = blocked(p, i, 0) || blocked(p, i, 2);
    const h = blocked(p, i, 1) || blocked(p, i, 3);
    if (v && h) return true;
  }
  return false;
}

export function solved(b: PlowBoard): boolean {
  return isClear(b.puzzle, b.snow);
}

/** Breadth-first search for the shortest clearing; returns the moves (directions) or null. */
export function solve(p: PlowPuzzle, limit = 400_000): number[] | null {
  const key = (at: number, snow: number[]) => at + ":" + snow.join("");
  const startKey = key(p.start, p.snow);
  const prev = new Map<string, { from: string; d: number } | null>([[startKey, null]]);
  let frontier: Array<{ at: number; snow: number[]; k: string }> = [{ at: p.start, snow: p.snow, k: startKey }];
  if (isClear(p, p.snow)) return [];
  while (frontier.length && prev.size < limit) {
    const next: typeof frontier = [];
    for (const s of frontier) {
      for (let d = 0; d < 4; d++) {
        const r = tryMove(p, s.at, s.snow, d);
        if (!r) continue;
        if (r.result !== "moved" && isStuck(p, r.snow)) continue;
        const k = key(r.at, r.snow);
        if (prev.has(k)) continue;
        prev.set(k, { from: s.k, d });
        if (isClear(p, r.snow)) {
          const path: number[] = [];
          let cur: string | undefined = k;
          while (cur) {
            const e = prev.get(cur);
            if (!e) break;
            path.push(e.d);
            cur = e.from;
          }
          return path.reverse();
        }
        next.push({ at: r.at, snow: r.snow, k });
      }
    }
    frontier = next;
  }
  return null;
}

export function starsFor(moves: number, p: PlowPuzzle): number {
  if (moves <= p.best + 2) return 3;
  if (moves <= Math.ceil(p.best * 1.5) + 2) return 2;
  return 1;
}
