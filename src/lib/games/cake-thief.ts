/**
 * Cake Thief (케이크 도둑) — an OIYO original logic-grid mystery (2026-11-25).
 *
 * Someone ate the birthday cake. Each suspect was in a different room holding a different thing, and a handful of
 * clues ("the rabbit wasn't in the attic", "whoever was in the garden had the ribbon") pin it all down. Mark the grid
 * — × for "no", ● for "yes" — until it's clear, then name the thief: the cream was on the thief's thing, so you need
 * who it was and where they were. Two wrong guesses and the thief gets away.
 *
 * Pure and deterministic: every case is seeded per stage and has exactly one answer that follows from its clues by
 * plain grid reasoning (no guessing).
 */

export const CAKE_SLUG = "cake-thief";
export const STAGE_COUNT = 30;
export const MAX_WRONG = 2;

export type ClueKind = "sr+" | "sr-" | "si+" | "si-" | "ri+" | "ri-";
/** A clue links two values: suspect–room, suspect–item or room–item; + is "together", − is "not together". */
export interface Clue { kind: ClueKind; a: number; b: number }
export interface CakeStage {
  stage: number;
  n: number; // suspects = rooms = items
  suspects: number[]; // indices into SUSPECTS
  rooms: number[]; // indices into ROOMS
  items: number[]; // indices into ITEMS
  room: number[]; // room[s] — the answer
  item: number[]; // item[s] — the answer
  thief: number; // suspect index
  clues: Clue[];
  par: number; // seconds a quick solver takes
}

export const SUSPECTS = ["cat", "dog", "rabbit", "fox", "owl", "bear"] as const;
export const ROOMS = ["kitchen", "garden", "attic", "porch", "library", "cellar"] as const;
export const ITEMS = ["spoon", "fork", "napkin", "ribbon", "candle", "plate"] as const;

