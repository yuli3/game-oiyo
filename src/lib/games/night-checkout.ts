/**
 * Night Checkout (편의점 야간 계산대) — an OIYO original shop-till game (2026-11-24).
 *
 * The night shift at a corner shop. Customers line up and put their things on the counter: scan every item (tap
 * it), and the till adds them up — buy-one-get-one-free deals included. Card payers just tap their card. Cash payers
 * hand over notes, and you count out their change from the drawer: 10,000, 5,000 and 1,000 won notes, 500 and 100
 * won coins. Later in the week the till's change screen breaks and you work the change out yourself. Wrong change
 * or a customer who gives up waiting is a complaint; three complaints and the manager takes over. Serve the queue.
 *
 * Pure and deterministic: every shift's customers, baskets and payments are seeded per stage.
 */

export const CHECKOUT_SLUG = "night-checkout";
export const STAGE_COUNT = 30;
export const MAX_COMPLAINTS = 3;
export const DENOMS = [10000, 5000, 1000, 500, 100];

export interface Item { price: number; kind: number; twoForOne: boolean }
export interface Customer { at: number; items: Item[]; paid: number; patience: number } // paid 0 = card
export interface CheckoutStage {
  stage: number;
  customers: Customer[];
  showChange: boolean; // whether the till shows the change due
  par: number;
}

/** What a basket comes to: a buy-one-get-one-free item is charged for every other one of its kind. */
export function totalOf(items: Item[]): number {
  let sum = 0;
  const seen = new Map<number, number>();
  for (const it of items) {
    if (it.twoForOne) {
      const n = (seen.get(it.kind) ?? 0) + 1;
      seen.set(it.kind, n);
      if (n % 2 === 0) continue;
    }
    sum += it.price;
  }
  return sum;
}

export const changeDue = (c: Customer) => (c.paid > 0 ? c.paid - totalOf(c.items) : 0);

export interface Shift {
  stage: CheckoutStage;
  t: number;
  served: number;
  complaints: number;
  current: number; // the customer at the till (−1 none yet)
  scanned: boolean[];
  given: number; // change counted out so far
  left: boolean[]; // customers who gave up
  done: boolean[];
  over: boolean;
  won: boolean;
}

export function newShift(stage: CheckoutStage): Shift {
  const n = stage.customers.length;
  return { stage, t: 0, served: 0, complaints: 0, current: -1, scanned: [], given: 0, left: new Array(n).fill(false), done: new Array(n).fill(false), over: false, won: false };
}

export const customer = (s: Shift) => (s.current >= 0 ? s.stage.customers[s.current] : null);
export const allScanned = (s: Shift) => s.scanned.length > 0 && s.scanned.every(Boolean);
export const waiting = (s: Shift) => s.stage.customers.map((_, i) => i).filter((i) => !s.done[i] && !s.left[i] && i !== s.current && s.stage.customers[i].at <= s.t);

function nextCustomer(s: Shift): void {
  const q = waiting(s);
  if (!q.length) {
    s.current = -1;
    s.scanned = [];
    return;
  }
  s.current = q[0];
  s.scanned = s.stage.customers[q[0]].items.map(() => false);
  s.given = 0;
}

function finish(s: Shift): void {
  if (s.done.every((d, i) => d || s.left[i])) {
    s.over = true;
    s.won = s.complaints < MAX_COMPLAINTS;
  }
}

function complain(s: Shift): void {
  s.complaints++;
  if (s.complaints >= MAX_COMPLAINTS) {
    s.over = true;
    s.won = false;
  }
}

export function scan(s: Shift, k: number): boolean {
  if (s.over || s.current < 0 || k < 0 || k >= s.scanned.length || s.scanned[k]) return false;
  s.scanned[k] = true;
  return true;
}

/** Counts a note or coin into the change. */
export function count(s: Shift, denom: number): boolean {
  if (s.over || s.current < 0 || !allScanned(s) || !DENOMS.includes(denom)) return false;
  s.given += denom;
  return true;
}

export function clearChange(s: Shift): void {
  s.given = 0;
}

export type PayResult = "thanks" | "wrong" | "not yet" | null;

/** Hands over the change (or, for a card, takes the card). Right change thanks you; wrong change is a complaint. */
export function pay(s: Shift): PayResult {
  const c = customer(s);
  if (s.over || !c) return null;
  if (!allScanned(s)) return "not yet";
  const right = c.paid === 0 ? true : s.given === changeDue(c);
  s.done[s.current] = true;
  if (right) s.served++;
  else complain(s);
  if (!s.over) {
    nextCustomer(s);
    finish(s);
  }
  return right ? "thanks" : "wrong";
}

export interface ShiftEvents { left: number[]; arrived: boolean }

export function stepShift(s: Shift, dt: number): ShiftEvents {
  const ev: ShiftEvents = { left: [], arrived: false };
  if (s.over) return ev;
  s.t += dt;
  // customers in the queue lose patience; the one at the till is being served and waits
  s.stage.customers.forEach((c, i) => {
    if (s.done[i] || s.left[i] || i === s.current || c.at > s.t) return;
    if (s.t - c.at > c.patience) {
      s.left[i] = true;
      ev.left.push(i);
      complain(s);
    }
  });
  if (!s.over && s.current < 0) {
    nextCustomer(s);
    ev.arrived = s.current >= 0;
  }
  if (!s.over) finish(s);
  return ev;
}

