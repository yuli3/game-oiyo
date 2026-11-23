/**
 * 빙판 그림 스케이트 (Ice Etch) — an OIYO original one-stroke puzzle.
 * Skate across a frozen pond and pass over every ice cell exactly once, finishing at the
 * warming hut. The ice you carve reveals a pixel picture (winter and 2027 new-year motifs),
 * so a cleared pond is a finished drawing. 30 ponds; each ships with one known route
 * (used for hints and checked by the test).
 */

export const ETCH_SLUG = "ice-etch";

/** Rows: `.` ice, `#` snowdrift (blocked), `P` start, `H` warming hut (must be the last cell). */
export interface Level {
  rows: readonly string[];
  /** One known route from P to H as U/D/L/R letters. */
  route: string;
  motif: MotifId;
  /** Palette variant 0..2 (dawn, day, night). */
  tone: 0 | 1 | 2;
}

export interface Parsed {
  w: number;
  h: number;
  blocked: boolean[];
  start: number;
  hut: number;
  iceCount: number; // every cell the skater must pass, including start and hut
}

export function parse(level: Level): Parsed {
  const h = level.rows.length;
  const w = level.rows[0].length;
  const blocked = new Array<boolean>(w * h).fill(false);
  let start = -1;
  let hut = -1;
  let iceCount = 0;
  level.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = y * w + x;
    if (ch === "#") { blocked[i] = true; return; }
    iceCount += 1;
    if (ch === "P") start = i;
    if (ch === "H") hut = i;
  }));
  if (start < 0 || hut < 0) throw new Error("ice-etch: needs P and H");
  return { w, h, blocked, start, hut, iceCount };
}

export function adjacent(p: Parsed, a: number, b: number): boolean {
  const ax = a % p.w;
  const ay = Math.floor(a / p.w);
  const bx = b % p.w;
  const by = Math.floor(b / p.w);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

export type StepResult = "ok" | "back" | "blocked" | "visited" | "far" | "hut-early" | "done";

/**
 * Try to extend (or shorten) the route by entering `cell`.
 * Entering the previous cell steps back one (undo by retracing).
 */
export function step(p: Parsed, path: readonly number[], cell: number): { path: number[]; result: StepResult } {
  const head = path[path.length - 1];
  if (path.length === p.iceCount && head === p.hut) return { path: path.slice(), result: "done" };
  if (cell === head) return { path: path.slice(), result: "far" };
  if (path.length >= 2 && cell === path[path.length - 2]) return { path: path.slice(0, -1), result: "back" };
  if (cell < 0 || cell >= p.w * p.h || !adjacent(p, head, cell)) return { path: path.slice(), result: "far" };
  if (p.blocked[cell]) return { path: path.slice(), result: "blocked" };
  if (path.includes(cell)) return { path: path.slice(), result: "visited" };
  if (cell === p.hut && path.length + 1 < p.iceCount) return { path: path.slice(), result: "hut-early" };
  const next = [...path, cell];
  return { path: next, result: next.length === p.iceCount ? "done" : "ok" };
}

export function isDone(p: Parsed, path: readonly number[]): boolean {
  return path.length === p.iceCount && path[path.length - 1] === p.hut;
}

const ROUTE_DELTA: Record<string, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

/** The known route as a list of cells, starting at P. */
export function routeCells(p: Parsed, route: string): number[] {
  const cells = [p.start];
  let x = p.start % p.w;
  let y = Math.floor(p.start / p.w);
  for (const ch of route) {
    const d = ROUTE_DELTA[ch];
    if (!d) throw new Error(`ice-etch: bad route letter ${ch}`);
    x += d[0];
    y += d[1];
    cells.push(y * p.w + x);
  }
  return cells;
}

/**
 * Hint: if the current route still follows the known route, the next cell of it.
 * Otherwise how many cells to keep (the rest should be retraced).
 */
export function hint(p: Parsed, level: Level, path: readonly number[]): { next: number } | { keep: number } {
  const sol = routeCells(p, level.route);
  let k = 0;
  while (k < path.length && path[k] === sol[k]) k += 1;
  if (k === path.length) return { next: sol[k] ?? p.hut };
  return { keep: k };
}

/** Dead end check: no legal forward step and not finished. */
export function stuck(p: Parsed, path: readonly number[]): boolean {
  if (isDone(p, path)) return false;
  const head = path[path.length - 1];
  const x = head % p.w;
  const y = Math.floor(head / p.w);
  for (const [dx, dy] of Object.values(ROUTE_DELTA)) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) continue;
    const c = ny * p.w + nx;
    if (path.length >= 2 && c === path[path.length - 2]) continue;
    if (step(p, path, c).result === "ok" || step(p, path, c).result === "done") return false;
  }
  return true;
}

