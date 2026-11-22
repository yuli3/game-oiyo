/**
 * 그림 로직 (Picture Logic) — an OIYO original nonogram set.
 * 30 hand-drawn pictures (8x8 → 10x10 → 12x12). Every picture is solvable by
 * line logic alone, so no guessing is ever needed (proved in tests).
 */

export const LOGIC_SLUG = "picture-logic";

export type Mark = 0 | 1 | 2; // 0 empty, 1 filled, 2 crossed
export type Lang = "ko" | "en" | "ja" | "zh" | "fr" | "es";

export interface Picture {
  id: string;
  rows: readonly string[];
  color: string;
  name: Record<Lang, string>;
}

export const PICTURES: readonly Picture[] = [
  { id: "heart", rows: [".##..##.", "########", "########", "########", ".######.", "..####..", "...##...", "........"], color: "#e64980", name: { ko: "하트", en: "Heart", ja: "ハート", zh: "爱心", fr: "Cœur", es: "Corazón" } },
  { id: "house", rows: ["...##...", "..####..", ".######.", "########", ".#....#.", ".#.##.#.", ".#.##.#.", ".######."], color: "#e8590c", name: { ko: "집", en: "House", ja: "おうち", zh: "房子", fr: "Maison", es: "Casa" } },
  { id: "fish", rows: ["........", "..####..", ".######.", "##.####.", "#######.", ".######.", "..####..", "........"], color: "#1c7ed6", name: { ko: "물고기", en: "Fish", ja: "さかな", zh: "小鱼", fr: "Poisson", es: "Pez" } },
  { id: "tree", rows: ["...##...", "..####..", ".######.", "..####..", ".######.", "########", "...##...", "..####.."], color: "#2b8a3e", name: { ko: "소나무", en: "Pine tree", ja: "松の木", zh: "松树", fr: "Pin", es: "Pino" } },
  { id: "cup", rows: ["..#..#..", ".#..#...", "..#..#..", "######..", "#....###", "#....#.#", ".####.##", "..##...."], color: "#9c6644", name: { ko: "찻잔", en: "Teacup", ja: "湯のみ", zh: "茶杯", fr: "Tasse de thé", es: "Taza de té" } },
  { id: "mushroom", rows: ["..####..", ".##..##.", "########", "#..##..#", "########", "..#..#..", "..#..#..", "..####.."], color: "#c92a2a", name: { ko: "버섯", en: "Mushroom", ja: "きのこ", zh: "蘑菇", fr: "Champignon", es: "Seta" } },
  { id: "cat", rows: ["#......#", "##....##", "########", "#.#..#.#", "########", "##.##.##", ".######.", "..####.."], color: "#495057", name: { ko: "고양이", en: "Cat", ja: "ねこ", zh: "猫咪", fr: "Chat", es: "Gato" } },
  { id: "umbrella", rows: ["...##...", ".######.", "########", "#.#..#.#", "...##...", "...##...", ".#.##...", "..##...."], color: "#7048e8", name: { ko: "우산", en: "Umbrella", ja: "かさ", zh: "雨伞", fr: "Parapluie", es: "Paraguas" } },
  { id: "key", rows: [".###....", "##.##...", "##.##...", ".###....", "..#.....", "..###...", "..#.....", "..##...."], color: "#f08c00", name: { ko: "열쇠", en: "Key", ja: "かぎ", zh: "钥匙", fr: "Clé", es: "Llave" } },
  { id: "ghost", rows: ["..####..", ".######.", "##.##.##", "##.##.##", "########", "########", "########", "#.##.##."], color: "#748ffc", name: { ko: "도깨비불 유령", en: "Little ghost", ja: "おばけ", zh: "小幽灵", fr: "Petit fantôme", es: "Fantasmita" } },
  { id: "persimmon", rows: ["....#.....", "..##.##...", ".#######..", "##########", "##########", "##########", "##########", ".########.", "..######..", "....##...."], color: "#fd7e14", name: { ko: "홍시", en: "Persimmon", ja: "柿", zh: "柿子", fr: "Kaki", es: "Caqui" } },
  { id: "duck", rows: ["...###....", "..#####...", "..##.###..", "..#######.", "...###....", ".#######..", "##########", "##########", ".########.", "..######.."], color: "#fab005", name: { ko: "오리", en: "Duck", ja: "アヒル", zh: "鸭子", fr: "Canard", es: "Pato" } },
  { id: "boat", rows: ["....#.....", "....##....", "....###...", "....####..", "....#####.", "....#.....", "##########", ".########.", "..######..", ".........."], color: "#1971c2", name: { ko: "돛단배", en: "Sailboat", ja: "帆船", zh: "帆船", fr: "Voilier", es: "Velero" } },
  { id: "snowman", rows: ["...####...", "...####...", "..######..", "...#..#...", "...####...", "..##..##..", ".##....##.", ".#..##..#.", ".##....##.", "..######.."], color: "#4dabf7", name: { ko: "눈사람", en: "Snowman", ja: "雪だるま", zh: "雪人", fr: "Bonhomme de neige", es: "Muñeco de nieve" } },
  { id: "teapot", rows: ["....##....", "..######..", ".########.", "##########", "##.####.#.", "##.####.#.", ".##.##.##.", "..######..", "...####...", ".........."], color: "#5c940d", name: { ko: "주전자", en: "Teapot", ja: "急須", zh: "茶壶", fr: "Théière", es: "Tetera" } },
  { id: "note", rows: ["...#######", "...#######", "...#.....#", "...#.....#", "...#.....#", "...#...###", ".###..####", "####..####", "####...##.", ".##......."], color: "#862e9c", name: { ko: "음표", en: "Music notes", ja: "音符", zh: "音符", fr: "Notes de musique", es: "Notas musicales" } },
  { id: "butterfly", rows: ["##......##", "###....###", "####..####", "#####.####", ".########.", "..######..", ".########.", "####..####", "###....###", ".#......#."], color: "#d6336c", name: { ko: "나비", en: "Butterfly", ja: "ちょうちょ", zh: "蝴蝶", fr: "Papillon", es: "Mariposa" } },
  { id: "moon", rows: ["...####...", ".####.....", ".###......", "###.......", "###.....#.", "###....###", "###.....#.", ".###......", ".#####..#.", "...#####.."], color: "#f59f00", name: { ko: "초승달과 별", en: "Moon and stars", ja: "三日月と星", zh: "弯月和星星", fr: "Lune et étoiles", es: "Luna y estrellas" } },
  { id: "kite", rows: ["##########", "#...##...#", "#...##...#", "#.######.#", "####..####", "#.######.#", "#...##...#", "##########", "....#.....", ".....##..."], color: "#0ca678", name: { ko: "방패연", en: "Shield kite", ja: "韓国の凧", zh: "韩国风筝", fr: "Cerf-volant coréen", es: "Cometa coreana" } },
  { id: "rocket", rows: ["....##....", "...####...", "...####...", "...#..#...", "...#..#...", "...####...", "..######..", ".########.", "##..##..##", "....##...."], color: "#e03131", name: { ko: "로켓", en: "Rocket", ja: "ロケット", zh: "火箭", fr: "Fusée", es: "Cohete" } },
  { id: "turtle", rows: ["............", "....####....", "...######...", "..##.##.##..", ".##########.", ".#.##..##.##", ".##########.", "..##.##.##..", "...######...", "..##....##..", "..#......#..", "............"], color: "#2f9e44", name: { ko: "거북이", en: "Turtle", ja: "かめ", zh: "乌龟", fr: "Tortue", es: "Tortuga" } },
  { id: "penguin", rows: ["....####....", "...######...", "..##.##.##..", "..########..", "..###..###..", ".###....###.", "##.#....#.##", "#..#....#..#", "...#....#...", "...##..##...", "....####....", "...##..##..."], color: "#343a40", name: { ko: "펭귄", en: "Penguin", ja: "ペンギン", zh: "企鹅", fr: "Manchot", es: "Pingüino" } },
  { id: "flowerpot", rows: ["...##..##...", "..########..", "...######...", "..##.##.##..", "...######...", ".....##.....", ".##..##..##.", "..##.##.##..", "...######...", ".##########.", "..########..", "...######..."], color: "#d9480f", name: { ko: "화분", en: "Flower pot", ja: "植木鉢", zh: "花盆", fr: "Pot de fleurs", es: "Maceta" } },
  { id: "car", rows: ["............", "....######..", "...##.#..#..", "..#...#...#.", ".##########.", "############", "############", "##.##..##.##", ".#..#..#..#.", "..##....##..", "............", "............"], color: "#1864ab", name: { ko: "자동차", en: "Car", ja: "くるま", zh: "汽车", fr: "Voiture", es: "Coche" } },
  { id: "owl", rows: [".#........#.", ".##......##.", ".##########.", "###..##..###", "##.#.##.#.##", "###..##..###", ".####..####.", ".##.####.##.", ".#.#.##.#.#.", ".##.#..#.##.", "..########..", "...#....#..."], color: "#8d6e63", name: { ko: "부엉이", en: "Owl", ja: "ふくろう", zh: "猫头鹰", fr: "Hibou", es: "Búho" } },
  { id: "whale", rows: ["..#.#.......", "...#........", "...#........", "..######....", ".########..#", "###.######.#", "############", "############", ".##########.", "..#######...", "....####....", "............"], color: "#1098ad", name: { ko: "고래", en: "Whale", ja: "くじら", zh: "鲸鱼", fr: "Baleine", es: "Ballena" } },
  { id: "crab", rows: ["##........##", "#.#......#.#", "##........##", ".#..#..#..#.", ".#.######.#.", "..########..", ".##########.", "############", ".##########.", "..########..", "##.#....#.##", "#..#....#..#"], color: "#f03e3e", name: { ko: "꽃게", en: "Crab", ja: "カニ", zh: "螃蟹", fr: "Crabe", es: "Cangrejo" } },
  { id: "castle", rows: ["#.#.#..#.#.#", "#####..#####", ".###....###.", ".###.##.###.", ".##########.", ".##########.", ".###.##.###.", ".##########.", ".####..####.", ".###....###.", ".###....###.", "############"], color: "#5f3dc4", name: { ko: "성", en: "Castle", ja: "お城", zh: "城堡", fr: "Château", es: "Castillo" } },
  { id: "lighthouse", rows: [".....##.....", "##..####....", "...#.##.#.##", "....####....", "....#..#....", "....####....", "....##.#....", "....####....", "...######...", "..##.#####..", ".##########.", "############"], color: "#c2255c", name: { ko: "등대", en: "Lighthouse", ja: "灯台", zh: "灯塔", fr: "Phare", es: "Faro" } },
  { id: "robot", rows: [".....##.....", "......#.....", "..########..", "..#..##..#..", "..########..", "..#.####.#..", "..########..", "....####....", ".##########.", ".#.######.#.", ".#.##..##.#.", "...##..##..."], color: "#495057", name: { ko: "로봇", en: "Robot", ja: "ロボット", zh: "机器人", fr: "Robot", es: "Robot" } },
];

