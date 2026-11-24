/**
 * Charye Table (차례상 차리기) — set the Seollal ancestral table by the house's rules before the incense burns down.
 *
 * On Seollal morning many families set a table for the ancestral rite (차례). Old sayings describe where things
 * go — rice to the west and soup to the east (반서갱동), fish east and meat west (어동육서), fish heads to the
 * east (두동미서), dried fish on the left and sweet rice drink on the right (좌포우혜), and for the fruit
 * either jujube–chestnut–pear–persimmon from the west (조율이시) or red to the east and white to the west
 * (홍동백서). Houses differ — "every house has its own rites" (가가례) — so each stage says which rules this
 * house keeps. Drag each dish to a place in its row, tap a fish to turn it, and offer the table. Every wrong
 * offering burns incense time. East is the right side of the table as you face it.
 *
 * Pure and deterministic: tables are seeded per stage.
 */

export const CHARYE_SLUG = "charye-table";
export const STAGE_COUNT = 30;
export const ROWS = 4; // 0 rice & soup, 1 jeon (fish and meat), 2 po · namul · sikhye, 3 fruit
export const MAX_COLS = 6;

export type Kind = "rice" | "soup" | "meat" | "fish" | "po" | "namul" | "hye" | "jujube" | "chestnut" | "pear" | "persimmon" | "apple" | "hangwa";
export const ROW_OF: Record<Kind, number> = { rice: 0, soup: 0, meat: 1, fish: 1, po: 2, namul: 2, hye: 2, jujube: 3, chestnut: 3, pear: 3, persimmon: 3, apple: 3, hangwa: 3 };
export const RED: Kind[] = ["jujube", "apple"];
export const WHITE: Kind[] = ["chestnut", "pear"];
export const JOYUL: Kind[] = ["jujube", "chestnut", "pear", "persimmon"];

export type Rule = "banseo" | "eodong" | "dudong" | "jwapo" | "joyul" | "hongdong";
export const ALL_RULES: Rule[] = ["banseo", "eodong", "dudong", "jwapo", "joyul", "hongdong"];

export interface Dish { id: number; kind: Kind }
export interface CharyeStage {
  stage: number;
  dishes: Dish[];
  rules: Rule[];
  cols: number[]; // places in each row (exactly the dishes in that row)
  time: number; // s of incense
  par: number;
}

export interface Table {
  stage: CharyeStage;
  t: number;
  place: (number | null)[][]; // [row][col] = dish id
  east: boolean[]; // per dish: a fish's head points east
  offered: number;
  wrong: number;
  over: boolean;
  won: boolean;
}

export const PENALTY = 8; // s of incense burnt by a wrong offering

export function newTable(stage: CharyeStage): Table {
  return {
    stage,
    t: 0,
    place: stage.cols.map((n) => new Array(n).fill(null)),
    east: stage.dishes.map((_, i) => i % 2 === 0), // fish arrive facing either way
    offered: 0,
    wrong: 0,
    over: false,
    won: false,
  };
}

export const kindOf = (st: CharyeStage, id: number) => st.dishes[id].kind;

export function whereIs(tb: Table, id: number): { row: number; col: number } | null {
  for (let r = 0; r < tb.place.length; r++) {
    const c = tb.place[r].indexOf(id);
    if (c >= 0) return { row: r, col: c };
  }
  return null;
}

/** Puts a dish at a place in its own row; whatever was there swaps to where the dish came from (or off the table). */
export function put(tb: Table, id: number, row: number, col: number): boolean {
  if (tb.over || ROW_OF[kindOf(tb.stage, id)] !== row || col < 0 || col >= tb.place[row].length) return false;
  const from = whereIs(tb, id);
  const other = tb.place[row][col];
  if (from) tb.place[from.row][from.col] = other;
  tb.place[row][col] = id;
  return true;
}

export function turn(tb: Table, id: number): boolean {
  if (tb.over || kindOf(tb.stage, id) !== "fish") return false;
  tb.east[id] = !tb.east[id];
  return true;
}

