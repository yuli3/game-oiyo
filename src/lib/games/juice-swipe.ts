/**
 * Juice Swipe (주스 스와이프) — an OIYO original swipe-to-slice game (2026-11-25).
 *
 * At a smoothie stand, fruit is tossed up into the air. Swipe through it to slice it into the blender; swipe through a
 * bee and you lose a heart. Slice enough fruit before the last toss falls.
 *
 * Pure and deterministic: every stage's tosses are seeded per stage. Field px, y pointing down.
 */

export const JUICE_SLUG = "juice-swipe";
export const STAGE_COUNT = 30;
export const GRAVITY = 600;
export const FRUIT_R = 22;
export const BEE_R = 16;
export const BLADE = 6; // the swipe's own half width
export const HEARTS = 3;
export const FRUITS = 6; // fruit pictures

export interface Toss { t: number; x: number; vx: number; vy: number; bee: boolean; kind: number }
export interface JuiceStage {
  stage: number;
  tosses: Toss[];
  need: number; // fruit to slice
  par: number; // fruit for three stars
}
export interface Flyer { toss: number; x: number; y: number; vx: number; vy: number; bee: boolean; kind: number; cut: boolean }
export interface Stand {
  stage: JuiceStage;
  t: number;
  next: number;
  flying: Flyer[];
  sliced: number;
  hearts: number;
  combo: number;
  over: boolean;
  won: boolean;
}

export const newStand = (stage: JuiceStage): Stand => ({ stage, t: 0, next: 0, flying: [], sliced: 0, hearts: HEARTS, combo: 0, over: false, won: false });

/** Distance from a point to a segment. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const k = l === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

export type SwipeEvent = { fruit: number; bees: number };

/** One stroke of the blade from (ax, ay) to (bx, by): slices fruit, stings on bees. */
export function swipe(s: Stand, ax: number, ay: number, bx: number, by: number): SwipeEvent {
  const ev = { fruit: 0, bees: 0 };
  if (s.over) return ev;
  for (const f of s.flying) {
    if (f.cut) continue;
    if (segDist(f.x, f.y, ax, ay, bx, by) < (f.bee ? BEE_R : FRUIT_R) + BLADE) {
      f.cut = true;
      if (f.bee) {
        ev.bees++;
        s.hearts--;
      } else {
        ev.fruit++;
        s.sliced++;
      }
    }
  }
  if (ev.fruit >= 2) s.combo++;
  if (s.hearts <= 0) s.over = true;
  return ev;
}

export function step(s: Stand, dt: number): void {
  if (s.over) return;
  s.t += dt;
  const st = s.stage;
  while (s.next < st.tosses.length && st.tosses[s.next].t <= s.t) {
    const k = st.tosses[s.next];
    s.flying.push({ toss: s.next, x: k.x, y: 580, vx: k.vx, vy: k.vy, bee: k.bee, kind: k.kind, cut: false });
    s.next++;
  }
  for (const f of s.flying) {
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
  }
  // gone below the counter (cut ones fall away too)
  s.flying = s.flying.filter((f) => !(f.vy > 0 && f.y > 600));
  if (s.next >= st.tosses.length && !s.flying.length) {
    s.over = true;
    s.won = s.sliced >= st.need;
  }
}

