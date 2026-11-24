/**
 * Holiday Ticket (명절 기차표 예매) — book the family's seats home for Seollal before the train sells out.
 *
 * Every year, the moment holiday train tickets go on sale, the whole country is on the booking page at once
 * and seats vanish before your eyes. You are booking for the family. Each party needs its seats together:
 * a pair side by side on the same side of the aisle, three in one row, four across a whole row. Tap seats to
 * pick them and tap Book to buy them — but seats keep going while you pick, and a seat taken under you is
 * lost. Book every party before the train is sold out.
 *
 * Pure and deterministic: every carriage and the rush of other buyers are seeded per stage.
 */

export const TICKET_SLUG = "holiday-ticket";
export const STAGE_COUNT = 30;
export const SIDE = 2; // seats each side of the aisle (A B | C D)
export const PER_ROW = SIDE * 2;

export interface TicketStage {
  stage: number;
  rows: number;
  soldAt: number[]; // per seat: when another buyer takes it (0 = taken already, Infinity = never)
  parties: number[]; // seats needed by each party, in booking order
  time: number; // s until sold out
  par: number;
}

export const seatRow = (i: number) => Math.floor(i / PER_ROW);
export const seatCol = (i: number) => i % PER_ROW;
export const sideOf = (i: number) => (seatCol(i) < SIDE ? 0 : 1);

export interface Booking {
  stage: TicketStage;
  t: number;
  mine: Set<number>; // seats booked by us
  picked: number[];
  party: number;
  lost: number; // seats taken out from under our fingers
  wrong: number; // bookings refused
  over: boolean;
  won: boolean;
}

export const taken = (b: Booking, i: number) => b.mine.has(i) || b.stage.soldAt[i] <= b.t;

export function newBooking(stage: TicketStage): Booking {
  return { stage, t: 0, mine: new Set(), picked: [], party: 0, lost: 0, wrong: 0, over: false, won: false };
}

/** Whether these seats sit together the way a party of their size needs. */
export function together(seats: number[]): boolean {
  if (seats.length === 0) return false;
  const row = seatRow(seats[0]);
  if (!seats.every((s) => seatRow(s) === row)) return false;
  const cols = seats.map(seatCol).sort((a, b) => a - b);
  if (seats.length === 1) return true;
  if (seats.length === 2) return sideOf(seats[0]) === sideOf(seats[1]) && cols[1] - cols[0] === 1;
  return true; // three or four in one row
}

export type PickResult = "picked" | "unpicked" | "taken" | "full" | null;

export function pick(b: Booking, seat: number): PickResult {
  if (b.over || seat < 0 || seat >= b.stage.soldAt.length) return null;
  const k = b.picked.indexOf(seat);
  if (k >= 0) {
    b.picked.splice(k, 1);
    return "unpicked";
  }
  if (taken(b, seat)) return "taken";
  if (b.picked.length >= b.stage.parties[b.party]) return "full";
  b.picked.push(seat);
  return "picked";
}

export type BookResult = "booked" | "apart" | "short" | null;

export function book(b: Booking): BookResult {
  if (b.over) return null;
  const size = b.stage.parties[b.party];
  if (b.picked.length !== size) {
    b.wrong++;
    return "short";
  }
  if (!together(b.picked)) {
    b.wrong++;
    return "apart";
  }
  for (const s of b.picked) b.mine.add(s);
  b.picked = [];
  b.party++;
  if (b.party >= b.stage.parties.length) {
    b.over = true;
    b.won = true;
  }
  return "booked";
}

export interface BookingEvents { lost: number[]; end: boolean }

export function stepBooking(b: Booking, dt: number): BookingEvents {
  const ev: BookingEvents = { lost: [], end: false };
  if (b.over) return ev;
  b.t += dt;
  // seats bought by others while we were picking them drop out of our hands
  b.picked = b.picked.filter((s) => {
    if (b.stage.soldAt[s] <= b.t) {
      b.lost++;
      ev.lost.push(s);
      return false;
    }
    return true;
  });
  if (b.t >= b.stage.time) {
    b.over = true;
    ev.end = true;
  }
  return ev;
}

export function starsFor(b: Booking): number {
  if (!b.won) return 0;
  if (b.wrong === 0 && b.lost === 0 && b.t <= b.stage.par) return 3;
  if (b.wrong + b.lost <= 2) return 2;
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

/** Every block of free seats that would seat a party of this size right now, front rows first. */
export function blocks(b: Booking, size: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < b.stage.rows; r++) {
    const free = Array.from({ length: PER_ROW }, (_, c) => r * PER_ROW + c).filter((i) => !taken(b, i));
    if (size === 1) for (const i of free) out.push([i]);
    else if (size === 2) {
      for (let side = 0; side < 2; side++) {
        const a = r * PER_ROW + side * SIDE;
        if (free.includes(a) && free.includes(a + 1)) out.push([a, a + 1]);
      }
    } else if (free.length >= size) out.push(free.slice(0, size));
  }
  return out;
}