/** Every room/item assignment that fits the clues (each suspect one room and one item, none shared). */
export function solutions(n: number, clues: Clue[], limit = 2): Array<{ room: number[]; item: number[] }> {
  const out: Array<{ room: number[]; item: number[] }> = [];
  const perms = permutations(n);
  for (const room of perms) {
    if (!clues.every((c) => (c.kind === "sr+" ? room[c.a] === c.b : c.kind === "sr-" ? room[c.a] !== c.b : true))) continue;
    for (const item of perms) {
      let ok = true;
      for (const c of clues) {
        if (c.kind === "si+" && item[c.a] !== c.b) ok = false;
        else if (c.kind === "si-" && item[c.a] === c.b) ok = false;
        else if (c.kind === "ri+" || c.kind === "ri-") {
          const s = room.indexOf(c.a);
          if ((c.kind === "ri+") !== (item[s] === c.b)) ok = false;
        }
        if (!ok) break;
      }
      if (ok) {
        out.push({ room: room.slice(), item: item.slice() });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

const permCache = new Map<number, number[][]>();
function permutations(n: number): number[][] {
  const hit = permCache.get(n);
  if (hit) return hit;
  const out: number[][] = [];
  const go = (cur: number[], left: number[]) => {
    if (!left.length) {
      out.push(cur);
      return;
    }
    left.forEach((x, i) => go([...cur, x], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  go([], Array.from({ length: n }, (_, i) => i));
  permCache.set(n, out);
  return out;
}

/**
 * Grid reasoning as a person does it on paper, on the three grids (suspect×room, suspect×item, room×item): a clue
 * marks a cell; a ● crosses out the rest of its row and column; a row or column with one cell left gets the ●; and a ●
 * or × carries across grids (if the cat was in the kitchen and had the spoon, the kitchen had the spoon). Returns the
 * number of passes needed to fill all three grids, or −1 if it gets stuck.
 */
export function reasoningPasses(n: number, clues: Clue[]): number {
  // grids: 0 unknown, 1 no, 2 yes
  const g = [0, 1, 2].map(() => Array.from({ length: n }, () => new Array(n).fill(0)));
  const SR = 0;
  const SI = 1;
  const RI = 2;
  const set = (k: number, a: number, b: number, v: number) => {
    if (g[k][a][b] === 0) {
      g[k][a][b] = v;
      return true;
    }
    return false;
  };
  for (const c of clues) {
    const k = c.kind[0] === "s" ? (c.kind[1] === "r" ? SR : SI) : RI;
    set(k, c.a, c.b, c.kind.endsWith("+") ? 2 : 1);
  }
  for (let pass = 1; pass <= 40; pass++) {
    let changed = false;
    for (let k = 0; k < 3; k++)
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++)
          if (g[k][a][b] === 2) {
            for (let x = 0; x < n; x++) {
              if (x !== b) changed = set(k, a, x, 1) || changed;
              if (x !== a) changed = set(k, x, b, 1) || changed;
            }
          }
    for (let k = 0; k < 3; k++)
      for (let a = 0; a < n; a++) {
        const row = g[k][a].map((v, b) => (v === 1 ? -1 : b)).filter((b) => b >= 0);
        if (row.length === 1) changed = set(k, a, row[0], 2) || changed;
        const col = g[k].map((r, x) => (r[a] === 1 ? -1 : x)).filter((x) => x >= 0);
        if (col.length === 1) changed = set(k, col[0], a, 2) || changed;
      }
    // across grids: s–r yes and s–i yes ⇒ r–i yes; s–r yes and s–i no ⇒ r–i no; and the other two ways round
    for (let s = 0; s < n; s++)
      for (let r = 0; r < n; r++)
        for (let i = 0; i < n; i++) {
          const sr = g[SR][s][r];
          const si = g[SI][s][i];
          const ri = g[RI][r][i];
          if (sr === 2 && si) changed = set(RI, r, i, si) || changed;
          if (sr === 2 && ri) changed = set(SI, s, i, ri) || changed;
          if (si === 2 && ri) changed = set(SR, s, r, ri) || changed;
          if (si === 2 && sr) changed = set(RI, r, i, sr) || changed;
          if (ri === 2 && sr) changed = set(SI, s, i, sr) || changed;
          if (ri === 2 && si) changed = set(SR, s, r, si) || changed;
        }
    if (g.every((m) => m.every((row) => row.every((v) => v)))) return pass;
    if (!changed) return -1;
  }
  return -1;
}

export interface Case {
  stage: CakeStage;
  marks: number[][][]; // the player's three grids: 0 blank, 1 ×, 2 ●
  wrong: number;
  t: number;
  over: boolean;
  won: boolean;
}

export const newCase = (stage: CakeStage): Case => ({ stage, marks: [0, 1, 2].map(() => Array.from({ length: stage.n }, () => new Array(stage.n).fill(0))), wrong: 0, t: 0, over: false, won: false });

/** Cycles a grid cell blank → × → ● → blank. */
export function mark(c: Case, grid: number, a: number, b: number): number {
  if (c.over) return -1;
  const v = (c.marks[grid][a][b] + 1) % 3;
  c.marks[grid][a][b] = v;
  return v;
}

export type AccuseResult = "caught" | "wrong" | null;

/** Names the thief: who it was and which room they were in. */
export function accuse(c: Case, suspect: number, room: number): AccuseResult {
  if (c.over) return null;
  const st = c.stage;
  if (suspect === st.thief && room === st.room[st.thief]) {
    c.over = true;
    c.won = true;
    return "caught";
  }
  c.wrong++;
  if (c.wrong >= MAX_WRONG) c.over = true;
  return "wrong";
}

export function tick(c: Case, dt: number): void {
  if (!c.over) c.t += dt;
}

export function starsFor(c: Case): number {
  if (!c.won) return 0;
  if (c.wrong === 0 && c.t <= c.stage.par) return 3;
  if (c.wrong === 0) return 2;
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

export interface SleuthOpts {
  /** seconds to read and use one clue */
  read?: number;
  /** chance of naming the wrong suspect or room */
  slip?: number;
  seed?: number;
  /** "reason" works the grid out; "random" guesses */
  mode?: "reason" | "random";
}

/** Seconds a person needs: reading each clue, plus a pass over the grid for each round of deduction. */
export const solveSeconds = (st: CakeStage, read: number) => 4 + st.clues.length * read + reasoningPasses(st.n, st.clues) * st.n * 1.2;

export function pilot(st: CakeStage, opts: SleuthOpts = {}): Case {
  const { read = 3, slip = 0.05, seed = 1, mode = "reason" } = opts;
  const rng = mulberry(seed * 4243 + 9);
  const c = newCase(st);
  if (mode === "random") {
    while (!c.over) {
      tick(c, 2);
      accuse(c, Math.floor(rng() * st.n), Math.floor(rng() * st.n));
    }
    return c;
  }
  tick(c, solveSeconds(st, read) * (0.85 + rng() * 0.3));
  while (!c.over) {
    if (rng() < slip) accuse(c, (st.thief + 1) % st.n, st.room[st.thief]);
    else accuse(c, st.thief, st.room[st.thief]);
    tick(c, 3);
  }
  return c;
}

function shape(stage: number) {
  return { n: stage < 8 ? 3 : stage < 20 ? 4 : 5 };
}

/** Human-like sleuths: three seconds a clue, a slip one time in twenty. */
export const HUMAN_SLEUTHS: SleuthOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ read: 3, slip: 0.05, seed }));

function layout(stage: number, attempt: number): CakeStage | null {
  const { n } = shape(stage);
  const rng = mulberry(321000 + stage * 211 + attempt * 7919);
  const suspects = shuffle(SUSPECTS.map((_, i) => i), rng).slice(0, n);
  const rooms = shuffle(ROOMS.map((_, i) => i), rng).slice(0, n);
  const items = shuffle(ITEMS.map((_, i) => i), rng).slice(0, n);
  const room = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const item = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const thief = Math.floor(rng() * n);
  // every true clue, the "not" kind more often (they make better puzzles), in a shuffled order
  const pool: Clue[] = [];
  for (let s = 0; s < n; s++)
    for (let x = 0; x < n; x++) {
      pool.push({ kind: room[s] === x ? "sr+" : "sr-", a: s, b: x });
      pool.push({ kind: item[s] === x ? "si+" : "si-", a: s, b: x });
    }
  for (let r = 0; r < n; r++)
    for (let x = 0; x < n; x++) {
      const s = room.indexOf(r);
      pool.push({ kind: item[s] === x ? "ri+" : "ri-", a: r, b: x });
    }
  const order = shuffle(pool, rng).filter((c) => c.kind.endsWith("-") || rng() < 0.35);
  const clues: Clue[] = [];
  for (const c of order) {
    clues.push(c);
    if (solutions(n, clues).length === 1 && reasoningPasses(n, clues) > 0) break;
  }
  if (solutions(n, clues).length !== 1 || reasoningPasses(n, clues) < 0) return null;
  // drop clues that aren't needed, last first, keeping it solvable by reasoning
  for (let i = clues.length - 1; i >= 0; i--) {
    const without = clues.filter((_, k) => k !== i);
    if (solutions(n, without).length === 1 && reasoningPasses(n, without) > 0) clues.splice(i, 1);
  }
  return { stage, n, suspects, rooms, items, room, item, thief, clues, par: 0 };
}

/** Builds cases until one has a single answer reachable by grid reasoning and human-like sleuths catch the thief. */
export function buildStage(stage: number): CakeStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    st.par = Math.ceil(solveSeconds(st, 4) * 1.3);
    if (HUMAN_SLEUTHS.filter((o) => pilot(st, o).won).length < 6) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`cake-thief stage ${stage + 1}: no fair case`);
}

export const CAKE_STAGES: CakeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));