export const PICTURE_COUNT = PICTURES.length;

export function solutionOf(p: Picture): boolean[][] {
  return p.rows.map((r) => [...r].map((ch) => ch === "#"));
}

export function lineClues(line: readonly boolean[]): number[] {
  const out: number[] = [];
  let n = 0;
  for (const v of line) {
    if (v) n += 1;
    else if (n) { out.push(n); n = 0; }
  }
  if (n) out.push(n);
  return out;
}

export function rowClues(p: Picture): number[][] {
  return solutionOf(p).map(lineClues);
}

export function colClues(p: Picture): number[][] {
  const s = solutionOf(p);
  return s[0].map((_, x) => lineClues(s.map((row) => row[x])));
}

export function emptyBoard(p: Picture): Mark[][] {
  return p.rows.map((r) => Array.from({ length: r.length }, () => 0 as Mark));
}

/** True when the filled cells match the picture exactly (crosses do not matter). */
export function isSolved(p: Picture, board: readonly (readonly Mark[])[]): boolean {
  return p.rows.every((r, y) => [...r].every((ch, x) => (ch === "#") === (board[y][x] === 1)));
}

/** Whether a row/column of the board already shows the clue exactly. */
export function lineDone(clue: readonly number[], marks: readonly Mark[]): boolean {
  const got = lineClues(marks.map((m) => m === 1));
  return got.length === clue.length && got.every((v, i) => v === clue[i]);
}