export function starsFor(retraces: number, hints: number): 1 | 2 | 3 {
  const cost = retraces + hints * 6;
  if (cost <= 4) return 3;
  if (cost <= 16) return 2;
  return 1;
}

// ─── Pictures ───────────────────────────────────────────────────────────────

export type MotifId = "snowflake" | "sunrise" | "pine" | "kite" | "lantern" | "bowl" | "bell" | "goat" | "mitten" | "aurora";
export const MOTIFS: readonly MotifId[] = ["snowflake", "sunrise", "pine", "kite", "lantern", "bowl", "bell", "goat", "mitten", "aurora"];

type Tone = readonly [bg: string, bg2: string, a: string, b: string, c: string, d: string];
/** bg, bg2 (background dither), then four motif colours. Index by motif then tone. */
const TONES: Record<MotifId, readonly [Tone, Tone, Tone]> = {
  snowflake: [["#ffd8e0", "#ffc0cc", "#ffffff", "#9ad1ff", "#4c8ddb", "#f8f0ff"], ["#bfe3ff", "#a8d6ff", "#ffffff", "#5aa9f0", "#2f6fbd", "#e6f4ff"], ["#141c3d", "#1b2550", "#e8f4ff", "#7fb8ff", "#3e74d6", "#b5d8ff"]],
  sunrise: [["#ffb36b", "#ff9a5c", "#ff5a36", "#ffe08a", "#5b3a6e", "#2e1f45"], ["#9fd4ff", "#86c6ff", "#ffcf3f", "#fff2a8", "#4f7d5c", "#2f5440"], ["#2a1f4e", "#352860", "#ff7a3d", "#ffd06b", "#1d1838", "#0f0c22"]],
  pine: [["#ffe1c7", "#ffd2b0", "#2f7d4f", "#1e5a3a", "#ffffff", "#7a4a2a"], ["#d8f1ff", "#c3e8ff", "#2b8a57", "#1a5e3c", "#ffffff", "#6b4226"], ["#16223f", "#1c2b4f", "#2d6b4f", "#1a4a37", "#dfefff", "#4e3220"]],
  kite: [["#ffe8d0", "#ffdcbc", "#ffffff", "#e03b3b", "#2d5fc4", "#f2c230"], ["#c9ecff", "#b5e3ff", "#ffffff", "#e03b3b", "#2d5fc4", "#f2c230"], ["#1b2346", "#222c56", "#f4f1e8", "#d8443f", "#4c7ce0", "#f2c230"]],
  lantern: [["#ffe0c4", "#ffd2ad", "#e8413a", "#ffcf5a", "#3a5fcf", "#5a2d1a"], ["#d9f0ff", "#c6e7ff", "#e8413a", "#ffcf5a", "#3a5fcf", "#5a2d1a"], ["#120f2e", "#19153b", "#ff5a45", "#ffe28a", "#5b7cff", "#2b1710"]],
  bowl: [["#ffe9d6", "#ffdcc0", "#7e5ad8", "#ffffff", "#f6d67a", "#3d8a4c"], ["#e3f4ff", "#d0ecff", "#d1423b", "#ffffff", "#f6d67a", "#3d8a4c"], ["#1a1c38", "#212446", "#3e6fd6", "#f4f4f4", "#f0c95a", "#3a8048"]],
  bell: [["#ffe2c8", "#ffd4b0", "#c98a2e", "#f3c968", "#7a4c14", "#fff4c2"], ["#d3edff", "#bee4ff", "#b07a2a", "#e8be5c", "#6b4210", "#fff4c2"], ["#151a36", "#1c2244", "#d49a3a", "#ffd977", "#7a5018", "#fff6cf"]],
  goat: [["#ffe0cc", "#ffd0b4", "#fff8ec", "#c9b79c", "#3b2a20", "#e8564a"], ["#9fd8ff", "#8ccdfa", "#fff8ec", "#b9a88f", "#3b2a20", "#e8564a"], ["#1a1d3a", "#212548", "#f2f0ea", "#c9bfb0", "#2a1d16", "#ff6a5a"]],
  mitten: [["#ffe4cc", "#ffd6b5", "#e0413a", "#ffffff", "#2f9e64", "#8f1f1f"], ["#d7efff", "#c2e6ff", "#2f6fdc", "#ffffff", "#f2b630", "#1c3f8a"], ["#191b38", "#202346", "#d94a8c", "#ffffff", "#5fd0a0", "#7a1f4c"]],
  aurora: [["#2b1d4e", "#34245e", "#7bf0b8", "#4cc3ff", "#ff8ad8", "#ffffff"], ["#122a4a", "#16335a", "#6ff2c0", "#5ab8ff", "#c78bff", "#ffffff"], ["#070b1e", "#0b1128", "#56f5b4", "#3fa9ff", "#b06bff", "#ffffff"]],
};