// ---------------- Words: names and clue sentences in six languages ----------------
export type CakeLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

export const NAMES: Record<CakeLocale, { suspects: readonly string[]; rooms: readonly string[]; items: readonly string[] }> = {
  ko: { suspects: ["고양이", "강아지", "토끼", "여우", "부엉이", "곰"], rooms: ["부엌", "정원", "다락방", "현관", "서재", "지하실"], items: ["숟가락", "포크", "냅킨", "리본", "양초", "접시"] },
  en: { suspects: ["the cat", "the dog", "the rabbit", "the fox", "the owl", "the bear"], rooms: ["the kitchen", "the garden", "the attic", "the porch", "the library", "the cellar"], items: ["the spoon", "the fork", "the napkin", "the ribbon", "the candle", "the plate"] },
  ja: { suspects: ["ねこ", "いぬ", "うさぎ", "きつね", "ふくろう", "くま"], rooms: ["台所", "庭", "屋根裏", "玄関", "書斎", "地下室"], items: ["スプーン", "フォーク", "ナプキン", "リボン", "ろうそく", "お皿"] },
  zh: { suspects: ["小猫", "小狗", "兔子", "狐狸", "猫头鹰", "小熊"], rooms: ["厨房", "花园", "阁楼", "门廊", "书房", "地下室"], items: ["勺子", "叉子", "餐巾", "丝带", "蜡烛", "盘子"] },
  fr: { suspects: ["le chat", "le chien", "le lapin", "le renard", "la chouette", "l'ours"], rooms: ["la cuisine", "le jardin", "le grenier", "le porche", "la bibliothèque", "la cave"], items: ["la cuillère", "la fourchette", "la serviette", "le ruban", "la bougie", "l'assiette"] },
  es: { suspects: ["el gato", "el perro", "el conejo", "el zorro", "el búho", "el oso"], rooms: ["la cocina", "el jardín", "el desván", "el porche", "la biblioteca", "el sótano"], items: ["la cuchara", "el tenedor", "la servilleta", "la cinta", "la vela", "el plato"] },
};