/** Paints a cell; the same mark again clears it. */
export function paint(board: readonly (readonly Mark[])[], x: number, y: number, mark: Mark): Mark[][] {
  return board.map((row, yy) => row.map((v, xx) => (xx === x && yy === y ? (v === mark ? 0 : mark) : v)) as Mark[]);
}

/** Sets a cell to a mark without toggling (used while dragging). */
export function setCell(board: readonly (readonly Mark[])[], x: number, y: number, mark: Mark): Mark[][] {
  if (board[y]?.[x] === undefined || board[y][x] === mark) return board as Mark[][];
  return board.map((row, yy) => (yy === y ? row.map((v, xx) => (xx === x ? mark : v)) : row.slice())) as Mark[][];
}

type Tri = boolean | null;

/** Classic line solver: returns the cells every arrangement agrees on, or null when none fits. */
export function solveLine(clue: readonly number[], cur: readonly Tri[]): Tri[] | null {
  const L = cur.length;
  const fits = (pos: number, v: boolean) => cur[pos] === null || cur[pos] === v;
  let agree: Tri[] | null = null;
  let any = false;
  const row: boolean[] = new Array(L).fill(false);
  const rec = (i: number, start: number): void => {
    if (i === clue.length) {
      for (let k = start; k < L; k++) if (!fits(k, false)) return;
      const full = row.map((v, k) => (k >= start ? false : v));
      if (!any) { agree = full.slice(); any = true; }
      else agree = agree!.map((v, k) => (v === full[k] ? v : null));
      return;
    }
    const rest = clue.slice(i + 1).reduce((a, b) => a + b + 1, 0);
    for (let s = start; s + clue[i] + rest <= L; s++) {
      let ok = true;
      for (let k = start; k < s && ok; k++) if (!fits(k, false)) ok = false;
      for (let k = s; k < s + clue[i] && ok; k++) if (!fits(k, true)) ok = false;
      if (ok && s + clue[i] < L && !fits(s + clue[i], false)) ok = false;
      if (!ok) { if (!fits(s, false)) break; continue; }
      for (let k = start; k < s; k++) row[k] = false;
      for (let k = s; k < s + clue[i]; k++) row[k] = true;
      if (s + clue[i] < L) row[s + clue[i]] = false;
      rec(i + 1, Math.min(L, s + clue[i] + 1));
      if (!fits(s, false)) break;
    }
  };
  rec(0, 0);
  return any ? agree : null;
}