export function starsFor(s: Shift): number {
  if (!s.won) return 0;
  if (s.complaints === 0 && s.t <= s.stage.par) return 3;
  if (s.complaints <= 1) return 2;
  return 1;
}

/** The fewest notes and coins that make an amount. */
export function makeChange(amount: number): number[] {
  const out: number[] = [];
  let left = amount;
  for (const d of DENOMS)
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  return out;
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

export interface ClerkOpts {
  /** seconds per tap */
  tap?: number;
  /** seconds to work the change out when the till doesn't show it */
  think?: number;
  /** chance of miscounting change worked out by hand */
  slip?: number;
  seed?: number;
  /** "count" counts change properly; "guess" rounds change to the nearest thousand */
  mode?: "count" | "guess";
}

export function pilot(st: CheckoutStage, opts: ClerkOpts = {}): Shift {
  const { tap = 0.12, think = 0.3, slip = 0, seed = 1, mode = "count" } = opts;
  const rng = mulberry(seed * 6271 + 13);
  const s = newShift(st);
  const dt = 1 / 20;
  let busy = 0;
  let plan: Array<() => void> = [];
  let planFor = -2;
  const jit = () => 0.8 + rng() * 0.4;
  while (!s.over && s.t < 1000) {
    if (s.current !== planFor) {
      planFor = s.current;
      plan = [];
      const c = customer(s);
      if (c) {
        c.items.forEach((_, k) => plan.push(() => void scan(s, k)));
        if (c.paid > 0) {
          let due = changeDue(c);
          if (mode === "guess") due = Math.round(due / 1000) * 1000;
          else if (!st.showChange && rng() < slip) due += (rng() < 0.5 ? -1 : 1) * (rng() < 0.5 ? 100 : 1000);
          if (!st.showChange) busy += think * jit();
          for (const d of makeChange(Math.max(0, due))) plan.push(() => void count(s, d));
        }
        plan.push(() => void pay(s));
      }
    }
    if (s.t >= busy && plan.length) {
      plan.shift()!();
      busy = s.t + tap * jit();
    }
    stepShift(s, dt);
  }
  return s;
}

function shape(stage: number) {
  return {
    customers: 6 + Math.floor(stage * 0.5),
    items: 2 + Math.floor(stage / 8),
    gap: Math.max(6.4, 8 - stage * 0.06), // s between arrivals
    patience: Math.max(22, 30 - stage * 0.28),
    twoForOne: Math.min(0.35, stage * 0.015),
    showChange: stage < 10,
    card: Math.max(0.15, 0.4 - stage * 0.01),
  };
}

const PRICES = [800, 1200, 1500, 1800, 2300, 2700, 3200, 3900, 4500, 1000, 1100, 1700, 2500, 6800];

/** Human-like clerks used to check a shift: a third of a second a tap, a few seconds to work change out by hand. */
export const HUMAN_CLERKS: ClerkOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ tap: 0.35, think: 2.5, slip: 0.03, seed }));

function layout(stage: number, attempt: number): CheckoutStage {
  const sh = shape(stage);
  const rng = mulberry(281000 + stage * 181 + attempt * 7919);
  const customers: Customer[] = [];
  let at = 1;
  for (let k = 0; k < sh.customers; k++) {
    const n = sh.items + Math.floor(rng() * 3);
    const items: Item[] = [];
    for (let j = 0; j < n; j++) {
      const kind = Math.floor(rng() * PRICES.length);
      const deal = rng() < sh.twoForOne;
      items.push({ price: PRICES[kind], kind, twoForOne: deal });
      if (deal && rng() < 0.7) items.push({ price: PRICES[kind], kind, twoForOne: true });
    }
    const basket = shuffle(items, rng);
    const total = totalOf(basket);
    let paid = 0;
    if (rng() >= sh.card) {
      const choices = [Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000, 50000].filter((v) => v > total);
      paid = choices[Math.floor(rng() * choices.length)];
    }
    customers.push({ at, items: basket, paid, patience: sh.patience * (0.85 + rng() * 0.3) });
    at += sh.gap * (0.6 + rng() * 0.8);
  }
  return { stage, customers, showChange: sh.showChange, par: 0 };
}

/** Lays a shift out until human-like clerks get through it and guessing the change does not. */
export function buildStage(stage: number): CheckoutStage {
  for (let attempt = 0; attempt < 300; attempt++) {
    const st = layout(stage, attempt);
    if (HUMAN_CLERKS.filter((o) => pilot(st, o).won).length < 5) continue;
    if (pilot(st, { mode: "guess", tap: 0.35 }).won) continue;
    st.par = Math.ceil(pilot(st, { tap: 0.35, think: 2.5 }).t * 1.05);
    return st;
  }
  throw new Error(`night-checkout stage ${stage + 1}: no fair shift`);
}

export const CHECKOUT_STAGES: CheckoutStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