/** Which of the house's rules the table breaks right now (and whether every dish is placed). */
export function broken(tb: Table): { rules: Rule[]; complete: boolean } {
  const st = tb.stage;
  const complete = tb.place.every((row) => row.every((v) => v !== null));
  const kinds = (row: number) => tb.place[row].map((id) => (id === null ? null : kindOf(st, id)));
  const pos = (row: number, test: (k: Kind) => boolean) => kinds(row).flatMap((k, c) => (k !== null && test(k) ? [c] : []));
  const out: Rule[] = [];
  for (const rule of st.rules) {
    let ok = true;
    if (rule === "banseo") ok = Math.max(-1, ...pos(0, (k) => k === "rice")) < Math.min(99, ...pos(0, (k) => k === "soup"));
    if (rule === "eodong") ok = Math.max(-1, ...pos(1, (k) => k === "meat")) < Math.min(99, ...pos(1, (k) => k === "fish"));
    if (rule === "dudong") ok = st.dishes.every((d) => d.kind !== "fish" || tb.east[d.id]);
    if (rule === "jwapo") {
      const row = kinds(2);
      const po = row.indexOf("po");
      const hye = row.indexOf("hye");
      ok = (po < 0 || po === 0) && (hye < 0 || hye === row.length - 1);
    }
    if (rule === "joyul") {
      const order = kinds(3).filter((k): k is Kind => k !== null && JOYUL.includes(k)).map((k) => JOYUL.indexOf(k));
      ok = order.every((v, i) => i === 0 || order[i - 1] <= v);
    }
    if (rule === "hongdong") ok = Math.max(-1, ...pos(3, (k) => WHITE.includes(k))) < Math.min(99, ...pos(3, (k) => RED.includes(k)));
    if (!ok) out.push(rule);
  }
  return { rules: out, complete };
}

export type OfferResult = { ok: true } | { ok: false; rules: Rule[]; complete: boolean } | null;

export function offer(tb: Table): OfferResult {
  if (tb.over) return null;
  const b = broken(tb);
  tb.offered++;
  if (b.complete && b.rules.length === 0) {
    tb.over = true;
    tb.won = true;
    return { ok: true };
  }
  tb.wrong++;
  tb.t += PENALTY;
  if (tb.t >= tb.stage.time) tb.over = true;
  return { ok: false, rules: b.rules, complete: b.complete };
}

export function stepTable(tb: Table, dt: number): boolean {
  if (tb.over) return false;
  tb.t += dt;
  if (tb.t >= tb.stage.time) {
    tb.t = tb.stage.time;
    tb.over = true;
    return true;
  }
  return false;
}