export function starsFor(s: Stand): number {
  if (!s.won) return 0;
  if (s.sliced >= s.stage.par && s.hearts === HEARTS) return 3;
  if (s.sliced >= Math.ceil((s.stage.need + s.stage.par) / 2)) return 2;
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

export interface SlicerOpts {
  /** seconds between swipes (a swipe aims at where things are react seconds after the player looks) */
  react?: number;
  /** how far (px) the swipe strays from where it was meant to go */
  wobble?: number;
  /** how far (px) the player keeps the blade from a bee */
  care?: number;
  seed?: number;
  mode?: "aim" | "random";
}

/** Where a flyer will be in dt seconds. */
const ahead = (f: Flyer, dt: number) => ({ x: f.x + f.vx * dt, y: f.y + f.vy * dt + (GRAVITY * dt * dt) / 2 });

/** The swipe a player would make now, looking dt ahead: through as many fruit as possible, clear of every bee. */
export function chooseSwipe(s: Stand, dt: number, care: number): [number, number, number, number] | null {
  const fruit = s.flying.filter((f) => !f.cut && !f.bee).map((f) => ahead(f, dt)).filter((p) => p.y < 560 && p.x > 0 && p.x < 360);
  const bees = s.flying.filter((f) => !f.cut && f.bee).map((f) => ahead(f, dt));
  if (!fruit.length) return null;
  let best: [number, number, number, number] | null = null;
  let bestN = 0;
  const tryLine = (ax: number, ay: number, bx: number, by: number) => {
    if (bees.some((b) => segDist(b.x, b.y, ax, ay, bx, by) < BEE_R + BLADE + care)) return;
    const n = fruit.filter((p) => segDist(p.x, p.y, ax, ay, bx, by) < FRUIT_R + BLADE - 4).length;
    if (n > bestN) {
      bestN = n;
      best = [ax, ay, bx, by];
    }
  };
  for (let i = 0; i < fruit.length; i++) {
    const a = fruit[i];
    // a short stroke across one fruit, in a few directions
    for (const ang of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) tryLine(a.x - Math.cos(ang) * 30, a.y - Math.sin(ang) * 30, a.x + Math.cos(ang) * 30, a.y + Math.sin(ang) * 30);
    for (let j = i + 1; j < fruit.length; j++) tryLine(a.x, a.y, fruit[j].x, fruit[j].y);
  }
  return best;
}

export function pilot(st: JuiceStage, opts: SlicerOpts = {}): Stand {
  const { react = 0.25, wobble = 6, care = 12, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 3571 + 101);
  const s = newStand(st);
  const dt = 1 / 60;
  let planned: { at: number; line: [number, number, number, number] } | null = null;
  let look = 0.3;
  while (!s.over) {
    if (mode === "random") {
      if (s.t >= look) {
        const ax = rng() * 360;
        const ay = 100 + rng() * 400;
        const a = rng() * Math.PI * 2;
        swipe(s, ax, ay, ax + Math.cos(a) * 120, ay + Math.sin(a) * 120);
        look = s.t + 0.15 + rng() * 0.35;
      }
    } else {
      if (!planned && s.t >= look) {
        const delay = react * (0.8 + rng() * 0.4);
        const line = chooseSwipe(s, delay, care);
        if (line) planned = { at: s.t + delay, line };
        else look = s.t + 0.05;
      }
      if (planned && s.t >= planned.at) {
        const j = () => (rng() * 2 - 1) * wobble;
        const [ax, ay, bx, by] = planned.line;
        swipe(s, ax + j(), ay + j(), bx + j(), by + j());
        planned = null;
        look = s.t + 0.05;
      }
    }
    step(s, dt);
  }
  return s;
}

function shape(stage: number) {
  return {
    tosses: 10 + stage, // 10 up to 39
    bees: stage < 2 ? 0 : Math.min(0.3, 0.08 + stage * 0.008), // share of tosses that are bees
    gap: Math.max(0.45, 1.3 - stage * 0.03), // seconds between tosses
    together: stage < 5 ? 0 : Math.min(0.5, 0.15 + stage * 0.012), // chance a toss comes with the one before
    share: stage < 5 ? 0.6 : stage < 15 ? 0.65 : 0.7, // fruit to slice, as a share of all fruit
  };
}

/** Human-like slicers: about a quarter second to read the air, swipes off by up to 6 px, a little room from bees. */
export const HUMAN_SLICERS: SlicerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.28, wobble: 7, care: 10, seed }));

export function buildStage(stage: number): JuiceStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(521000 + stage * 347 + attempt * 7919);
    const tosses: Toss[] = [];
    let t = 0.8;
    for (let k = 0; k < sh.tosses; k++) {
      if (k > 0 && rng() >= sh.together) t += sh.gap * (0.8 + rng() * 0.4);
      const x = 60 + rng() * 240;
      // up to a peak between 120 and 300 px from the top, drifting a little sideways
      const peak = 120 + rng() * 180;
      const vy = -Math.sqrt(2 * GRAVITY * (580 - peak));
      const vx = (180 - x) * 0.3 + (rng() * 2 - 1) * 40;
      tosses.push({ t: Math.round(t * 100) / 100, x: Math.round(x), vx: Math.round(vx), vy: Math.round(vy), bee: k > 0 && rng() < sh.bees, kind: Math.floor(rng() * FRUITS) });
    }
    const fruit = tosses.filter((k) => !k.bee).length;
    const st: JuiceStage = { stage, tosses, need: Math.ceil(fruit * sh.share), par: 0 };
    if (HUMAN_SLICERS.some((o) => !pilot(st, o).won)) continue;
    const careful = pilot(st, { react: 0.2, wobble: 2, care: 14 });
    if (!careful.won || careful.hearts < HEARTS) continue;
    st.par = Math.max(st.need, careful.sliced - 1);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`juice-swipe stage ${stage + 1}: no fair stand`);
}

export const JUICE_STAGES: JuiceStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