function inEllipse(u: number, v: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (u - cx) / rx;
  const dy = (v - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * Colour of the picture at (u, v) in [0,1)², with (px, py) the art-pixel coordinates
 * used for dithering. Pure, so the test and the canvas agree.
 */
export function motifColor(motif: MotifId, tone: 0 | 1 | 2, u: number, v: number, px: number, py: number): string {
  const [bg, bg2, a, b, c, d] = TONES[motif][tone];
  const back = (px + py) % 2 === 0 && (px * 7 + py * 3) % 5 === 0 ? bg2 : bg;
  const dx = u - 0.5;
  const dy = v - 0.5;
  const r = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  switch (motif) {
    case "snowflake": {
      const arm = Math.abs(Math.sin(ang * 3)) * r;
      if (r < 0.07) return a;
      if (r < 0.44 && arm < 0.06) return r > 0.3 ? b : a;
      const branch = Math.abs(Math.sin(ang * 3 + Math.PI / 6)) * r;
      if (r > 0.14 && r < 0.3 && branch < 0.05) return c;
      if (r > 0.44 && r < 0.47) return d;
      return back;
    }
    case "sunrise": {
      const horizon = 0.62;
      const ridge = horizon + 0.07 * Math.sin(u * 9) + 0.05 * Math.sin(u * 23 + 1);
      if (v > ridge) return v > 0.85 ? d : c;
      if (inEllipse(u, v, 0.5, horizon, 0.22, 0.22)) return r < 0.2 && v < horizon - 0.12 ? b : a;
      if (v > horizon - 0.25 && (py % 3 === 0) && Math.abs(u - 0.5) < 0.45) return b;
      return back;
    }
    case "pine": {
      if (v > 0.82 && Math.abs(dx) < 0.06) return d;
      for (let k = 0; k < 3; k++) {
        const top = 0.1 + k * 0.22;
        const bot = top + 0.32;
        if (v >= top && v <= bot) {
          const half = ((v - top) / (bot - top)) * (0.18 + k * 0.08);
          if (Math.abs(dx) <= half) return v < top + 0.06 || (v > bot - 0.04 && Math.abs(dx) > half - 0.08) ? c : (px + py) % 4 === 0 ? b : a;
        }
      }
      if (v > 0.9) return c;
      return back;
    }
    case "kite": {
      const inK = Math.abs(dx) < 0.34 && v > 0.12 && v < 0.84;
      if (!inK) return v > 0.84 && Math.abs(u - 0.5 - (v - 0.84)) < 0.02 ? d : back;
      if (inEllipse(u, v, 0.5, 0.48, 0.1, 0.1)) return back;
      if (v < 0.26) return u < 0.5 ? b : c;
      if (Math.abs(dx) > 0.3 || v > 0.8) return d;
      if (Math.abs(Math.abs(dx) - Math.abs(v - 0.48)) < 0.02) return d;
      return a;
    }
    case "lantern": {
      if (v < 0.14 && Math.abs(dx) < 0.02) return d;
      if (v >= 0.14 && v < 0.2 && Math.abs(dx) < 0.16) return d;
      if (v > 0.78 && v < 0.84 && Math.abs(dx) < 0.16) return d;
      if (v >= 0.84 && v < 0.94 && Math.abs(dx) < 0.06 && px % 2 === 0) return b;
      if (inEllipse(u, v, 0.5, 0.49, 0.3, 0.3)) {
        if (Math.abs(v - 0.49) < 0.05) return b;
        return v < 0.49 ? a : c;
      }
      if (r < 0.46 && (px + py) % 3 === 0) return b;
      return back;
    }
    case "bowl": {
      if (v > 0.5 && v < 0.82 && inEllipse(u, v, 0.5, 0.5, 0.42, 0.32)) return v > 0.76 ? d : a;
      if (v > 0.82 && v < 0.88 && Math.abs(dx) < 0.14) return a;
      if (v > 0.42 && v <= 0.52 && Math.abs(dx) < 0.4) {
        const slice = ((Math.floor(u * 7) + Math.floor(v * 20)) % 3);
        return slice === 0 ? c : slice === 1 ? b : (px % 3 === 0 ? d : b);
      }
      if (v < 0.4 && v > 0.12 && Math.abs(Math.sin(v * 18 + u * 6)) < 0.18 && Math.abs(dx - 0.05 * Math.sin(v * 10)) < 0.2) return b;
      return back;
    }
    case "bell": {
      if (v < 0.16 && v > 0.08 && Math.abs(dx) < 0.06) return c;
      if (v >= 0.16 && v < 0.78) {
        const half = 0.18 + (v - 0.16) * 0.38;
        if (Math.abs(dx) <= half) {
          if (Math.abs(v - 0.34) < 0.025 || Math.abs(v - 0.66) < 0.025) return c;
          return dx < -half * 0.4 ? b : (px + py) % 5 === 0 ? d : a;
        }
      }
      if (v >= 0.78 && v < 0.84 && Math.abs(dx) < 0.44) return c;
      if (v > 0.86 && r < 0.42 && Math.abs(dx) < 0.36 && py % 2 === 0) return d;
      return back;
    }
    case "goat": {
      // two curled horns, a long face, a beard, a red scarf for the fire-goat year
      const hornL = inEllipse(u, v, 0.32, 0.2, 0.12, 0.1) && !inEllipse(u, v, 0.33, 0.22, 0.06, 0.05);
      const hornR = inEllipse(u, v, 0.68, 0.2, 0.12, 0.1) && !inEllipse(u, v, 0.67, 0.22, 0.06, 0.05);
      if (hornL || hornR) return b;
      if (v > 0.26 && v < 0.3 && (Math.abs(dx) > 0.2 && Math.abs(dx) < 0.32)) return a;
      if (inEllipse(u, v, 0.5, 0.48, 0.225, 0.285) && !inEllipse(u, v, 0.5, 0.48, 0.2, 0.26)) return c;
      if (inEllipse(u, v, 0.5, 0.48, 0.2, 0.26)) {
        if (inEllipse(u, v, 0.42, 0.42, 0.03, 0.03) || inEllipse(u, v, 0.58, 0.42, 0.03, 0.03)) return c;
        if (v > 0.62 && Math.abs(dx) < 0.05) return c;
        return a;
      }
      if (v >= 0.72 && v < 0.82 && Math.abs(dx) < 0.3) return d;
      if (v >= 0.7 && v < 0.9 && Math.abs(dx) < 0.06) return b;
      return back;
    }
    case "mitten": {
      const palm = inEllipse(u, v, 0.52, 0.42, 0.22, 0.28);
      const thumb = inEllipse(u, v, 0.28, 0.5, 0.09, 0.14);
      const cuff = v > 0.68 && v < 0.86 && Math.abs(u - 0.52) < 0.22;
      if (cuff) return py % 2 === 0 ? b : c;
      if (palm || thumb) {
        if (Math.abs(v - 0.4) < 0.03 && Math.abs(u - 0.52) < 0.18) return b;
        if (inEllipse(u, v, 0.52, 0.28, 0.06, 0.05)) return c;
        return (px + py) % 6 === 0 ? d : a;
      }
      if (v > 0.9 && (px % 4 === 0)) return b;
      return back;
    }
    case "aurora": {
      const w1 = 0.3 + 0.1 * Math.sin(u * 7 + 0.5);
      const w2 = 0.45 + 0.08 * Math.sin(u * 5 + 2);
      if (v > 0.8) return v > 0.86 ? d : c === "#ffffff" ? b : bg2;
      if (Math.abs(v - w1) < 0.06 && py % 2 === (px % 3 === 0 ? 0 : 1)) return a;
      if (Math.abs(v - w1) < 0.04) return a;
      if (Math.abs(v - w2) < 0.04) return b;
      if (Math.abs(v - w2 - 0.08) < 0.02 && px % 2 === 0) return c;
      if ((px * 13 + py * 7) % 41 === 0 && v < 0.75) return d;
      return back;
    }
  }
  return back;
}

export const MOTIF_NAMES: Record<string, Record<MotifId, string>> = {
  ko: { snowflake: "눈송이", sunrise: "새해 첫 해", pine: "눈 덮인 소나무", kite: "방패연", lantern: "청사초롱", bowl: "떡국 한 그릇", bell: "제야의 종", goat: "2027 붉은 양", mitten: "털장갑", aurora: "오로라" },
  en: { snowflake: "Snowflake", sunrise: "First sunrise", pine: "Snowy pine", kite: "Shield kite", lantern: "Silk lantern", bowl: "Rice-cake soup", bell: "New Year bell", goat: "2027 red goat", mitten: "Mitten", aurora: "Aurora" },
  ja: { snowflake: "雪の結晶", sunrise: "初日の出", pine: "雪の松", kite: "四角だこ", lantern: "絹の灯籠", bowl: "トック（韓国のお雑煮）", bell: "除夜の鐘", goat: "2027 赤い羊", mitten: "毛糸の手袋", aurora: "オーロラ" },
  zh: { snowflake: "雪花", sunrise: "新年第一缕阳光", pine: "雪松", kite: "盾形风筝", lantern: "丝绸灯笼", bowl: "一碗年糕汤", bell: "除夕钟声", goat: "2027 红羊", mitten: "毛线手套", aurora: "极光" },
  fr: { snowflake: "Flocon", sunrise: "Premier soleil", pine: "Pin enneigé", kite: "Cerf-volant bouclier", lantern: "Lanterne de soie", bowl: "Soupe de gâteaux de riz", bell: "Cloche du Nouvel An", goat: "Chèvre rouge 2027", mitten: "Moufle", aurora: "Aurore" },
  es: { snowflake: "Copo de nieve", sunrise: "Primer amanecer", pine: "Pino nevado", kite: "Cometa escudo", lantern: "Farol de seda", bowl: "Sopa de pastel de arroz", bell: "Campana de Año Nuevo", goat: "Cabra roja 2027", mitten: "Manopla", aurora: "Aurora" },
};

// Generated by a seeded Hamiltonian-path search (see the test): the route is one valid answer;
// any route that passes every ice cell once and ends at the hut also wins.
export const LEVELS: readonly Level[] = [
  { motif: "snowflake", tone: 0, rows: ["#...","....",".P..","H...","...."], route: "LURURRDLDRDDLULDLU" },
  { motif: "sunrise", tone: 0, rows: ["....","P...","....",".#H.","...."], route: "URRRDLLDLDDRRRUULD" },
  { motif: "pine", tone: 0, rows: ["H#..","....","....","...P","...."], route: "DLUURUULDLDDDLUUUU" },
  { motif: "kite", tone: 0, rows: ["..#H","....","....","P...","...."], route: "DRUULUURDRDDDRUUUU" },
  { motif: "lantern", tone: 0, rows: ["...#","....","#..H","....","P..."], route: "URDRRULULULURRDRD" },
  { motif: "bowl", tone: 0, rows: ["..H..",".....","P....",".##..","....."], route: "DDRRRRULURUULDLDLULURR" },
  { motif: "bell", tone: 0, rows: [".....","...H.",".#..P",".....","..#.."], route: "DDLUULDLDLUUUURDRURRDL" },
  { motif: "goat", tone: 0, rows: [".....","...P.",".#H..",".....","....#"], route: "RULLDLULDDDDRURDRURULL" },
  { motif: "mitten", tone: 0, rows: [".....","..#..","..P..","...#.","..#H."], route: "DLDLUURULURRRRDLDRDDL" },
  { motif: "aurora", tone: 0, rows: [".....",".....","..#..","#..#.","P..H."], route: "RRULULUURDRURRDLDRDDL" },
  { motif: "snowflake", tone: 1, rows: [".....",".....","..H#P","....#","..#..","....."], route: "UULDLULLDRDLDRDLDRRRRULULU" },
  { motif: "sunrise", tone: 1, rows: [".....",".P...","#....","....#","...#H","....."], route: "LURRDRURDDLDLULDLDDRURDRRU" },
  { motif: "pine", tone: 1, rows: [".....","..#..","P....",".#H#.",".....","....#"], route: "DDDRURDRURUULURULLLLDRDRD" },
  { motif: "kite", tone: 1, rows: ["P#...",".....","..H..","#..#.",".....","....."], route: "DDRURURRDLDRDDDLULDLLURURU" },
  { motif: "lantern", tone: 1, rows: [".....","P....","..#.#",".....",".#...","..H.."], route: "URDRURRDLDDRDDLULULULDDDRR" },
  { motif: "bowl", tone: 1, rows: ["H#....","......","......","#....#","......",".....P"], route: "ULDLULDLLURURURDRURUULDLULDLDLUU" },
  { motif: "bell", tone: 1, rows: ["...#..","..P...","......",".#...#",".....#",".....H"], route: "ULLDRDLDDDRURDRUULURURURDDLDDDR" },
  { motif: "goat", tone: 1, rows: ["..P#H.","....#.","......","#..#.#","......","......"], route: "LLDDRURRDLDLDLDRRURDRRULUURUUL" },
  { motif: "mitten", tone: 1, rows: ["P.....","......","...H.#",".#..##","......","......"], route: "DDDDDRURDRRRULLULULUURDRURRDLDL" },
  { motif: "aurora", tone: 1, rows: ["......","......","..#..#",".#...H","..P#..","#....."], route: "URURURULLDLULLDRDLDDRDRRRRULUR" },
  { motif: "snowflake", tone: 2, rows: ["..#...","......",".H##..","......","#.....","..#...","....P#"], route: "LLLLURURURDDRRULURULURULLDLLULDDDRU" },
  { motif: "sunrise", tone: 2, rows: ["H#...#","......","......",".....#","..#...",".#..P.","...#.."], route: "DRUULUURULULLDRDLDRDDLDLLUURULURULU" },
  { motif: "pine", tone: 2, rows: ["..P...","..##..",".....#","......",".#....","...#..","#..H.."], route: "RRRDLDLLDLUUULDDDDDRDRUURURRDLDRDLL" },
  { motif: "kite", tone: 2, rows: ["......","H#..#.","......","...#..","#P.#..","......","......"], route: "RULLURRURDRDDDLLLLDRRRRRUUUUUULLLLLD" },
  { motif: "lantern", tone: 2, rows: ["......","..#...","#.#..#","......",".#....",".#....",".P..#H"], route: "LUUURUULURRRRRDLLDRDRDLLULDDDRURRD" },
  { motif: "bowl", tone: 2, rows: ["P.#....","#...#..","..#...#",".....#H",".....#.",".......","......."], route: "RDRRURRRDLDLLDRDLDLUULULDDRDLDRRRRURDRUUU" },
  { motif: "bell", tone: 2, rows: ["...#P..",".#.....",".....#H","....#..","....#..","...#...","......."], route: "RRDLLDLULULLDDRRDRDLDLUULDDDRRRRURDRUULURU" },
  { motif: "goat", tone: 2, rows: ["#......","#......","#..P.#.","...#...","..#....",".....H.","...#..."], route: "RDRRUUULDLULDLULDDRDLLDRDLDRRURURDDRRUULD" },
  { motif: "mitten", tone: 2, rows: ["#.H#...","..##...",".......",".......","..##...","....#..","....#.P"], route: "LURULLURRUUULLDRDLLDLULDDDRRDLLLUUUUURUR" },
  { motif: "aurora", tone: 2, rows: ["...#..P",".......","H..#..#","...#...","...#.#.",".#.....","......#"], route: "DLULDLLULLDRDRDLDRDRRUUURDRDDLDLLLLLUUUU" },
];

export const LEVEL_COUNT = LEVELS.length;