/** Repeats line logic over rows and columns. Returns the deduced grid (null = still unknown). */
export function lineLogic(p: Picture, start?: Tri[][]): Tri[][] | null {
  const rc = rowClues(p);
  const cc = colClues(p);
  const H = p.rows.length;
  const W = p.rows[0].length;
  const b: Tri[][] = start ? start.map((r) => r.slice()) : Array.from({ length: H }, () => new Array<Tri>(W).fill(null));
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < H; y++) {
      const r = solveLine(rc[y], b[y]);
      if (!r) return null;
      for (let x = 0; x < W; x++) if (r[x] !== b[y][x]) { b[y][x] = r[x]; changed = true; }
    }
    for (let x = 0; x < W; x++) {
      const col = b.map((row) => row[x]);
      const r = solveLine(cc[x], col);
      if (!r) return null;
      for (let y = 0; y < H; y++) if (r[y] !== b[y][x]) { b[y][x] = r[y]; changed = true; }
    }
  }
  return b;
}

/**
 * A fair hint: first a wrong mark if there is one, otherwise a cell that line logic
 * proves from what is already correctly filled or crossed.
 */
export function hint(p: Picture, board: readonly (readonly Mark[])[]): { x: number; y: number; fill: boolean } | null {
  const sol = solutionOf(p);
  for (let y = 0; y < sol.length; y++) for (let x = 0; x < sol[y].length; x++) {
    if (board[y][x] === 1 && !sol[y][x]) return { x, y, fill: false };
    if (board[y][x] === 2 && sol[y][x]) return { x, y, fill: true };
  }
  const known: Tri[][] = board.map((row) => row.map((m) => (m === 1 ? true : m === 2 ? false : null)));
  const rc = rowClues(p);
  const cc = colClues(p);
  // one round of line logic from the current marks; pick the first new cell
  for (let y = 0; y < sol.length; y++) {
    const r = solveLine(rc[y], known[y]);
    if (r) for (let x = 0; x < r.length; x++) if (known[y][x] === null && r[x] === true) return { x, y, fill: true };
  }
  for (let x = 0; x < sol[0].length; x++) {
    const r = solveLine(cc[x], known.map((row) => row[x]));
    if (r) for (let y = 0; y < r.length; y++) if (known[y][x] === null && r[y]) return { x, y, fill: true };
  }
  for (let y = 0; y < sol.length; y++) for (let x = 0; x < sol[y].length; x++) if (sol[y][x] && board[y][x] !== 1) return { x, y, fill: true };
  return null;
}

export function starsFor(hints: number, mistakes: number): number {
  if (hints === 0 && mistakes === 0) return 3;
  if (hints + mistakes <= 3) return 2;
  return 1;
}