export function starsFor(tb: Table): number {
  if (!tb.won) return 0;
  if (tb.wrong === 0 && tb.t <= tb.stage.time * 0.6) return 3;
  if (tb.wrong <= 1) return 2;
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

/** One correct arrangement of a row under the given rules (ties keep a stable order). */
export function solveRow(st: CharyeStage, row: number, rules: Rule[], rng?: () => number): number[] {
  let ids = st.dishes.filter((d) => ROW_OF[d.kind] === row).map((d) => d.id);
  if (rng) ids = shuffle(ids, rng);
  const rank = (k: Kind): number => {
    if (row === 0 && rules.includes("banseo")) return k === "rice" ? 0 : 1;
    if (row === 1 && rules.includes("eodong")) return k === "meat" ? 0 : 1;
    if (row === 2 && rules.includes("jwapo")) return k === "po" ? 0 : k === "hye" ? 2 : 1;
    if (row === 3) {
      if (rules.includes("joyul") && JOYUL.includes(k)) return JOYUL.indexOf(k) * 2;
      if (rules.includes("hongdong")) return WHITE.includes(k) ? 0 : RED.includes(k) ? 6 : 3;
      if (rules.includes("joyul")) return 3;
    }
    return 0;
  };
  return ids.slice().sort((a, b) => rank(kindOf(st, a)) - rank(kindOf(st, b)));
}

export interface PilotOpts {
  /** s to pick up and set down one dish */
  move?: number;
  /** s to turn a fish */
  flip?: number;
  /** s to read the house's rules before starting */
  read?: number;
  /** chance each rule is overlooked on the first try (fixed after a wrong offering points it out) */
  forget?: number;
  seed?: number;
  /** "rules" follows the house's rules; "random" sets dishes anywhere in their rows and keeps offering */
  mode?: "rules" | "random";
}

export function pilot(stage: CharyeStage, opts: PilotOpts = {}): Table {
  const { move = 0.3, flip = 0.2, read = 0, forget = 0, seed = 1, mode = "rules" } = opts;
  const rng = mulberry(seed);
  const tb = newTable(stage);
  const wait = (s: number) => {
    stepTable(tb, s);
  };
  wait(read);
  let known = mode === "rules" ? stage.rules.filter(() => rng() >= forget) : [];
  for (let attempt = 0; attempt < 40 && !tb.over; attempt++) {
    for (let r = 0; r < ROWS && !tb.over; r++) {
      const want = mode === "random" ? shuffle(tb.stage.dishes.filter((d) => ROW_OF[d.kind] === r).map((d) => d.id), rng) : solveRow(stage, r, known);
      want.forEach((id, c) => {
        if (tb.over || tb.place[r][c] === id) return;
        put(tb, id, r, c);
        wait(move);
      });
    }
    for (const d of stage.dishes) {
      if (tb.over || d.kind !== "fish") continue;
      const wantEast = mode === "random" ? rng() < 0.5 : known.includes("dudong") ? true : tb.east[d.id];
      if (tb.east[d.id] !== wantEast) {
        turn(tb, d.id);
        wait(flip);
      }
    }
    if (tb.over) break;
    const res = offer(tb);
    if (!res || res.ok) break;
    // a wrong offering shows which rules were broken
    if (mode === "rules") known = Array.from(new Set([...known, ...res.rules]));
  }
  return tb;
}

function shape(stage: number) {
  return {
    rules: Math.min(6, 2 + Math.floor(stage / 5)),
    perRow: Math.min(MAX_COLS, 3 + Math.floor(stage / 7)),
  };
}

/** Human-like setters used to set the incense: about a second a dish, and they overlook a rule now and then. */
export const HUMAN_SETTERS: PilotOpts[] = [1, 2, 3, 4].map((seed) => ({ move: 1.1, flip: 0.6, read: 4, forget: 0.15, seed }));

export function buildStage(stage: number): CharyeStage {
  const sh = shape(stage);
  const rng = mulberry(91300 + stage * 67);
  // which rules this house keeps: the fruit row follows one of its two sayings
  const fruit: Rule = stage % 2 === 0 ? "joyul" : "hongdong";
  const pool: Rule[] = shuffle(["banseo", "eodong", "dudong", "jwapo"] as Rule[], rng);
  const rules: Rule[] = [fruit, ...pool.slice(0, sh.rules - 1)];
  const dishes: Dish[] = [];
  const add = (kind: Kind) => dishes.push({ id: dishes.length, kind });
  // row 0: rice and soup (one each per ancestor)
  const pairs = Math.max(1, Math.floor(sh.perRow / 2));
  for (let k = 0; k < pairs; k++) {
    add("rice");
    add("soup");
  }
  // row 1: meat and fish jeon
  for (let k = 0; k < sh.perRow; k++) add(k % 2 === 0 ? "fish" : "meat");
  // row 2: dried fish, greens, sikhye
  add("po");
  add("hye");
  for (let k = 2; k < sh.perRow; k++) add("namul");
  // row 3: fruit for this house's saying, plus sweets that may go anywhere
  const fruits: Kind[] = fruit === "joyul" ? ["jujube", "chestnut", "pear", "persimmon"] : ["apple", "jujube", "pear", "chestnut"];
  for (let k = 0; k < sh.perRow; k++) add(k < fruits.length ? fruits[k] : k === 4 ? "hangwa" : fruits[k % fruits.length]);
  const cols = [0, 1, 2, 3].map((r) => dishes.filter((d) => ROW_OF[d.kind] === r).length);
  const st: CharyeStage = { stage, dishes: shuffle(dishes, rng).map((d, i) => ({ id: i, kind: d.kind })), rules, cols, time: 999, par: 0 };
  st.par = Math.ceil(pilot(st).t);
  const human = HUMAN_SETTERS.map((o) => pilot(st, o).t).sort((a, b) => a - b);
  st.time = Math.ceil(human[human.length - 1] * 1.35 + 6);
  return st;
}

export const CHARYE_STAGES: CharyeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