/** Short labels for the grid headers (no articles). */
export function label(locale: CakeLocale, kind: "suspects" | "rooms" | "items", index: number): string {
  const w = NAMES[locale][kind][index];
  return w.replace(/^(the |le |la |l'|el )/, "");
}

/** "on the porch", "in" everywhere else. */
const enIn = (room: number) => (ROOMS[room] === "porch" ? "on" : "in");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Korean particle by whether the last syllable has a final consonant: 은/는, 을/를. */
function josa(word: string, withFinal: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : without);
}

export function clueText(st: CakeStage, c: Clue, locale: CakeLocale): string {
  const N = NAMES[locale];
  const pos = c.kind.endsWith("+");
  const S = (i: number) => N.suspects[st.suspects[i]];
  const R = (i: number) => N.rooms[st.rooms[i]];
  const I = (i: number) => N.items[st.items[i]];
  const k = c.kind.slice(0, 2);
  switch (locale) {
    case "ko":
      if (k === "sr") return `${josa(S(c.a), "은", "는")} ${R(c.b)}에 ${pos ? "있었어요" : "없었어요"}.`;
      if (k === "si") return `${josa(S(c.a), "은", "는")} ${josa(I(c.b), "을", "를")} ${pos ? "들고 있었어요" : "들고 있지 않았어요"}.`;
      return `${R(c.a)}에 있던 동물은 ${josa(I(c.b), "을", "를")} ${pos ? "들고 있었어요" : "들고 있지 않았어요"}.`;
    case "ja":
      if (k === "sr") return `${S(c.a)}は${R(c.b)}に${pos ? "いた" : "いなかった"}。`;
      if (k === "si") return `${S(c.a)}は${I(c.b)}を${pos ? "持っていた" : "持っていなかった"}。`;
      return `${R(c.a)}にいた動物は${I(c.b)}を${pos ? "持っていた" : "持っていなかった"}。`;
    case "zh":
      if (k === "sr") return `${S(c.a)}${pos ? "在" : "不在"}${R(c.b)}。`;
      if (k === "si") return `${S(c.a)}${pos ? "拿着" : "没拿"}${I(c.b)}。`;
      return `在${R(c.a)}的动物${pos ? "拿着" : "没拿"}${I(c.b)}。`;
    case "fr":
      if (k === "sr") return `${cap(S(c.a))} ${pos ? "était" : "n'était pas"} dans ${R(c.b)}.`;
      if (k === "si") return `${cap(S(c.a))} ${pos ? "avait" : "n'avait pas"} ${I(c.b)}.`;
      return `Celui qui était dans ${R(c.a)} ${pos ? "avait" : "n'avait pas"} ${I(c.b)}.`;
    case "es":
      if (k === "sr") return `${cap(S(c.a))} ${pos ? "estaba" : "no estaba"} en ${R(c.b)}.`;
      if (k === "si") return `${cap(S(c.a))} ${pos ? "tenía" : "no tenía"} ${I(c.b)}.`;
      return `Quien estaba en ${R(c.a)} ${pos ? "tenía" : "no tenía"} ${I(c.b)}.`;
    default:
      if (k === "sr") return `${cap(S(c.a))} ${pos ? "was" : "wasn't"} ${enIn(st.rooms[c.b])} ${R(c.b)}.`;
      if (k === "si") return `${cap(S(c.a))} ${pos ? "had" : "didn't have"} ${I(c.b)}.`;
      return `Whoever was ${enIn(st.rooms[c.a])} ${R(c.a)} ${pos ? "had" : "didn't have"} ${I(c.b)}.`;
  }
}

/** The cream clue that points at the thief: the thing they were holding. */
export function creamText(st: CakeStage, locale: CakeLocale): string {
  const it = NAMES[locale].items[st.items[st.item[st.thief]]];
  switch (locale) {
    case "ko":
      return `크림이 ${it}에 묻어 있었어요. ${josa(it, "을", "를")} 든 동물이 범인이에요!`;
    case "ja":
      return `クリームが${it}についていた。${it}を持っていた動物が犯人だ！`;
    case "zh":
      return `${it}上沾着奶油。拿着${it}的动物就是小偷！`;
    case "fr":
      return `Il y avait de la crème sur ${it} : celui qui l'avait est le voleur !`;
    case "es":
      return `Había nata en ${it}. ¡Quien tenía eso es el ladrón!`;
    default:
      return `There was cream on ${it}: whoever had it is the thief!`;
  }
}