export interface BuyerOpts {
  /** s to look over the carriage before picking a block */
  scan?: number;
  /** s per tap */
  tap?: number;
  /** prefers blocks whose seats will stay free longest (true) or simply the first block seen (false) */
  wary?: boolean;
  seed?: number;
  /** "block" picks seats that sit together; "random" taps free seats anywhere and books */
  mode?: "block" | "random";
}

export function pilot(stage: TicketStage, opts: BuyerOpts = {}): Booking {
  const { scan = 0.05, tap = 0.05, wary = true, seed = 1, mode = "block" } = opts;
  const rng = mulberry(seed * 6007);
  const b = newBooking(stage);
  const dt = 1 / 60;
  let queue: Array<number | "book"> = [];
  // people are not metronomes: every look and tap takes a little more or less
  const jit = () => 0.75 + rng() * 0.5;
  let nextAt = scan * jit();
  while (!b.over) {
    if (b.t >= nextAt) {
      if (queue.length === 0) {
        // look the carriage over and choose a block for the next party
        const size = stage.parties[b.party];
        let choice: number[] | null = null;
        if (mode === "random") {
          const free = Array.from({ length: stage.soldAt.length }, (_, i) => i).filter((i) => !taken(b, i));
          choice = shuffle(free, rng).slice(0, size);
        } else {
          const options = blocks(b, size);
          if (options.length) {
            // a wary buyer can tell which seats are going fast (they flicker in the real rush); a hasty one takes the first
            const lasts = (xs: number[]) => Math.min(1e9, ...xs.map((i) => stage.soldAt[i]));
            choice = wary ? options.slice().sort((x, y) => lasts(y) - lasts(x))[0] : options[0];
          }
        }
        b.picked = [];
        if (choice && choice.length) queue = [...choice, "book"];
        nextAt = b.t + scan * jit();
      } else {
        const act = queue.shift()!;
        if (act === "book") {
          const before = b.party;
          book(b);
          if (b.party === before) b.picked = [];
          nextAt = b.t + (tap + (b.party === before ? scan : 0)) * jit();
        } else {
          if (pick(b, act) === "taken") {
            // lost it already: look again
            queue = [];
            b.picked = [];
          }
          nextAt = b.t + tap * jit();
        }
      }
    }
    const ev = stepBooking(b, dt);
    if (ev.lost.length) {
      queue = [];
      b.picked = [];
      nextAt = b.t + scan * jit();
    }
  }
  return b;
}

function shape(stage: number) {
  return {
    rows: 8 + Math.floor(stage / 5),
    parties: 3 + Math.floor(stage / 7),
    soldBefore: Math.min(0.4, 0.25 + stage * 0.005),
    time: Math.max(19, 26 - stage * 0.24),
    big: Math.min(0.42, 0.1 + stage * 0.012), // share of parties of three or four
  };
}

/** Human-like buyers used to check a carriage: a second or so to choose, a third of a second a tap. */
export const HUMAN_BUYERS: BuyerOpts[] = [1, 2, 3, 4, 5].map((seed) => ({ scan: 1.25, tap: 0.36, wary: false, seed }));

function layout(stage: number, attempt: number): TicketStage {
  const sh = shape(stage);
  const rng = mulberry(151900 + stage * 103 + attempt * 7919);
  const n = sh.rows * PER_ROW;
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const before = Math.floor(n * sh.soldBefore);
  const soldAt = new Array(n).fill(Infinity);
  // the rush: seats go one after another, faster and faster, until the train is nearly sold out
  const toSell = Math.floor(n * 0.97) - before;
  order.forEach((s, k) => {
    if (k < before) soldAt[s] = 0;
    else if (k - before < toSell) soldAt[s] = sh.time * Math.sqrt((k - before + rng()) / toSell);
  });
  const parties = Array.from({ length: sh.parties }, () => (rng() < sh.big ? (rng() < 0.3 ? 4 : 3) : rng() < 0.6 ? 2 : 1));
  return { stage, rows: sh.rows, soldAt, parties, time: sh.time, par: 0 };
}

/** Lays a carriage and its rush out until human-like buyers can book every party in time. */
export function buildStage(stage: number): TicketStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = layout(stage, attempt);
    const humans = HUMAN_BUYERS.map((o) => pilot(st, o));
    if (humans.filter((b) => b.won).length < 4 || !pilot(st).won) continue;
    if ([1, 2].some((seed) => pilot(st, { mode: "random", scan: 0.5, tap: 0.25, seed }).won)) continue;
    // par: what a quick, clean human-like booking takes
    st.par = Math.ceil(Math.min(...humans.filter((b) => b.won).map((b) => b.t)) * 10) / 10;
    return st;
  }
  throw new Error(`holiday-ticket stage ${stage + 1}: no fair carriage`);
}

export const TICKET_STAGES: TicketStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
